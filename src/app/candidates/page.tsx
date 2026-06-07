import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/AppLayout'
import Link from 'next/link'
import { format, differenceInDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import { CANDIDATE_STATUS_LABELS, CATEGORIES } from '@/lib/constants'
import type { PostCandidate } from '@/types'

const PRIORITY_CONFIG = {
  high:   { label: '🔴 高', bg: 'rgba(244,63,94,0.18)', border: 'rgba(244,63,94,0.4)', text: '#f87171', bar: '#f43f5e' },
  medium: { label: '🟡 中', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.35)', text: '#fbbf24', bar: '#f59e0b' },
  low:    { label: '⚪ 低', bg: 'rgba(99,102,241,0.10)', border: 'rgba(99,102,241,0.20)', text: '#818cf8', bar: '#6366f1' },
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  unconfirmed:    { label: '未確認',     color: '#64748b', bg: 'rgba(100,116,139,0.15)' },
  candidate:      { label: '投稿候補',   color: '#818cf8', bg: 'rgba(129,140,248,0.15)' },
  drafting:       { label: '下書き中',   color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
  draft_created:  { label: '下書き済み', color: '#c4b5fd', bg: 'rgba(196,181,253,0.15)' },
  image_created:  { label: '画像生成済み', color: '#38bdf8', bg: 'rgba(56,189,248,0.15)' },
  review_waiting: { label: '確認待ち',   color: '#fb923c', bg: 'rgba(251,146,60,0.15)' },
  ready:          { label: '準備完了',   color: '#4ade80', bg: 'rgba(74,222,128,0.15)' },
  scheduled:      { label: '投稿予定',   color: '#2dd4bf', bg: 'rgba(45,212,191,0.15)' },
  published:      { label: '投稿済み',   color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
  skipped:        { label: '見送り',     color: '#475569', bg: 'rgba(71,85,105,0.15)' },
}

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string; category?: string; q?: string; view?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const now = new Date()

  let query = supabase
    .from('post_candidates')
    .select('*')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })

  if (params.status) query = query.eq('status', params.status)
  if (params.priority) query = query.eq('priority', params.priority)
  if (params.category) query = query.eq('category', params.category)
  if (params.q) query = query.ilike('title', `%${params.q}%`)

  const { data: candidates } = await query

  const highCount = candidates?.filter(c => c.priority === 'high').length ?? 0
  const reviewCount = candidates?.filter(c => c.review_status === 'requesting').length ?? 0

  return (
    <AppLayout title="投稿候補一覧">
      <div className="space-y-5 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-black gradient-text">投稿候補一覧</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm" style={{color:'#4a3a6a'}}>{candidates?.length ?? 0}件</span>
              {highCount > 0 && (
                <span className="text-xs px-2.5 py-1 rounded-full font-bold"
                  style={{background:'rgba(244,63,94,0.18)', color:'#f87171', border:'1px solid rgba(244,63,94,0.3)'}}>
                  🔴 優先度高 {highCount}件
                </span>
              )}
              {reviewCount > 0 && (
                <span className="text-xs px-2.5 py-1 rounded-full font-bold"
                  style={{background:'rgba(251,146,60,0.18)', color:'#fb923c', border:'1px solid rgba(251,146,60,0.3)'}}>
                  ⏳ 確認待ち {reviewCount}件
                </span>
              )}
            </div>
          </div>
          <Link href="/candidates/new"
            className="btn-glow flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            新規登録
          </Link>
        </div>

        {/* Filters */}
        <form className="glass-card p-4 flex flex-wrap gap-2 sm:gap-3">
          <input name="q" defaultValue={params.q} placeholder="🔍 タイトルで検索"
            className="px-3 py-2 text-sm rounded-xl flex-1 min-w-[150px]" />
          <select name="priority" defaultValue={params.priority}
            className="px-3 py-2 text-sm rounded-xl">
            <option value="">全優先度</option>
            <option value="high">🔴 高</option>
            <option value="medium">🟡 中</option>
            <option value="low">⚪ 低</option>
          </select>
          <select name="status" defaultValue={params.status}
            className="px-3 py-2 text-sm rounded-xl">
            <option value="">全ステータス</option>
            {Object.entries(STATUS_CONFIG).map(([v, c]) => (
              <option key={v} value={v}>{c.label}</option>
            ))}
          </select>
          <select name="category" defaultValue={params.category}
            className="px-3 py-2 text-sm rounded-xl hidden sm:block">
            <option value="">全カテゴリ</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="submit"
            className="btn-glow px-4 py-2 rounded-xl text-sm font-bold text-white">
            検索
          </button>
          <Link href="/candidates" className="px-3 py-2 text-sm rounded-xl transition-colors hover:bg-white/10"
            style={{color:'#4a3a6a'}}>
            リセット
          </Link>
        </form>

        {/* Priority groups */}
        {!params.priority && !params.status && !params.q && !params.category ? (
          <div className="space-y-6">
            {(['high', 'medium', 'low'] as const).map(priority => {
              const group = (candidates as PostCandidate[] | null)?.filter(c => c.priority === priority) ?? []
              if (group.length === 0) return null
              const cfg = PRIORITY_CONFIG[priority]
              return (
                <div key={priority}>
                  {/* Group header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-px flex-1" style={{background:`linear-gradient(to right, ${cfg.bar}40, transparent)`}} />
                    <span className="text-xs font-black px-3 py-1 rounded-full"
                      style={{background:cfg.bg, color:cfg.text, border:`1px solid ${cfg.border}`}}>
                      {cfg.label} 優先 — {group.length}件
                    </span>
                    <div className="h-px w-8" style={{background:`${cfg.bar}40`}} />
                  </div>

                  {/* Cards grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {group.map(c => {
                      const sc = STATUS_CONFIG[c.status] || { label: c.status, color: '#64748b', bg: 'rgba(100,116,139,0.15)' }
                      const deadlineDays = c.deadline ? differenceInDays(new Date(c.deadline), now) : null
                      const isUrgent = deadlineDays !== null && deadlineDays <= 7
                      return (
                        <Link key={c.id} href={`/candidates/${c.id}`}
                          className="glass-card block p-4 relative overflow-hidden transition-all hover:-translate-y-0.5"
                          style={{borderLeft:`3px solid ${cfg.bar}`}}>

                          {/* Urgency glow */}
                          {isUrgent && (
                            <div className="absolute top-0 right-0 w-16 h-16 rounded-full -translate-y-4 translate-x-4 opacity-20"
                              style={{background:'#f43f5e'}} />
                          )}

                          {/* Top row: status + deadline */}
                          <div className="flex items-center justify-between mb-2.5 gap-2">
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                              style={{background:sc.bg, color:sc.color}}>
                              {sc.label}
                            </span>
                            {deadlineDays !== null && (
                              <span className="text-xs font-bold flex-shrink-0"
                                style={{color: isUrgent ? '#f43f5e' : '#64748b'}}>
                                {isUrgent ? '🔥' : '📅'} {format(new Date(c.deadline!), 'M/d', {locale:ja})}
                                {deadlineDays <= 7 && <span className="ml-1">({deadlineDays}日後)</span>}
                              </span>
                            )}
                          </div>

                          {/* Title */}
                          <p className="text-sm font-bold text-white line-clamp-2 leading-snug mb-2">{c.title}</p>

                          {/* Category + source */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {c.category && (
                              <span className="text-xs px-2 py-0.5 rounded-full"
                                style={{background:'rgba(139,92,246,0.15)', color:'#a78bfa'}}>
                                {c.category}
                              </span>
                            )}
                            {c.source_name && (
                              <span className="text-xs truncate" style={{color:'#2a1a4a', maxWidth:'120px'}}>
                                {c.source_name}
                              </span>
                            )}
                          </div>

                          {/* Bottom: action needed indicator */}
                          {c.review_status === 'requesting' && (
                            <div className="mt-2 text-xs font-semibold"
                              style={{color:'#fb923c'}}>
                              ⏳ 掲載確認待ち
                            </div>
                          )}
                          {c.status === 'unconfirmed' && (
                            <div className="mt-2 text-xs" style={{color:'#4a3a6a'}}>
                              → 投稿文を作成してください
                            </div>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          // Filtered view: simple card grid
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(candidates as PostCandidate[] | null)?.map(c => {
              const cfg = PRIORITY_CONFIG[c.priority]
              const sc = STATUS_CONFIG[c.status] || { label: c.status, color: '#64748b', bg: 'rgba(100,116,139,0.15)' }
              const deadlineDays = c.deadline ? differenceInDays(new Date(c.deadline), now) : null
              const isUrgent = deadlineDays !== null && deadlineDays <= 7
              return (
                <Link key={c.id} href={`/candidates/${c.id}`}
                  className="glass-card block p-4 transition-all hover:-translate-y-0.5"
                  style={{borderLeft:`3px solid ${cfg.bar}`}}>
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{background:sc.bg, color:sc.color}}>{sc.label}</span>
                    <span className="text-xs font-bold" style={{color:cfg.text}}>{cfg.label}</span>
                  </div>
                  <p className="text-sm font-bold text-white line-clamp-2 mb-2">{c.title}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {c.category && <span className="text-xs px-2 py-0.5 rounded-full" style={{background:'rgba(139,92,246,0.15)',color:'#a78bfa'}}>{c.category}</span>}
                    {deadlineDays !== null && (
                      <span className="text-xs font-bold" style={{color:isUrgent?'#f43f5e':'#64748b'}}>
                        {isUrgent?'🔥':'📅'} {format(new Date(c.deadline!), 'M/d', {locale:ja})}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
            {!candidates?.length && (
              <div className="col-span-3 text-center py-12" style={{color:'#2a1a4a'}}>投稿候補がありません</div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
