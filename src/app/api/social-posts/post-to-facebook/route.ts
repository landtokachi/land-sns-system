import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { social_post_id } = await request.json()

  const { data: post } = await supabase
    .from('social_posts')
    .select('*, post_candidates(title)')
    .eq('id', social_post_id)
    .single()

  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

  const pageId = process.env.FACEBOOK_PAGE_ID
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN

  if (!pageId || !accessToken) {
    return NextResponse.json({ error: 'Facebook credentials not configured' }, { status: 500 })
  }

  // 投稿文を組み立て
  const message = [post.post_text, post.hashtags].filter(Boolean).join('\n\n')

  try {
    const res = await fetch(`https://graph.facebook.com/v25.0/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        access_token: accessToken,
      }),
    })

    const data = await res.json()

    if (!res.ok || data.error) {
      console.error('Facebook API error:', data.error)
      return NextResponse.json({ error: data.error?.message || 'Facebook post failed' }, { status: 500 })
    }

    const postUrl = `https://www.facebook.com/${data.id.replace('_', '/posts/')}`

    // DBを更新
    await supabase.from('social_posts').update({
      status: 'published',
      published_at: new Date().toISOString(),
      external_post_url: postUrl,
    }).eq('id', social_post_id)

    await supabase.from('post_candidates').update({ status: 'published' }).eq('id', post.post_candidate_id)

    return NextResponse.json({ success: true, post_id: data.id, url: postUrl })
  } catch (error) {
    console.error('Facebook post error:', error)
    return NextResponse.json({ error: 'Failed to post to Facebook' }, { status: 500 })
  }
}
