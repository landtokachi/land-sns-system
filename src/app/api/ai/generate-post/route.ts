import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateSocialPosts } from '@/lib/ai/generate-post'
import type { Platform } from '@/types'

export const maxDuration = 60

function extractText(html: string): string {
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  text = text.replace(/<[^>]+>/g, ' ')
  text = text.replace(/\s+/g, ' ').trim()
  return text.slice(0, 5000)
}

async function fetchHtml(url: string, timeoutMs = 9000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LANDBot/1.0)', 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'ja,en' },
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) return null
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('html')) return null
    return await res.text()
  } catch { return null }
}

function extractAnchors(html: string): { href: string; text: string }[] {
  const out: { href: string; text: string }[] = []
  const re = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const href = m[1]
    const text = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    if (href) out.push({ href, text })
  }
  return out
}

function pickDetailLinks(html: string, baseUrl: string, max = 2): string[] {
  const KEYWORDS = ['公募', '募集要項', '募集', '要領', '詳細', 'お知らせ', '案内', '申請', '補助', '助成', '開催', 'セミナー', 'イベント', '説明会', '相談会']
  let base: URL
  try { base = new URL(baseUrl) } catch { return [] }
  const baseHost = base.hostname.replace(/^www\./, '')
  const titleMatch = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(/[|｜\-–—]/)[0].trim()
  const seen = new Set<string>([baseUrl.split('#')[0]])
  const scored: { url: string; score: number }[] = []
  for (const { href, text } of extractAnchors(html)) {
    let u: URL
    try { u = new URL(href, base) } catch { continue }
    const clean = u.origin + u.pathname + u.search
    if (seen.has(clean)) continue
    const host = u.hostname.replace(/^www\./, '')
    if (host !== baseHost) continue
    if (/\.(pdf|zip|docx?|xlsx?|pptx?|jpe?g|png|gif|svg)$/i.test(u.pathname)) continue
    if (/(index|about|facility|works|charge|recruit|request|privacy|sitemap|login|tp_list|fd_list|fd_search)\.php$/i.test(u.pathname)) continue
    const hay = text + ' ' + decodeURIComponent(u.pathname + u.search)
    let score = 0
    for (const k of KEYWORDS) if (hay.includes(k)) score += 1
    if (/(detail|tp_detail|article|news|topics|jirei|shien|hojo)/i.test(u.pathname)) score += 1
    if (text.length >= 10) score += 1
    if (titleMatch && titleMatch.length >= 4 && text.includes(titleMatch)) score += 5
    if (score < 2) continue
    seen.add(clean)
    scored.push({ url: clean, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, max).map((s) => s.url)
}

// 生成時の深掘り：元ページ＋関連詳細ページ（最大2件）を読んでまとめる
async function deepFetchText(url: string): Promise<string> {
  const html = await fetchHtml(url)
  if (!html) return ''
  const indexText = extractText(html)
  const detailUrls = pickDetailLinks(html, url, 2)
  const parts = await Promise.all(detailUrls.map(async (d) => {
    const dh = await fetchHtml(d, 7000)
    if (!dh) return ''
    const dt = extractText(dh)
    return dt && dt.length > 150 ? `\n\n----- 関連詳細ページ（${d}） -----\n${dt}` : ''
  }))
  const combined = parts.join('') + (indexText ? `\n\n----- 元ページ -----\n${indexText}` : '')
  return combined.trim().slice(0, 8000)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { candidate_id, candidate } = body

    // 生成用テキストを用意：
    //  - 保存済みの本文が十分に詳しい（600字以上）→ それをそのまま使う（追加取得なし）
    //  - 本文が薄い → 生成時に元URLを深掘り（ページ＋関連リンク先まで）して詳しく正確にする
    let freshCandidate = { ...candidate }
    const sourceUrl = candidate.source_url || candidate.application_url
    const stored = String(candidate.raw_text || '').trim()
    if (stored.length >= 600) {
      freshCandidate = { ...freshCandidate, raw_text: stored }
    } else if (sourceUrl) {
      const deep = await deepFetchText(sourceUrl)
      freshCandidate = { ...freshCandidate, raw_text: (deep && deep.length > stored.length) ? deep : (stored || deep) }
    } else if (stored) {
      freshCandidate = { ...freshCandidate, raw_text: stored }
    }
    const result = await generateSocialPosts(freshCandidate)

    if (candidate_id) {
      // Instagram + Facebook は同じ文章（Meta Business Suite経由で一括投稿するため）
      const platformTexts: Record<Platform, string> = {
        instagram: result.instagram_caption,
        facebook: result.instagram_caption, // FacebookもInstagramと同じ文章
        x: result.x_text,
      }

      const platforms: Platform[] = ['instagram', 'facebook', 'x']
      for (const platform of platforms) {
        const postText = platformTexts[platform]
        const { data: existing } = await supabase
          .from('social_posts')
          .select('id')
          .eq('post_candidate_id', candidate_id)
          .eq('platform', platform)
          .single()

        if (existing) {
          await supabase.from('social_posts').update({
            post_text: postText,
            hashtags: result.hashtags,
            story_text: result.story_text,
            image_title: result.image_title,
            image_subtitle: result.image_subtitle,
            status: 'draft',
          }).eq('id', existing.id)
        } else {
          await supabase.from('social_posts').insert({
            post_candidate_id: candidate_id,
            platform,
            post_text: postText,
            hashtags: result.hashtags,
            story_text: result.story_text,
            image_title: result.image_title,
            image_subtitle: result.image_subtitle,
            status: 'draft',
          })
        }
      }

      await supabase.from('post_candidates')
        .update({ status: 'drafting' }).eq('id', candidate_id)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Generate post error:', error)
    return NextResponse.json({ error: 'Failed to generate posts' }, { status: 500 })
  }
}
