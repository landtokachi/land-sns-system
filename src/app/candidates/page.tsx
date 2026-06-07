import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/AppLayout'
import Link from 'next/link'
import { format, differenceInDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import { CANDIDATE_STATUS_LABELS, CATEGORIES } from '@/lib/constants'
import type { PostCandidate } from '@/types'

// 優先度設定
const PRIORITY = {
  high:   { label: '高',  color: '#dc2626', bg: '#fef2f2', border: '#fecaca', dot: '#ef4444', cls: 'priority-high' },
  medium: { label: '中',  color: '#d97706', bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b', cls: 'priority-medium' },
  low:    { label: '低',  color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe', dot: '#6366f1', cls: 'priority-low' },
}

// ステータス設定
const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  unconfirmed:    { label: '未確認',     color: '#64748b', bg: '#f1f5f9' },
  candidate:      { label: '投稿候補',   color: '#4f46e5', bg: '#eef2ff' },
  drafting:       { label: '下書き中',   color: '#7c3aed', bg: '#f5f3ff' },
  draft_created:  { label: '下書き済み', color: '#6d28d9', bg: '#ede9fe' },
  image_created:  { label: '画像生成済み', color: '#0369a1', bg: '#e0f2fe' },
  review_waiting: { label: '確認待ち',   color: '#b45309', bg: '#fffbeb' },
  ready:          { label: '準備完了',   color: '#065f46', bg: '#ecfdf5' },
  scheduled:      { label: '投稿予定',   color: '#0c4a6e', bg: '#f0f9ff' },
  published:      { label: '投稿済み',   color: '#064e3b', bg: '#d1fae5' },
  skipped:        { label: '見送り',     color: '#6b7280', bg: '#f9fafb' },
}

// 次のアクション
const NEXT_ACTION: Record<string, string> = {
  unconfirmed:    '→ 確認して投稿文を作成',
  candidate:      '→ AI投稿文を生成',
  drafting:       '→ 投稿文を完成させる',
  draft_created:  '→ 画像を生成する',
  image_created:  '→ 掲載確認を依頼',
  review_waiting: '⏳ 確認中...',
  ready:          '→ 投稿スケジュールを設定',
  scheduled:      '✓ 投稿予約済み',
  published:      '✓ 投稿完了',
  skipped:        '— 見送り',
}

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string; category?: string; q?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const now = new Date()

  let query = supabase
    .from('post_candidates').select('*')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })

  if (params.status) query = query.eq('status', params.status)
  if (params.priority) query = query.eq('priority', params.priority)
  if (params.category) query = query.eq('category', params.category)
  if (params.q) query = query.ilike('title', `%${params.q}%`)

  const { data: candidates } = await query
  const total = candidates?.length ?? 0
  const highCount = candidates?.filter(c => c.priority === 'high').length ?? 0
  const reviewCount = candidates?.filter(c => c.review_status === 'requesting').length ?? 0
  const isFiltered = !!(params.priority || params.status || params.q || params.category)

  return (
    <AppLayout title="投稿候補一覧">
      <div className="space-y-5 max-w-7xl mx-auto">

        {/* ── ヘッダー ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-slate-900">投稿候補一覧</h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-sm text-slate-500">{total}件</span>
              {highCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  高優先 {highCount}件
                </span>
              )}
              {reviewCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>
                  ⏳ 確認待ち {reviewCount}件
                </span>
              )}
            </div>
          </div>
          <Link href="/candidates/new"
            className="btn-glow inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            新規登録
          </Link>
        </div>

        {/* ── フィルター ── */}
        <form className="glass-card p-3 flex flex-wrap gap-2">
          <input name="q" defaultValue={params.q} placeholder="🔍 タイトルで検索"
            className="px-3 py-2 text-sm flex-1 min-w-[160px]"/>
          <select name="priority" defaultValue={params.priority} className="px-3 py-2 text-sm">
            <option value="">全優先度</option>
            <option value="high">🔴 高優先</option>
            <option value="medium">🟡 中優先</option>
            <option value="low">🔵 低優先</option>
          </select>
          <select name="status" defaultValue={params.status} className="px-3 py-2 text-sm">
            <option value="">全ステータス</option>
            {Object.entries(STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
          </select>
          <select name="category" defaultValue={params.category} className="px-3 py-2 text-sm hidden sm:block">
            <option value="">全カテゴリ</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="submit" className="btn-glow px-4 py-2 rounded-lg text-sm font-semibold">検索</button>
          <Link href="/candidates" className="px-3 py-2 text-sm text-slate-400 hover:text-slate-600 transition-colors">リセット</Link>
        </form>

        {/* ── カード一覧 ── */}
        {isFiltered ? (
          // フィルター時: フラットなカードグリッド
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(candidates as PostCandidate[])?.map(c => (
              <CandidateCard key={c.id} c={c} now={now} />
            ))}
            {!candidates?.length && (
              <div className="col-span-3 glass-card p-12 text-center text-slate-400 text-sm">
                該当する投稿候補がありません
              </div>
            )}
          </div>
        ) : (
          // 通常時: 優先度別グループ
          <div className="space-y-8">
            {(['high', 'medium', 'low'] as const).map(priority => {
              const group = (candidates as PostCandidate[] | null)?.filter(c => c.priority === priority) ?? []
              if (!group.length) return null
              const p = PRIORITY[priority]
              return (
                <div key={priority}>
                  {/* グループヘッダー */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.dot }} />
                      <h3 className="text-sm font-bold" style={{ color: p.color }}>
                        優先度「{p.label}」
                      </h3>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: p.bg, color: p.color, border: `1px solid ${p.border}` }}>
                        {group.length}件
                      </span>
                    </div>
                    <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, ${p.border}, transparent)` }} />
                  </div>

                  {/* カードグリッド */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {group.map(c => <CandidateCard key={c.id} c={c} now={now} />)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

// ── 投稿候補カードコンポーネント ────────────────────────────────────
function CandidateCard({ c, now }: { c: PostCandidate; now: Date }) {
  const p = PRIORITY[c.priority]
  const s = STATUS[c.status] || { label: c.status, color: '#64748b', bg: '#f1f5f9' }
  const deadlineDays = c.deadline ? differenceInDays(new Date(c.deadline), now) : null
  const isUrgent = deadlineDays !== null && deadlineDays <= 7
  const nextAction = NEXT_ACTION[c.status] || ''

  return (
    <Link href={`/candidates/${c.id}`}
      className={`glass-card block p-4 hover:shadow-md transition-all duration-150 hover:-translate-y-0.5 ${p.cls}`}>

      {/* 上段: ステータス + 締切 */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: s.bg, color: s.color }}>
          {s.label}
        </span>
        {deadlineDays !== null ? (
          <span className="text-xs font-bold flex items-center gap-1 flex-shrink-0"
            style={{ color: isUrgent ? '#dc2626' : '#64748b' }}>
            {isUrgent && <span>🔥</span>}
            {format(new Date(c.deadline!), 'M/d', { locale: ja })}
            {isUrgent && <span className="text-xs ml-0.5">({deadlineDays}日後)</span>}
          </span>
        ) : (
          <span className="text-xs font-bold px-1.5 py-0.5 rounded text-xs"
            style={{ background: p.bg, color: p.color }}>
            {p.label}優先
          </span>
        )}
      </div>

      {/* タイトル（メイン） */}
      <p className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug mb-2">
        {c.title}
      </p>

      {/* カテゴリ + 情報源 */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
        {c.category && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-medium">
            {c.category}
          </span>
        )}
        {c.source_name && (
          <span className="text-xs text-slate-400 truncate max-w-[120px]">{c.source_name}</span>
        )}
      </div>

      {/* 次のアクション */}
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{
          color: c.review_status === 'requesting' ? '#b45309'
               : c.status === 'published' ? '#065f46'
               : '#6366f1',
        }}>
          {c.review_status === 'requesting' ? '⏳ 掲載確認待ち' : nextAction}
        </span>
        {c.event_date && (
          <span className="text-xs text-slate-400">
            📅 {format(new Date(c.event_date), 'M/d', { locale: ja })}
          </span>
        )}
      </div>
    </Link>
  )
}
