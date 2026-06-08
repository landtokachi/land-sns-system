import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateSocialPosts } from '@/lib/ai/generate-post'
import type { Platform } from '@/types'

function extractText(html: string): string {
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  text = text.replace(/<[^>]+>/g, ' ')
  text = text.replace(/\s+/g, ' ').trim()
  return text.slice(0, 5000)
}

async function refetchSourceText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LANDBot/1.0)', 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'ja,en' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    return extractText(await res.text())
  } catch { return null }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { candidate_id, candidate } = body

    // 情報源URLを再取得して最新テキストで上書き
    let freshCandidate = { ...candidate }
    const sourceUrl = candidate.source_url || candidate.application_url
    if (sourceUrl) {
      const freshText = await refetchSourceText(sourceUrl)
      if (freshText && freshText.length > 200) freshCandidate = { ...freshCandidate, raw_text: freshText }
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
