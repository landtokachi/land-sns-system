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
      sub: '全体',
      gradient: 'linear-gradient(135deg, #5b7fff 0%, #7c5cfc 100%)',
      iconBg: 'rgba(91,127,255,0.12)',
      iconColor: '#5b7fff',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      label: '優先度「高」',
      value: highPriority ?? 0,
      sub: '要対応',
      gradient: 'linear-gradient(135deg, #ff6b8a 0%, #ff4d6d 100%)',
      iconBg: 'rgba(255,107,138,0.12)',
      iconColor: '#ff6b8a',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    {
      label: '下書き作成済み',
      value: draftCreated ?? 0,
      sub: '確認待ち含む',
      gradient: 'linear-gradient(135deg, #7c5cfc 0%, #a78bfa 100%)',
      iconBg: 'rgba(124,92,252,0.12)',
      iconColor: '#7c5cfc',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
    {
      label: '投稿予定',
      value: scheduled ?? 0,
      sub: 'スケジュール済み',
      gradient: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)',
      iconBg: 'rgba(56,189,248,0.12)',
      iconColor: '#38bdf8',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: '投稿済み',
      value: published ?? 0,
      sub: '完了',
      gradient: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
      iconBg: 'rgba(52,211,153,0.12)',
      iconColor: '#34d399',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ]

  const statusMap: Record<string, { label: string; color: string }> = {
    unconfirmed:    { label: '未確認',     color: '#94a3b8' },
    candidate:      { label: '投稿候補',   color: '#5b7fff' },
    drafting:       { label: '下書き中',   color: '#a78bfa' },
    draft_created:  { label: '下書き済み', color: '#7c5cfc' },
    image_created:  { label: '画像生成済み', color: '#38bdf8' },
    review_waiting: { label: '確認待ち',   color: '#fb923c' },
    ready:          { label: '準備完了',   color: '#34d399' },
    scheduled:      { label: '投稿予定',   color: '#0ea5e9' },
    published:      { label: '投稿済み',   color: '#10b981' },
    skipped:        { label: '見送り',     color: '#cbd5e1' },
  }
  const statusCounts = (allCandidates || []).reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1
    return acc
  }, {})
  const statusBreakdown = Object.entries(statusCounts)
    .map(([status, count]) => ({ status, count, ...(statusMap[status] || { label: status, color: '#94a3b8' }) }))
    .sort((a, b) => b.count - a.count)

  const platformStyle: Record<string, { bg: string; text: string; dot: string }> = {
    instagram: { bg: 'rgba(236,72,153,0.1)', text: '#ec4899', dot: '#ec4899' },
    facebook:  { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6', dot: '#3b82f6' },
    x:         { bg: 'rgba(100,116,139,0.1)', text: '#64748b', dot: '#64748b' },
  }

  return (
    <AppLayout title="ダッシュボード">
      <div className="space-y-5 max-w-7xl mx-auto">

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {stats.map((s) => (
            <div key={s.label} className="glass-card p-4 sm:p-5">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: s.iconBg, color: s.iconColor }}
              >
                {s.icon}
              </div>
              <p className="text-2xl font-bold" style={{ color: '#1e2b3c' }}>{s.value}</p>
              <p className="text-xs font-medium mt-0.5" style={{ color: '#6b7a99' }}>{s.label}</p>
              <p className="text-xs mt-0.5" style={{ color: '#b0bcd4' }}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* 確認待ちアラート */}
        {reviewWaiting && reviewWaiting.length > 0 && (
          <div className="glass-card p-4 sm:p-5"
            style={{ borderColor: 'rgba(251,146,60,0.4)', background: 'rgba(255,247,237,0.7)' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: '#c2410c' }}>
                ⏳ 掲載確認待ち（{reviewWaiting.length}件）
              </h3>
              <Link href="/candidates?status=review_waiting"
                className="text-xs font-medium hover:underline" style={{ color: '#ea580c' }}>
                すべて見る →
              </Link>
            </div>
            <div className="space-y-2">
              {reviewWaiting.map((c) => (
                <Link key={c.id} href={`/candidates/${c.id}`}
                  className="flex items-center justify-between p-3 rounded-xl transition-colors hover:bg-orange-50/80"
                  style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(251,146,60,0.2)' }}>
                  <span className="text-sm font-medium truncate flex-1 mr-3" style={{ color: '#1e2b3c' }}>{c.title}</span>
                  <span className="text-xs flex-shrink-0" style={{ color: '#ea580c' }}>確認依頼中 →</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ステータス内訳 */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-sm" style={{ color: '#1e2b3c' }}>ステータス内訳</h3>
              <Link href="/candidates"
                className="text-xs font-medium px-3 py-1.5 rounded-xl transition-colors hover:bg-blue-50"
                style={{ color: '#5b7fff', border: '1px solid rgba(91,127,255,0.25)' }}>
                一覧へ
              </Link>
            </div>
            {statusBreakdown.length > 0 ? (
              <div className="space-y-3">
                {statusBreakdown.map(s => (
                  <div key={s.status} className="flex items-center gap-3">
                    <span className="text-xs w-20 text-right flex-shrink-0 font-medium" style={{ color: '#8a9abf' }}>{s.label}</span>
                    <div className="flex-1 rounded-full h-2.5 overflow-hidden" style={{ background: 'rgba(180,200,230,0.25)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.max((s.count / (total || 1)) * 100, 6)}%`,
                          background: s.color,
                          opacity: 0.7,
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold w-5 text-right flex-shrink-0" style={{ color: s.color }}>{s.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-center py-6" style={{ color: '#b0bcd4' }}>データがありません</p>
            )}
          </div>

          {/* 今週の投稿予定 */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-sm" style={{ color: '#1e2b3c' }}>今週の投稿予定</h3>
              <Link href="/schedule"
                className="text-xs font-medium px-3 py-1.5 rounded-xl transition-colors hover:bg-blue-50"
                style={{ color: '#5b7fff', border: '1px solid rgba(91,127,255,0.25)' }}>
                カレンダーへ
              </Link>
            </div>
            {weekPosts && weekPosts.length > 0 ? (
              <div className="space-y-2">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(weekPosts as any[]).map((post) => {
                  const ps = platformStyle[post.platform] || platformStyle.x
                  return (
                    <div key={post.id} className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(200,215,240,0.5)' }}>
                      <span className="text-xs font-semibold flex-shrink-0 w-12" style={{ color: '#8a9abf' }}>
                        {format(new Date(post.scheduled_at!), 'M/d(E)', { locale: ja })}
                      </span>
                      <span className="text-sm flex-1 truncate font-medium" style={{ color: '#2d3a52' }}>
                        {post.post_candidates?.title}
                      </span>
                      <span className="text-xs px-2.5 py-1 rounded-full flex-shrink-0 font-medium"
                        style={{ background: ps.bg, color: ps.text }}>
                        {post.platform}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-center py-6" style={{ color: '#b0bcd4' }}>今週の投稿予定はありません</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* 最近の投稿候補 */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-sm" style={{ color: '#1e2b3c' }}>最近追加された投稿候補</h3>
              <Link href="/candidates"
                className="text-xs font-medium px-3 py-1.5 rounded-xl transition-colors hover:bg-blue-50"
                style={{ color: '#5b7fff', border: '1px solid rgba(91,127,255,0.25)' }}>
                一覧へ
              </Link>
            </div>
            <div className="space-y-2">
              {(recent as PostCandidate[] | null)?.map((c) => (
                <Link key={c.id} href={`/candidates/${c.id}`}
                  className="block p-3 rounded-xl transition-colors hover:bg-white/70"
                  style={{ background: 'rgba(255,255,255,0.45)', border: '1px solid rgba(200,215,240,0.4)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate flex-1" style={{ color: '#1e2b3c' }}>{c.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${PRIORITY_COLORS[c.priority]}`}>
                      {PRIORITY_LABELS[c.priority]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    {c.category && <span className="text-xs" style={{ color: '#a0aec0' }}>{c.category}</span>}
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(91,127,255,0.1)', color: '#5b7fff' }}>
                      {CANDIDATE_STATUS_LABELS[c.status]}
                    </span>
                  </div>
                </Link>
              ))}
              {!recent?.length && (
                <p className="text-sm text-center py-6" style={{ color: '#b0bcd4' }}>投稿候補がありません</p>
              )}
            </div>
          </div>

          {/* 締切が近い */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-sm" style={{ color: '#1e2b3c' }}>⚡ 締切が近い投稿候補</h3>
            </div>
            <div className="space-y-2">
              {(nearDeadline as PostCandidate[] | null)?.map((c) => (
                <Link key={c.id} href={`/candidates/${c.id}`}
                  className="block p-3 rounded-xl transition-colors hover:bg-white/70"
                  style={{ background: 'rgba(255,255,255,0.45)', border: '1px solid rgba(200,215,240,0.4)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate flex-1" style={{ color: '#1e2b3c' }}>{c.title}</p>
                    <span className="text-sm font-bold flex-shrink-0" style={{ color: '#ef4444' }}>
                      {format(new Date(c.deadline!), 'M/d', { locale: ja })}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full mt-1.5 inline-block"
                    style={{ background: 'rgba(91,127,255,0.1)', color: '#5b7fff' }}>
                    {CANDIDATE_STATUS_LABELS[c.status]}
                  </span>
                </Link>
              ))}
              {!nearDeadline?.length && (
                <p className="text-sm text-center py-6" style={{ color: '#b0bcd4' }}>締切が近い候補はありません</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
