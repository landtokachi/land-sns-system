import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateSocialPosts } from '@/lib/ai/generate-post'
import type { Platform } from '@/types'

// HTMLからテキストを抽出
function extractText(html: string): string {
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  text = text.replace(/<[^>]+>/g, ' ')
  text = text.replace(/\s+/g, ' ').trim()
  return text.slice(0, 5000) // 多めに取得
}

// 情報源URLを再取得して最新のテキストを得る
async function refetchSourceText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LANDBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ja,en',
      },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const html = await res.text()
    return extractText(html)
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { candidate_id, candidate } = body

    // 情報源URLを再取得して最新テキストを上書き
    let freshCandidate = { ...candidate }
    const sourceUrl = candidate.source_url || candidate.application_url
    if (sourceUrl) {
      console.log('[GeneratePost] Re-fetching source URL:', sourceUrl)
      const freshText = await refetchSourceText(sourceUrl)
      if (freshText && freshText.length > 200) {
        freshCandidate = {
          ...freshCandidate,
          raw_text: freshText, // 最新テキストで上書き
        }
        console.log('[GeneratePost] Fresh text fetched:', freshText.length, 'chars')
      }
    }

    const result = await generateSocialPosts(freshCandidate)

    if (candidate_id) {
      const platforms: Platform[] = ['instagram', 'facebook', 'x']
      for (const platform of platforms) {
        const postText =
          platform === 'instagram' ? result.instagram_caption
          : platform === 'facebook' ? result.facebook_text
          : result.x_text

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
