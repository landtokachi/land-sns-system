import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * SNS直接投稿API
 * 現在は「投稿済み」ステータスへの更新のみ対応。
 * 実際のSNS自動投稿はMeta/X APIの認証情報設定後に有効化される。
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { social_post_id, external_post_url } = await request.json()

    // social_postsのステータスを「投稿済み」に更新
    const { data: post, error } = await supabase
      .from('social_posts')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        external_post_url: external_post_url || null,
      })
      .eq('id', social_post_id)
      .select('*, post_candidates(id, title)')
      .single()

    if (error) throw error

    // post_candidatesのステータスも更新
    await supabase
      .from('post_candidates')
      .update({ status: 'published' })
      .eq('id', post.post_candidate_id)

    return NextResponse.json({ success: true, post })
  } catch (error) {
    console.error('Publish error:', error)
    return NextResponse.json({ error: 'Failed to publish' }, { status: 500 })
  }
}
