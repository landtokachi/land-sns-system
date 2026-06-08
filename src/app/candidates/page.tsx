import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/AppLayout'
import Link from 'next/link'
import { format, differenceInDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import { CATEGORIES } from '@/lib/constants'
import type { PostCandidate } from '@/types'
import { InstagramLearner } from '@/components/candidates/InstagramLearner'

// カテゴリー別の最大表示件数（デフォルト）
const MAX_PER_CATEGORY = 3

const P = {
  high:   { label: '高', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', dot: '#ef4444' },
  medium: { label: '中', color: '#d97706', bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b' },
  low:    { label: '低', color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe', dot: '#6366f1' },
}
const SS: Record<string, { label: string; color: string; bg: string }> = {
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
const NA: Record<string, { text: string; color: string }> = {
  unconfirmed:    { text: '→ 内容を確認する',     color: '#6366f1' },
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
const CI: Record<string, string> = {
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

function urg(c: PostCandidate, now: Date): number {
  const base = c.priority === 'high' ? 30 : c.priority === 'medium' ? 20 : 10
  if (!c.deadline) return base
  const d = differenceInDays(new Date(c.deadline), now)
  return d < 0 ? base * 5 : d <= 3 ? base * 4 : d <= 7 ? base * 3 : d <= 14 ? base * 2 : d <= 30 ? base * 1.5 : base
}

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string; category?: string; q?: string; view?: string; showAll?: string }>
}) {
  const params = await searchParams
  const view = params.view || 'category'
  const showAllCat = params.showAll // カテゴリー名が入ったら全件表示
  const supabase = await createClient()
  const now = new Date()

  // 未確認件数を別途カウント
  const { count: unconfirmedCount } = await supabase
    .from('post_candidates')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'unconfirmed')

  // メインクエリ：デフォルトで未確認・投稿済み・見送りを除外
  let query = supabase.from('post_candidates').select('*')
    .order('priority', { ascending: false })
    .order('deadline', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (params.status) {
    query = query.eq('status', params.status)
  } else {
    // デフォルト：unconfirmed / published / skipped を非表示
    query = query.not('status', 'in', '("unconfirmed","published","skipped")')
  }
  if (params.priority) query = query.eq('priority', params.priority)
  if (params.category) query = query.eq('category', params.category)
  if (params.q) query = query.ilike('title', `%${params.q}%`)

  const { data: candidates } = await query

  // 優先度を high→medium→low の順でソート（テキストフィールドなので手動ソート）
  const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }
  const list = ((candidates as PostCandidate[] | null) ?? []).sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 1
    const pb = PRIORITY_ORDER[b.priority] ?? 1
    if (pa !== pb) return pa - pb
    // 同じ優先度なら締切が近い順
    if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    if (a.deadline) return -1
    if (b.deadline) return 1
    return 0
  })
  const total = list.length
  const highCount = list.filter(c => c.priority === 'high').length
  const reviewCount = list.filter(c => c.review_status === 'requesting').length
  const isFiltered = !!(params.priority || params.status || params.q || params.category)

  // 緊急度Top5（未確認を除く）
  const top5 = [...list]
    .map(c => ({ ...c, u: urg(c, now) }))
    .sort((a, b) => b.u - a.u)
    .slice(0, 5)

  // カテゴリー別
  const byCat = CATEGORIES.reduce<Record<string, PostCandidate[]>>((acc, cat) => {
    const items = list.filter(c => c.category === cat)
    if (items.length > 0) acc[cat] = items
    return acc
  }, {})
  const uncat = list.filter(c => !c.category)
  if (uncat.length > 0) byCat['未分類'] = uncat

  // 優先度別
  const byPri = (['high', 'medium', 'low'] as const).reduce<Record<string, PostCandidate[]>>((acc, p) => {
    const items = list.filter(c => c.priority === p)
    if (items.length > 0) acc[p] = items
    return acc
  }, {})

  return (
    <AppLayout title="投稿候補一覧">
      <div className="space-y-4 max-w-7xl mx-auto">

        {/* ── ヘッダー ── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-slate-900">投稿候補一覧</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm text-slate-500">作業中 {total}件</span>
              {highCount > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                  🔴 高優先 {highCount}件
                </span>
              )}
              {reviewCount > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
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

        {/* ── 未確認バナー ── */}
        {(unconfirmedCount ?? 0) > 0 && !params.status && (
          <Link
            href="/candidates?status=unconfirmed"
            className="flex items-center justify-between px-4 py-3 rounded-xl transition-colors"
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div className="flex items-center gap-2.5">
              <span className="text-base">📥</span>
              <div>
                <span className="text-sm font-semibold text-slate-700">未確認の候補が {unconfirmedCount} 件あります</span>
                <span className="text-xs text-slate-400 ml-2">AI収集・PDF取込など</span>
              </div>
            </div>
            <span className="text-xs font-medium text-indigo-500 flex-shrink-0">確認する →</span>
          </Link>
        )}

        {/* ── Instagramから学習ボタン ── */}
        {!isFiltered && <InstagramLearner />}

        {/* ── 緊急度Top5 ── */}
        {!isFiltered && view !== 'kanban' && top5.length > 0 && (
          <div className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid #fde68a', background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' }}>
            <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #fde68a' }}>
              <div className="flex items-center gap-2">
                <span>🎯</span>
                <span className="text-sm font-bold text-amber-900">今やるべきこと Top 5</span>
                <span className="text-xs text-amber-600">— 締切・優先度から自動算出</span>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {top5.map((c, i) => {
                const dd = c.deadline ? differenceInDays(new Date(c.deadline), now) : null
                const bw = Math.round((c.u / top5[0].u) * 100)
                const uc = c.u >= 90 ? '#dc2626' : c.u >= 60 ? '#ea580c' : c.u >= 30 ? '#d97706' : '#4f46e5'
                const pp = P[c.priority]
                return (
                  <Link key={c.id} href={`/candidates/${c.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-amber-100 transition-colors group"
                    style={{ background: 'rgba(255,255,255,0.6)' }}>
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                      style={{ background: i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : i === 2 ? '#d97706' : '#e5e7eb', color: i < 3 ? '#fff' : '#6b7280' }}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold truncate text-slate-800">{c.title}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded font-bold shrink-0"
                          style={{ background: pp.bg, color: pp.color }}>{pp.label}</span>
                        {dd !== null && (
                          <span className="text-xs font-bold shrink-0"
                            style={{ color: dd <= 7 ? '#dc2626' : dd <= 14 ? '#ea580c' : '#6b7280' }}>
                            {dd < 0 ? '⚠️期限切れ' : dd <= 7 ? `🔥${dd}日後` : `📅${format(new Date(c.deadline!), 'M/d', { locale: ja })}`}
                          </span>
                        )}
                      </div>
                      <div className="h-2 rounded-full bg-amber-100 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${bw}%`, background: uc, opacity: 0.85 }} />
                      </div>
                    </div>
                    <span className="text-xs font-black shrink-0" style={{ color: uc }}>{c.u}pts</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* ── ビュー切り替え ── */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
            {[
              { key: 'category', label: '📂 カテゴリー別' },
              { key: 'priority', label: '🎯 優先度別' },
              { key: 'kanban', label: '🗂️ カンバン' },
            ].map(v => (
              <Link key={v.key}
                href={`/candidates?${new URLSearchParams({ ...params, view: v.key }).toString()}`}
                className="px-3 py-2 text-xs font-medium transition-colors"
                style={view === v.key ? { background: '#4f46e5', color: '#fff' } : { background: '#fff', color: '#64748b' }}>
                {v.label}
              </Link>
            ))}
          </div>
          {/* 現在の絞り込み状態 */}
          {!params.status && (
            <span className="text-xs text-slate-400">
              ※未確認・投稿済みは非表示
              <Link href={`/candidates?view=${view}`} className="ml-1 text-indigo-400 underline">すべて表示</Link>
            </span>
          )}
        </div>

        {/* ── フィルター ── */}
        <form className="glass-card p-3 flex flex-wrap gap-2">
          <input name="q" defaultValue={params.q} placeholder="🔍 タイトルで検索"
            className="px-3 py-2 text-sm flex-1 min-w-[160px]" />
          <input type="hidden" name="view" value={view} />
          <select name="priority" defaultValue={params.priority} className="px-3 py-2 text-sm">
            <option value="">全優先度</option>
            <option value="high">🔴 高</option>
            <option value="medium">🟡 中</option>
            <option value="low">🔵 低</option>
          </select>
          <select name="status" defaultValue={params.status} className="px-3 py-2 text-sm">
            <option value="">作業中のみ</option>
            {Object.entries(SS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
          </select>
          <select name="category" defaultValue={params.category} className="px-3 py-2 text-sm hidden sm:block">
            <option value="">全カテゴリ</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="submit" className="btn-glow px-4 py-2 rounded-lg text-sm font-semibold">絞り込む</button>
          <Link href={`/candidates?view=${view}`} className="px-3 py-2 text-sm text-slate-400 hover:text-slate-600">リセット</Link>
        </form>

        {/* ── カンバン ── */}
        {view === 'kanban' && (
          <div>
            <p className="text-xs text-slate-400 mb-3">ステータス別整理。カードをクリックして詳細・編集。</p>
            <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '400px' }}>
              {[
                { key: 'working', label: '✍️ 作業中', statuses: ['candidate', 'drafting'], hc: '#7c3aed', hb: '#f5f3ff', bc: '#ddd6fe' },
                { key: 'finishing', label: '🎨 仕上げ中', statuses: ['draft_created', 'image_created', 'review_waiting'], hc: '#0369a1', hb: '#e0f2fe', bc: '#bae6fd' },
                { key: 'ready', label: '✅ 準備完了', statuses: ['ready', 'scheduled'], hc: '#065f46', hb: '#ecfdf5', bc: '#a7f3d0' },
              ].map(col => {
                const items = list.filter(c => col.statuses.includes(c.status))
                return (
                  <div key={col.key} className="flex-shrink-0 w-72 flex flex-col">
                    <div className="flex items-center justify-between px-3 py-2 rounded-t-lg"
                      style={{ background: col.hb, borderBottom: `2px solid ${col.bc}` }}>
                      <span className="text-xs font-bold" style={{ color: col.hc }}>{col.label}</span>
                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ background: col.bc, color: col.hc }}>{items.length}</span>
                    </div>
                    <div className="flex-1 rounded-b-lg p-2 space-y-2"
                      style={{ background: '#f8fafc', border: `1px solid ${col.bc}`, borderTop: 'none' }}>
                      {items.length === 0 && <p className="text-xs text-slate-400 text-center py-8">なし</p>}
                      {items.map(c => {
                        const pp = P[c.priority]
                        const dd = c.deadline ? differenceInDays(new Date(c.deadline), now) : null
                        const urg_ = dd !== null && dd <= 7
                        return (
                          <Link key={c.id} href={`/candidates/${c.id}`}
                            className="block p-3 rounded-lg bg-white hover:shadow-md transition-all"
                            style={{ border: `1px solid ${urg_ ? '#fca5a5' : '#e2e8f0'}`, borderLeft: `3px solid ${pp.dot}` }}>
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                              <span className="text-xs px-1.5 py-0.5 rounded font-bold"
                                style={{ background: pp.bg, color: pp.color }}>{pp.label}</span>
                              {dd !== null && (
                                <span className="text-xs font-bold" style={{ color: urg_ ? '#dc2626' : '#94a3b8' }}>
                                  {urg_ ? '🔥' : '📅'} {format(new Date(c.deadline!), 'M/d', { locale: ja })}
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-semibold text-slate-800 line-clamp-2">{c.title}</p>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── カテゴリー別 ── */}
        {!isFiltered && view === 'category' && (
          <div className="space-y-6">
            {Object.entries(byCat).map(([cat, items]) => {
              const icon = CI[cat] || '📌'
              const hic = items.filter(c => c.priority === 'high').length
              const urgent = items.filter(c => c.deadline && differenceInDays(new Date(c.deadline), now) <= 7).length
              const isExpanded = showAllCat === cat
              const visible = isExpanded ? items : items.slice(0, MAX_PER_CATEGORY)
              const hidden = items.length - MAX_PER_CATEGORY

              return (
                <div key={cat}>
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="text-lg">{icon}</span>
                    <h3 className="text-sm font-bold text-slate-800">{cat}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">{items.length}件</span>
                    {hic > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                        🔴 高 {hic}件
                      </span>
                    )}
                    {urgent > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}>
                        🔥 締切近 {urgent}件
                      </span>
                    )}
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {visible.map(c => <CC key={c.id} c={c} now={now} u={urg(c, now)} />)}
                  </div>
                  {!isExpanded && hidden > 0 && (
                    <Link
                      href={`/candidates?${new URLSearchParams({ ...params, view, showAll: cat }).toString()}`}
                      className="mt-3 flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl text-xs font-medium transition-colors"
                      style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b' }}>
                      さらに {hidden}件を表示する →
                    </Link>
                  )}
                </div>
              )
            })}
            {Object.keys(byCat).length === 0 && (
              <div className="text-center py-16 text-slate-400 text-sm">
                <p className="text-2xl mb-2">✅</p>
                <p>作業中の投稿候補はありません</p>
              </div>
            )}
          </div>
        )}

        {/* ── 優先度別 ── */}
        {!isFiltered && view === 'priority' && (
          <div className="space-y-8">
            {Object.entries(byPri).map(([priority, items]) => {
              const pp = P[priority as keyof typeof P]
              return (
                <div key={priority}>
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: pp.dot }} />
                    <h3 className="text-sm font-bold" style={{ color: pp.color }}>優先度「{pp.label}」</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: pp.bg, color: pp.color, border: `1px solid ${pp.border}` }}>
                      {items.length}件
                    </span>
                    <div className="flex-1 h-px" style={{ background: pp.border }} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {items.map(c => <CC key={c.id} c={c} now={now} u={urg(c, now)} />)}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── フィルター時フラット ── */}
        {isFiltered && view !== 'kanban' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {list.map(c => <CC key={c.id} c={c} now={now} u={urg(c, now)} />)}
            {!list.length && (
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

function CC({ c, now, u }: { c: PostCandidate; now: Date; u: number }) {
  const pp = P[c.priority]
  const ss = SS[c.status] || { label: c.status, color: '#64748b', bg: '#f1f5f9' }
  const na = NA[c.status] || { text: '', color: '#6366f1' }
  const dd = c.deadline ? differenceInDays(new Date(c.deadline), now) : null
  const isUrgent = dd !== null && dd <= 7
  const bc = c.priority === 'high' ? '#ef4444' : c.priority === 'medium' ? '#f59e0b' : '#6366f1'
  const uc = u >= 90 ? '#dc2626' : u >= 60 ? '#ea580c' : u >= 30 ? '#f59e0b' : '#6366f1'
  const uw = Math.min(100, Math.round((u / 120) * 100))

  return (
    <Link href={`/candidates/${c.id}`}
      className="glass-card block p-4 hover:shadow-md transition-all duration-150 hover:-translate-y-0.5 relative overflow-hidden"
      style={{ borderLeft: `3px solid ${bc}` }}>
      {isUrgent && (
        <div className="absolute top-0 right-0 w-16 h-16 rounded-full -translate-y-6 translate-x-6 opacity-10"
          style={{ background: '#ef4444' }} />
      )}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: ss.bg, color: ss.color }}>
          {ss.label}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: pp.bg, color: pp.color }}>{pp.label}</span>
          {dd !== null && (
            <span className="text-xs font-bold" style={{ color: isUrgent ? '#dc2626' : '#94a3b8' }}>
              {isUrgent ? '🔥' : ''}{format(new Date(c.deadline!), 'M/d', { locale: ja })}
              {isUrgent && <span className="ml-0.5">({dd}日後)</span>}
            </span>
          )}
        </div>
      </div>
      <p className="text-sm font-bold text-slate-900 line-clamp-2 mb-2">{c.title}</p>
      {c.source_name && <p className="text-xs text-slate-400 mb-2 truncate">📌 {c.source_name}</p>}
      <div className="mb-1.5">
        <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${uw}%`, background: uc, opacity: 0.7 }} />
        </div>
      </div>
      <p className="text-xs font-medium" style={{ color: na.color }}>
        {c.review_status === 'requesting' ? '⏳ 掲載確認待ち' : na.text}
      </p>
    </Link>
  )
}
