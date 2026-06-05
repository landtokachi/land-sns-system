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
    .select('*')
    .eq('id', social_post_id)
    .single()

  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN // ページトークンで兼用可能

  if (!igUserId || !accessToken) {
    return NextResponse.json({ error: 'Instagram credentials not configured' }, { status: 500 })
  }

  // 投稿文（ハッシュタグ含む）
  const caption = [post.post_text, post.hashtags].filter(Boolean).join('\n\n')

  // PNG画像を取得
  const { data: images } = await adminSupabase
    .from('generated_images')
    .select('png_url')
    .eq('post_candidate_id', post.post_candidate_id)
    .order('created_at', { ascending: false })
    .limit(1)

  const pngUrl = images?.[0]?.png_url || null

  try {
    // Step1: メディアコンテナ作成
    const containerBody: Record<string, string> = {
      caption,
      access_token: accessToken,
    }

    if (pngUrl) {
      containerBody.image_url = pngUrl
      containerBody.media_type = 'IMAGE'
    } else {
      // 画像なしの場合はエラー（Instagramは画像必須）
      return NextResponse.json({ error: 'Instagram requires an image. Please generate an image first.' }, { status: 400 })
    }

    const containerRes = await fetch(`https://graph.facebook.com/v25.0/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(containerBody),
    })
    const containerData = await containerRes.json()

    if (!containerRes.ok || containerData.error) {
      console.error('Instagram container error:', containerData.error)
      return NextResponse.json({ error: containerData.error?.message || 'Failed to create Instagram media container' }, { status: 500 })
    }

    const creationId = containerData.id

    // Step2: 投稿を公開
    const publishRes = await fetch(`https://graph.facebook.com/v25.0/${igUserId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: accessToken,
      }),
    })
    const publishData = await publishRes.json()

    if (!publishRes.ok || publishData.error) {
      console.error('Instagram publish error:', publishData.error)
      return NextResponse.json({ error: publishData.error?.message || 'Failed to publish Instagram post' }, { status: 500 })
    }

    const postUrl = `https://www.instagram.com/p/${publishData.id}/`

    await supabase.from('social_posts').update({
      status: 'published',
      published_at: new Date().toISOString(),
      external_post_url: postUrl,
    }).eq('id', social_post_id)

    await supabase.from('post_candidates').update({ status: 'published' }).eq('id', post.post_candidate_id)

    return NextResponse.json({ success: true, post_id: publishData.id, url: postUrl })
  } catch (error) {
    console.error('Instagram post error:', error)
    return NextResponse.json({ error: 'Failed to post to Instagram' }, { status: 500 })
  }
}
