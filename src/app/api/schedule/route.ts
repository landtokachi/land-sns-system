import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: 指定月の投稿予定を取得
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const year = searchParams.get('year') || new Date().getFullYear().toString()
  const month = searchParams.get('month') || (new Date().getMonth() + 1).toString()

  const startDate = `${year}-${month.padStart(2, '0')}-01`
  const endDate = new Date(parseInt(year), parseInt(month), 0)
  const endDateStr = `${year}-${month.padStart(2, '0')}-${endDate.getDate().toString().padStart(2, '0')}`

  const { data, error } = await supabase
    .from('social_posts')
    .select('*, post_candidates(id, title, category, priority, status)')
    .not('scheduled_at', 'is', null)
    .gte('scheduled_at', startDate)
    .lte('scheduled_at', endDateStr + 'T23:59:59')
    .order('scheduled_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

// POST: 投稿予定を新規登録（候補からスケジュール設定）
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { post_candidate_id, platform, scheduled_at, post_text, hashtags } = body

    // social_postsに挿入（既存があればupsert）
    const { data, error } = await supabase
      .from('social_posts')
      .upsert({
        post_candidate_id,
        platform,
        scheduled_at,
        post_text: post_text || null,
        hashtags: hashtags || null,
        status: 'scheduled',
      }, { onConflict: 'post_candidate_id,platform' })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('Schedule post error:', error)
    return NextResponse.json({ error: 'Failed to schedule' }, { status: 500 })
  }
}

// PATCH: 予定日時の更新
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { id, scheduled_at, status } = body

    const updates: Record<string, string | null> = {}
    if (scheduled_at !== undefined) updates.scheduled_at = scheduled_at
    if (status !== undefined) updates.status = status

    const { data, error } = await supabase
      .from('social_posts')
      .update(updates)
      .eq('id', id)
      .select('*, post_candidates(id, title, category)')
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('Update schedule error:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
