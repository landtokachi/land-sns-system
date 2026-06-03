import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateSocialPosts } from '@/lib/ai/generate-post'
import type { Platform } from '@/types'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { candidate_id, candidate } = body

    const result = await generateSocialPosts(candidate)

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
          await supabase
            .from('social_posts')
            .update({
              post_text: postText,
              hashtags: result.hashtags,
              story_text: result.story_text,
              image_title: result.image_title,
              image_subtitle: result.image_subtitle,
              status: 'draft',
            })
            .eq('id', existing.id)
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

      await supabase
        .from('post_candidates')
        .update({ status: 'drafting' })
        .eq('id', candidate_id)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Generate post error:', error)
    return NextResponse.json({ error: 'Failed to generate posts' }, { status: 500 })
  }
}
