import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/AppLayout'
import Link from 'next/link'
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  CANDIDATE_STATUS_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
} from '@/lib/constants'
import type { PostCandidate } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()

  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
  const soon = addDays(now, 7)

  const [
    { count: total },
    { count: highPriority },
    { count: draftCreated },
    { count: scheduled },
    { count: published },
    { data: recent },
    { data: nearDeadline },
    { data: weekPosts },
    { data: allCandidates },
    { data: reviewWaiting },
  ] = await Promise.all([
    supabase.from('post_candidates').select('*', { count: 'exact', head: true }),
    supabase.from('post_candidates').select('*', { count: 'exact', head: true }).eq('priority', 'high'),
    supabase.from('post_candidates').select('*', { count: 'exact', head: true }).in('status', ['draft_created', 'image_created', 'review_waiting', 'ready']),
    supabase.from('post_candidates').select('*', { count: 'exact', head: true }).eq('status', 'scheduled'),
    supabase.from('post_candidates').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('post_candidates').select('id, title, category, priority, status, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('post_candidates').select('id, title, deadline, priority, status').not('deadline', 'is', null).lte('deadline', soon.toISOString().slice(0, 10)).gte('deadline', now.toISOString().slice(0, 10)).order('deadline').limit(5),
    supabase.from('social_posts').select('id, platform, status, scheduled_at, post_candidates(title, category, priority)').gte('scheduled_at', weekStart.toISOString()).lte('scheduled_at', weekEnd.toISOString()).order('scheduled_at').limit(10),
    supabase.from('post_candidates').select('status'),
    supabase.from('post_candidates').select('id, title, review_status, updated_at').eq('review_status', 'requesting').order('updated_at', { ascending: false }).limit(5),
  ])

  const stats = [
    {
      label: '投稿候補数',
      value: total ?? 0,
      gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      label: '優先度「高」',
      value: highPriority ?? 0,
      gradient: 'linear-gradient(135deg, #f43f5e, #fb7185)',
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    {
      label: '下書き作成済み',
      value: draftCreated ?? 0,
      gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
    {
      label: '投稿予定',
      value: scheduled ?? 0,
      gradient: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: '投稿済み',
      value: published ?? 0,
      gradient: 'linear-gradient(135deg, #10b981, #34d399)',
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ]

  const statusMap: Record<string, { color: string; label: string; bar: string }> = {
    unconfirmed:    { color: '#94a3b8', label: '未確認',     bar: 'rgba(148,163,184,0.5)' },
    candidate:      { color: '#60a5fa', label: '投稿候補',   bar: 'rgba(96,165,250,0.5)' },
    drafting:       { color: '#c084fc', label: '下書き中',   bar: 'rgba(192,132,252,0.5)' },
    draft_created:  { color: '#818cf8', label: '下書き済み', bar: 'rgba(129,140,248,0.5)' },
    image_created:  { color: '#22d3ee', label: '画像生成済み', bar: 'rgba(34,211,238,0.5)' },
    review_waiting: { color: '#fb923c', label: '確認待ち',   bar: 'rgba(251,146,60,0.5)' },
    ready:          { color: '#4ade80', label: '準備完了',   bar: 'rgba(74,222,128,0.5)' },
    scheduled:      { color: '#2dd4bf', label: '投稿予定',   bar: 'rgba(45,212,191,0.5)' },
    published:      { color: '#34d399', label: '投稿済み',   bar: 'rgba(52,211,153,0.5)' },
    skipped:        { color: '#475569', label: '見送り',     bar: 'rgba(71,85,105,0.5)' },
  }
  const statusCounts = (allCandidates || []).reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1
    return acc
  }, {})
  const statusBreakdown = Object.entries(statusCounts)
    .map(([status, count]) => ({ status, count, ...(statusMap[status] || { color: '#475569', label: status, bar: 'rgba(71,85,105,0.5)' }) }))
    .sort((a, b) => b.count - a.count)

  const platformColors: Record<string, { bg: string; text: string }> = {
    instagram: { bg: 'rgba(236,72,153,0.2)', text: '#f472b6' },
    facebook:  { bg: 'rgba(59,130,246,0.2)', text: '#60a5fa' },
    x:         { bg: 'rgba(148,163,184,0.15)', text: '#94a3b8' },
  }

  return (
    <AppLayout title="ダッシュボード">
      <div className="space-y-5 max-w-7xl mx-auto">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {stats.map((s) => (
            <div key={s.label} className="glass-card p-4 sm:p-5 relative overflow-hidden">
              <div className="absolute inset-0 opacity-5" style={{ background: s.gradient }} />
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: s.gradient }}
              >
                {s.icon}
              </div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* 確認待ちアラート */}
        {reviewWaiting && reviewWaiting.length > 0 && (
          <div className="rounded-2xl p-4 sm:p-5" style={{
            background: 'rgba(251,146,60,0.08)',
            border: '1px solid rgba(251,146,60,0.25)',
          }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm sm:text-base" style={{ color: '#fb923c' }}>
                ⏳ 掲載確認待ち（{reviewWaiting.length}件）
              </h3>
              <Link href="/candidates?status=review_waiting" className="text-xs hover:underline" style={{ color: '#fb923c' }}>
                一覧へ →
              </Link>
            </div>
            <div className="space-y-2">
              {reviewWaiting.map((c) => (
                <Link key={c.id} href={`/candidates/${c.id}`}
                  className="flex items-center justify-between p-3 rounded-xl transition-colors"
                  style={{ background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.15)' }}>
                  <span className="text-sm font-medium truncate flex-1 mr-4" style={{ color: '#e2e8f0' }}>{c.title}</span>
                  <span className="text-xs flex-shrink-0" style={{ color: '#fb923c' }}>確認依頼中 →</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ステータス内訳 */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm sm:text-base" style={{ color: '#e2e8f0' }}>ステータス内訳</h3>
              <Link href="/candidates" className="text-xs hover:underline" style={{ color: '#818cf8' }}>一覧へ →</Link>
            </div>
            {statusBreakdown.length > 0 ? (
              <div className="space-y-2.5">
                {statusBreakdown.map(s => (
                  <div key={s.status} className="flex items-center gap-3">
                    <span className="text-xs w-20 text-right flex-shrink-0" style={{ color: '#64748b' }}>{s.label}</span>
                    <div className="flex-1 rounded-full h-4 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div
                        className="h-full rounded-full flex items-center justify-end pr-2 transition-all"
                        style={{
                          width: `${Math.max((s.count / (total || 1)) * 100, 10)}%`,
                          background: s.bar,
                          border: `1px solid ${s.color}40`,
                        }}
                      >
                        <span className="text-xs font-semibold" style={{ color: s.color }}>{s.count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-center py-6" style={{ color: '#475569' }}>データがありません</p>
            )}
          </div>

          {/* 今週の投稿予定 */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm sm:text-base" style={{ color: '#e2e8f0' }}>今週の投稿予定</h3>
              <Link href="/schedule" className="text-xs hover:underline" style={{ color: '#818cf8' }}>スケジュールへ →</Link>
            </div>
            {weekPosts && weekPosts.length > 0 ? (
              <div className="space-y-2">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(weekPosts as any[]).map((post) => {
                  const pc = platformColors[post.platform] || { bg: 'rgba(148,163,184,0.15)', text: '#94a3b8' }
                  return (
                    <div key={post.id} className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <span className="text-xs font-medium flex-shrink-0 w-14" style={{ color: '#64748b' }}>
                        {format(new Date(post.scheduled_at!), 'M/d(E)', { locale: ja })}
                      </span>
                      <span className="text-sm flex-1 truncate" style={{ color: '#e2e8f0' }}>
                        {post.post_candidates?.title}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium"
                        style={{ background: pc.bg, color: pc.text }}>
                        {post.platform}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-center py-6" style={{ color: '#475569' }}>今週の投稿予定はありません</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* 最近の投稿候補 */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm sm:text-base" style={{ color: '#e2e8f0' }}>最近追加された投稿候補</h3>
              <Link href="/candidates" className="text-xs hover:underline" style={{ color: '#818cf8' }}>一覧へ →</Link>
            </div>
            <div className="space-y-2">
              {(recent as PostCandidate[] | null)?.map((c) => (
                <Link key={c.id} href={`/candidates/${c.id}`}
                  className="block p-3 rounded-xl transition-all hover:bg-white/5"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate flex-1" style={{ color: '#e2e8f0' }}>{c.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${PRIORITY_COLORS[c.priority]}`}>
                      {PRIORITY_LABELS[c.priority]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    {c.category && <span className="text-xs" style={{ color: '#475569' }}>{c.category}</span>}
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                      {CANDIDATE_STATUS_LABELS[c.status]}
                    </span>
                  </div>
                </Link>
              ))}
              {!recent?.length && (
                <p className="text-sm text-center py-6" style={{ color: '#475569' }}>投稿候補がありません</p>
              )}
            </div>
          </div>

          {/* 締切が近い */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm sm:text-base" style={{ color: '#e2e8f0' }}>⚡ 締切が近い投稿候補</h3>
            </div>
            <div className="space-y-2">
              {(nearDeadline as PostCandidate[] | null)?.map((c) => (
                <Link key={c.id} href={`/candidates/${c.id}`}
                  className="block p-3 rounded-xl transition-all hover:bg-white/5"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate flex-1" style={{ color: '#e2e8f0' }}>{c.title}</p>
                    <span className="text-sm font-bold flex-shrink-0" style={{ color: '#f87171' }}>
                      {format(new Date(c.deadline!), 'M/d', { locale: ja })}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full mt-1.5 inline-block"
                    style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                    {CANDIDATE_STATUS_LABELS[c.status]}
                  </span>
                </Link>
              ))}
              {!nearDeadline?.length && (
                <p className="text-sm text-center py-6" style={{ color: '#475569' }}>締切が近い候補はありません</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
