import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

  const message = [post.post_text, post.hashtags].filter(Boolean).join('\n\n')

  // 候補に紐づくPNG画像を取得（最新1件）
  const { data: images } = await adminSupabase
    .from('generated_images')
    .select('png_url, image_url')
    .eq('post_candidate_id', post.post_candidate_id)
    .order('created_at', { ascending: false })
    .limit(1)

  const pngUrl = images?.[0]?.png_url || null

  try {
    let resData: { id?: string; post_id?: string; error?: { message: string } }
    let res: Response

    if (pngUrl) {
      // 画像付き投稿: /photos エンドポイント
      res = await fetch(`https://graph.facebook.com/v25.0/${pageId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          url: pngUrl,
          access_token: accessToken,
        }),
      })
    } else {
      // テキストのみ投稿
      res = await fetch(`https://graph.facebook.com/v25.0/${pageId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          access_token: accessToken,
        }),
      })
    }

    resData = await res.json()

    if (!res.ok || resData.error) {
      console.error('Facebook API error:', resData.error)
      return NextResponse.json({ error: resData.error?.message || 'Facebook post failed' }, { status: 500 })
    }

    const postId = resData.post_id || resData.id || ''
    const postUrl = postId.includes('_')
      ? `https://www.facebook.com/${postId.replace('_', '/posts/')}`
      : `https://www.facebook.com/${pageId}`

    await supabase.from('social_posts').update({
      status: 'published',
      published_at: new Date().toISOString(),
      external_post_url: postUrl,
    }).eq('id', social_post_id)

    await supabase.from('post_candidates').update({ status: 'published' }).eq('id', post.post_candidate_id)

    return NextResponse.json({ success: true, post_id: postId, url: postUrl, with_image: !!pngUrl })
  } catch (error) {
    console.error('Facebook post error:', error)
    return NextResponse.json({ error: 'Failed to post to Facebook' }, { status: 500 })
  }
}
