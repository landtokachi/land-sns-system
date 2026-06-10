import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 同じタイトルの重複候補を整理（各タイトル1件だけ残す）
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 全候補を取得（新しい順）
  const { data: cands, error } = await admin
    .from('post_candidates')
    .select('id, title, raw_text, created_at')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const list = cands || []

  // 投稿予定（scheduled_at）を持つ候補を把握（予定済みは優先して残す）
  const { data: posts } = await admin.from('social_posts').select('post_candidate_id, scheduled_at')
  const scheduled = new Set<string>()
  for (const p of (posts || [])) {
    if (p.scheduled_at) scheduled.add(p.post_candidate_id as string)
  }

  // タイトル(trim)でグループ化
  const groups = new Map<string, typeof list>()
  for (const c of list) {
    const key = (c.title || '').trim()
    if (!key) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(c)
  }

  // 各グループで残す1件を決め、それ以外を削除対象に
  const idsToDelete: string[] = []
  for (const [, items] of groups) {
    if (items.length <= 1) continue
    const sorted = [...items].sort((a, b) => {
      const sa = scheduled.has(a.id) ? 1 : 0
      const sb = scheduled.has(b.id) ? 1 : 0
      if (sa !== sb) return sb - sa                         // 予定ありを優先
      const la = (a.raw_text || '').length, lb = (b.raw_text || '').length
      if (la !== lb) return lb - la                         // 本文が長い方を優先
      return (b.created_at || '').localeCompare(a.created_at || '') // 新しい方を優先
    })
    for (const c of sorted.slice(1)) idsToDelete.push(c.id)
  }

  let deleted = 0
  if (idsToDelete.length > 0) {
    // 子レコードを先に削除（外部キー対策）。存在しないテーブルはエラーを無視
    await admin.from('social_posts').delete().in('post_candidate_id', idsToDelete)
    await admin.from('generated_images').delete().in('post_candidate_id', idsToDelete).then(() => {}, () => {})
    const { data: del, error: delErr } = await admin
      .from('post_candidates')
      .delete()
      .in('id', idsToDelete)
      .select('id')
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })
    deleted = del?.length || 0
  }

  return NextResponse.json({ deleted, duplicate_titles: [...groups.values()].filter(g => g.length > 1).length })
}
