import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/AppLayout'
import Link from 'next/link'
import { format, differenceInDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import { CATEGORIES } from '@/lib/constants'
import type { PostCandidate } from '@/types'

const PRIORITY_STYLE = {
  high:   { label: '高', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', dot: '#ef4444' },
  medium: { label: '中', color: '#d97706', bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b' },
  low:    { label: '低', color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe', dot: '#6366f1' },
}

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
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

const NEXT_ACTION: Record<string, { text: string; color: string }> = {
  unconfirmed:    { text: '→ 投稿文を作成する',   color: '#6366f1' },
  candidate:      { text: '→ AI投稿文を生成する', color: '#6366f1' },
  drafting:       { text: '→ 投稿文を完成させる', color: '#7c3aed' },
  draft_created:  { text: '→ 画像を生成する',     color: '#0369a1' },
  image_created:  { text: '→ 掲載確認を依頼する', color: '#065f46' },
  review_waiting: { text: '⏳ 確認依頼中',         color: '#b45309' },
  ready:          { text: '→ 投稿予定を設定する', color: '#065f46' },
  scheduled:      { text: '✓ 投稿予約済み',        color: '#0369a1' },
  published:      { text: '✓ 投稿完了',            color: '#064e3b' },
  skipped:        { text: '— 見送り',              color: '#9ca3af' },
}

const CATEGORY_ICON: Record<string, string> = {
  '補助金・助成金・支援制度': '💰',
  'イベント・セミナー': '📅',
  'LANDの取り組み': '🏢',
  'とかち財団の取り組み': '🌱',
  '事業者紹介': '👤',
  '採択者・卒業生・支援先のその後': '🎓',
  '学生起業支援': '🎒',
  '活動レポート': '📝',
  'お知らせ・募集': '📣',
  'コラム・ノウハウ': '💡',
}

// カンバン列定義
const KANBAN_COLUMNS = [
  {
    key: 'inbox',
    label: '📥 未確認',
    statuses: ['unconfirmed'],
    headerColor: '#64748b',
    headerBg: '#f1f5f9',
    borderColor: '#cbd5e1',
    collapseDefault: true,   // デフォルトで5件のみ表示
  },
  {
    key: 'working',
    label: '✍️ 作業中',
    statuses: ['candidate', 'drafting'],
    headerColor: '#7c3aed',
    headerBg: '#f5f3ff',
    borderColor: '#ddd6fe',
    collapseDefault: false,
  },
  {
    key: 'finishing',
    label: '🎨 仕上げ中',
    statuses: ['draft_created', 'image_created', 'review_waiting'],
    headerColor: '#0369a1',
    headerBg: '#e0f2fe',
    borderColor: '#bae6fd',
    collapseDefault: false,
  },
  {
    key: 'ready',
    label: '✅ 準備完了',
    statuses: ['ready', 'scheduled'],
    headerColor: '#065f46',
    headerBg: '#ecfdf5',
    borderColor: '#a7f3d0',
    collapseDefault: false,
  },
]

type ViewType = 'category' | 'priority' | 'kanban'

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string; category?: string; q?: string; view?: string }>
}) {
  const params = await searchParams
  const view = (params.view || 'category') as ViewType
  const supabase = await createClient()
  const now = new Date()

  let query = supabase.from('post_candidates').select('*')
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

  // カテゴリー別グループ
  const groupedByCategory = CATEGORIES.reduce<Record<string, PostCandidate[]>>((acc, cat) => {
    const items = (candidates as PostCandidate[] | null)?.filter(c => c.category === cat) ?? []
    if (items.length > 0) acc[cat] = items
    return acc
  }, {})
  const uncategorized = (candidates as PostCandidate[] | null)?.filter(c => !c.category) ?? []
  if (uncategorized.length > 0) groupedByCategory['未分類'] = uncategorized

  // 優先度別グループ
  const groupedByPriority = (['high', 'medium', 'low'] as const).reduce<Record<string, PostCandidate[]>>((acc, p) => {
    const items = (candidates as PostCandidate[] | null)?.filter(c => c.priority === p) ?? []
    if (items.length > 0) acc[p] = items
    return acc
  }, {})

  // カンバン別グループ
  const kanbanGroups = KANBAN_COLUMNS.map(col => ({
    ...col,
    items: (candidates as PostCandidate[] | null)?.filter(c => col.statuses.includes(c.status)) ?? [],
  }))

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
                  🔴 高優先 {highCount}件
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

        {/* ── ビュー切り替え ── */}
        <div className="flex flex-wrap gap-3 items-start">
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
            {[
              { key: 'category', label: '📂 カテゴリー別' },
              { key: 'priority', label: '🎯 優先度別' },
              { key: 'kanban',   label: '🗂️ カンバン' },
            ].map(v => (
              <Link key={v.key}
                href={`/candidates?${new URLSearchParams({ ...params, view: v.key }).toString()}`}
                className="px-3 py-2 text-xs font-medium transition-colors"
                style={view === v.key
                  ? { background: '#4f46e5', color: '#fff' }
                  : { background: '#fff', color: '#64748b' }}>
                {v.label}
              </Link>
            ))}
          </div>
        </div>

        {/* ── フィルター（カンバン以外） ── */}
        {view !== 'kanban' && (
          <form className="glass-card p-3 flex flex-wrap gap-2">
            <input name="q" defaultValue={params.q} placeholder="🔍 タイトルで検索"
              className="px-3 py-2 text-sm flex-1 min-w-[160px]"/>
            <input type="hidden" name="view" value={view}/>
            <select name="priority" defaultValue={params.priority} className="px-3 py-2 text-sm">
              <option value="">全優先度</option>
              <option value="high">🔴 高</option>
              <option value="medium">🟡 中</option>
              <option value="low">🔵 低</option>
            </select>
            <select name="status" defaultValue={params.status} className="px-3 py-2 text-sm">
              <option value="">全ステータス</option>
              {Object.entries(STATUS_STYLE).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
            </select>
            <select name="category" defaultValue={params.category} className="px-3 py-2 text-sm hidden sm:block">
              <option value="">全カテゴリ</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button type="submit" className="btn-glow px-4 py-2 rounded-lg text-sm font-semibold">絞り込む</button>
            <Link href={`/candidates?view=${view}`} className="px-3 py-2 text-sm text-slate-400 hover:text-slate-600">リセット</Link>
          </form>
        )}

        {/* ══ カンバンビュー ══ */}
        {view === 'kanban' && (
          <div>
            <p className="text-xs text-slate-400 mb-3">
              ステータス別に整理されています。各カードをクリックして詳細・編集できます。
            </p>
            <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
              {kanbanGroups.map(col => {
                const visibleItems = col.collapseDefault ? col.items.slice(0, 6) : col.items
                const hiddenCount = col.items.length - visibleItems.length
                return (
                  <div key={col.key} className="flex-shrink-0 w-72 flex flex-col">
                    {/* 列ヘッダー */}
                    <div className="flex items-center justify-between px-3 py-2 rounded-t-lg mb-0"
                      style={{ background: col.headerBg, borderBottom: `2px solid ${col.borderColor}` }}>
                      <span className="text-xs font-bold" style={{ color: col.headerColor }}>
                        {col.label}
                      </span>
                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ background: col.borderColor, color: col.headerColor }}>
                        {col.items.length}
                      </span>
                    </div>
                    {/* カード一覧 */}
                    <div className="flex-1 rounded-b-lg p-2 space-y-2"
                      style={{ background: '#f8fafc', border: `1px solid ${col.borderColor}`, borderTop: 'none' }}>
                      {col.items.length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-8">なし</p>
                      )}
                      {visibleItems.map(c => (
                        <KanbanCard key={c.id} c={c} now={now} />
                      ))}
                      {hiddenCount > 0 && (
                        <Link
                          href={`/candidates?status=${col.statuses[0]}&view=kanban`}
                          className="block text-center text-xs py-2 rounded-lg transition-colors"
                          style={{ color: col.headerColor, background: col.headerBg }}>
                          他 {hiddenCount}件を見る →
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── カテゴリー別表示 ── */}
        {(!isFiltered && view === 'category') && (
          <div className="space-y-8">
            {Object.entries(groupedByCategory).map(([cat, items]) => {
              const icon = CATEGORY_ICON[cat] || '📌'
              const highInCat = items.filter(c => c.priority === 'high').length
              return (
                <div key={cat}>
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="text-lg">{icon}</span>
                    <h3 className="text-sm font-bold text-slate-800">{cat}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                      {items.length}件
                    </span>
                    {highInCat > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                        🔴 高優先 {highInCat}件
                      </span>
                    )}
                    <div className="flex-1 h-px bg-slate-100" />
                    <Link href={`/candidates?category=${encodeURIComponent(cat)}&view=${view}`}
                      className="text-xs text-indigo-500 hover:underline flex-shrink-0">
                      すべて見る →
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {items.map(c => <CandidateCard key={c.id} c={c} now={now} />)}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── 優先度別表示 ── */}
        {(!isFiltered && view === 'priority') && (
          <div className="space-y-8">
            {Object.entries(groupedByPriority).map(([priority, items]) => {
              const p = PRIORITY_STYLE[priority as keyof typeof PRIORITY_STYLE]
              return (
                <div key={priority}>
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.dot }} />
                    <h3 className="text-sm font-bold" style={{ color: p.color }}>
                      優先度「{p.label}」
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: p.bg, color: p.color, border: `1px solid ${p.border}` }}>
                      {items.length}件
                    </span>
                    <div className="flex-1 h-px" style={{ background: p.border }} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {items.map(c => <CandidateCard key={c.id} c={c} now={now} />)}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── フィルター時: フラットグリッド ── */}
        {isFiltered && view !== 'kanban' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(candidates as PostCandidate[])?.map(c => <CandidateCard key={c.id} c={c} now={now} />)}
            {!candidates?.length && (
              <div className="col-span-3 glass-card p-12 text-center text-slate-400 text-sm">
                該当する投稿候補がありません
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

// ── カンバン用コンパクトカード ──
function KanbanCard({ c, now }: { c: PostCandidate; now: Date }) {
  const p = PRIORITY_STYLE[c.priority]
  const deadlineDays = c.deadline ? differenceInDays(new Date(c.deadline), now) : null
  const isUrgent = deadlineDays !== null && deadlineDays <= 7

  return (
    <Link href={`/candidates/${c.id}`}
      className="block p-3 rounded-lg bg-white hover:shadow-md transition-all duration-150 hover:-translate-y-0.5"
      style={{ border: `1px solid ${isUrgent ? '#fca5a5' : '#e2e8f0'}`, borderLeft: `3px solid ${p.dot}` }}>
      {/* 優先度 + 締切 */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span className="text-xs px-1.5 py-0.5 rounded font-bold"
          style={{ background: p.bg, color: p.color }}>
          {p.label}
        </span>
        {deadlineDays !== null && (
          <span className="text-xs font-bold" style={{ color: isUrgent ? '#dc2626' : '#94a3b8' }}>
            {isUrgent ? '🔥' : '📅'} {format(new Date(c.deadline!), 'M/d', { locale: ja })}
          </span>
        )}
      </div>
      {/* タイトル */}
      <p className="text-xs font-semibold text-slate-800 leading-snug line-clamp-2 mb-1.5">
        {c.title}
      </p>
      {/* カテゴリ */}
      {c.category && (
        <p className="text-xs text-slate-400 truncate">
          {CATEGORY_ICON[c.category] || '📌'} {c.category}
        </p>
      )}
    </Link>
  )
}

// ── 通常カード ──
function CandidateCard({ c, now }: { c: PostCandidate; now: Date }) {
  const p = PRIORITY_STYLE[c.priority]
  const s = STATUS_STYLE[c.status] || { label: c.status, color: '#64748b', bg: '#f1f5f9' }
  const na = NEXT_ACTION[c.status] || { text: '', color: '#6366f1' }
  const deadlineDays = c.deadline ? differenceInDays(new Date(c.deadline), now) : null
  const isUrgent = deadlineDays !== null && deadlineDays <= 7

  const borderColor = c.priority === 'high' ? '#ef4444'
    : c.priority === 'medium' ? '#f59e0b' : '#6366f1'

  return (
    <Link href={`/candidates/${c.id}`}
      className="glass-card block p-4 hover:shadow-md transition-all duration-150 hover:-translate-y-0.5 relative overflow-hidden"
      style={{ borderLeft: `3px solid ${borderColor}` }}>
      {isUrgent && (
        <div className="absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-8 translate-x-8 opacity-10"
          style={{ background: '#ef4444' }} />
      )}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: s.bg, color: s.color }}>
          {s.label}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs px-1.5 py-0.5 rounded font-bold"
            style={{ background: p.bg, color: p.color }}>
            {p.label}
          </span>
          {deadlineDays !== null && (
            <span className="text-xs font-bold" style={{ color: isUrgent ? '#dc2626' : '#94a3b8' }}>
              {isUrgent ? '🔥' : ''}{format(new Date(c.deadline!), 'M/d', { locale: ja })}
              {isUrgent && <span className="ml-0.5 text-xs">({deadlineDays}日後)</span>}
            </span>
          )}
        </div>
      </div>
      <p className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 mb-2">
        {c.title}
      </p>
      {c.source_name && (
        <p className="text-xs text-slate-400 mb-2 truncate">
          📌 {c.source_name}
        </p>
      )}
      <p className="text-xs font-medium" style={{ color: na.color }}>
        {c.review_status === 'requesting' ? '⏳ 掲載確認待ち' : na.text}
      </p>
    </Link>
  )
}
