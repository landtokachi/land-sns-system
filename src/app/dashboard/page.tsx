import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/AppLayout'
import Link from 'next/link'
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns'
import { ja } from 'date-fns/locale'
import { CANDIDATE_STATUS_LABELS } from '@/lib/constants'
import type { PostCandidate } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
  const soon = addDays(now, 7)

  const [
    { count: total }, { count: highPriority }, { count: draftCreated },
    { count: scheduled }, { count: published },
    { data: recent }, { data: nearDeadline }, { data: weekPosts },
    { data: allCandidates }, { data: reviewWaiting },
  ] = await Promise.all([
    supabase.from('post_candidates').select('*', { count: 'exact', head: true }),
    supabase.from('post_candidates').select('*', { count: 'exact', head: true }).eq('priority', 'high'),
    supabase.from('post_candidates').select('*', { count: 'exact', head: true }).in('status', ['draft_created','image_created','review_waiting','ready']),
    supabase.from('post_candidates').select('*', { count: 'exact', head: true }).eq('status', 'scheduled'),
    supabase.from('post_candidates').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('post_candidates').select('id,title,category,priority,status,created_at').order('created_at',{ascending:false}).limit(6),
    supabase.from('post_candidates').select('id,title,deadline,priority,status').not('deadline','is',null).lte('deadline',soon.toISOString().slice(0,10)).gte('deadline',now.toISOString().slice(0,10)).order('deadline').limit(5),
    supabase.from('social_posts').select('id,platform,status,scheduled_at,post_candidates(title)').gte('scheduled_at',weekStart.toISOString()).lte('scheduled_at',weekEnd.toISOString()).order('scheduled_at').limit(8),
    supabase.from('post_candidates').select('status'),
    supabase.from('post_candidates').select('id,title,review_status,updated_at').eq('review_status','requesting').order('updated_at',{ascending:false}).limit(5),
  ])

  const stats = [
    { label: '投稿候補数', value: total ?? 0, sub: '全件', color: '#6366f1', bg: '#eef2ff' },
    { label: '優先度「高」', value: highPriority ?? 0, sub: '要対応', color: '#ef4444', bg: '#fef2f2' },
    { label: '下書き済み', value: draftCreated ?? 0, sub: '確認含む', color: '#8b5cf6', bg: '#f5f3ff' },
    { label: '投稿予定', value: scheduled ?? 0, sub: 'スケジュール', color: '#0ea5e9', bg: '#f0f9ff' },
    { label: '投稿済み', value: published ?? 0, sub: '完了', color: '#10b981', bg: '#f0fdf4' },
  ]

  const STATUS_STYLE: Record<string, { label: string; color: string; dot: string }> = {
    unconfirmed:    { label: '未確認',     color: '#71717a', dot: '#a1a1aa' },
    candidate:      { label: '投稿候補',   color: '#6366f1', dot: '#818cf8' },
    drafting:       { label: '下書き中',   color: '#8b5cf6', dot: '#a78bfa' },
    draft_created:  { label: '下書き済み', color: '#7c3aed', dot: '#a78bfa' },
    image_created:  { label: '画像生成済み', color: '#0891b2', dot: '#22d3ee' },
    review_waiting: { label: '確認待ち',   color: '#d97706', dot: '#fbbf24' },
    ready:          { label: '準備完了',   color: '#16a34a', dot: '#4ade80' },
    scheduled:      { label: '投稿予定',   color: '#0284c7', dot: '#38bdf8' },
    published:      { label: '投稿済み',   color: '#059669', dot: '#34d399' },
    skipped:        { label: '見送り',     color: '#a1a1aa', dot: '#d4d4d8' },
  }

  const statusCounts = (allCandidates||[]).reduce<Record<string,number>>((acc,c) => {
    acc[c.status] = (acc[c.status]||0)+1; return acc
  }, {})
  const statusBreakdown = Object.entries(statusCounts)
    .map(([s,count]) => ({ status:s, count, ...(STATUS_STYLE[s] || { label:s, color:'#71717a', dot:'#a1a1aa' }) }))
    .sort((a,b) => b.count-a.count)

  const PRIORITY_BADGE: Record<string, { label: string; color: string; bg: string }> = {
    high:   { label: '高', color: '#dc2626', bg: '#fef2f2' },
    medium: { label: '中', color: '#d97706', bg: '#fffbeb' },
    low:    { label: '低', color: '#71717a', bg: '#f4f4f5' },
  }
  const PLATFORM_BADGE: Record<string, { label: string; color: string; bg: string }> = {
    instagram: { label: 'Instagram', color: '#be185d', bg: '#fdf2f8' },
    facebook:  { label: 'Facebook',  color: '#1d4ed8', bg: '#eff6ff' },
    x:         { label: 'X',         color: '#374151', bg: '#f9fafb' },
  }

  return (
    <AppLayout title="ダッシュボード">
      <div className="space-y-6 max-w-7xl mx-auto">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">概要</h2>
            <p className="text-sm text-zinc-500 mt-0.5">
              {format(now, 'yyyy年M月d日（E）', {locale:ja})} 時点
            </p>
          </div>
          <Link href="/candidates/new"
            className="btn-glow inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            新規登録
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {stats.map(s => (
            <div key={s.label} className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-zinc-500">{s.label}</span>
                <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                  style={{ background: s.bg, color: s.color }}>{s.sub}</span>
              </div>
              <p className="text-2xl font-bold text-zinc-900">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Alert */}
        {reviewWaiting && reviewWaiting.length > 0 && (
          <div className="glass-card p-4 border-amber-200"
            style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01"/>
                </svg>
              </div>
              <span className="text-sm font-medium text-amber-800">
                掲載確認待ち {reviewWaiting.length}件
              </span>
              <Link href="/candidates?status=review_waiting"
                className="ml-auto text-xs text-amber-600 hover:underline">すべて見る</Link>
            </div>
            <div className="space-y-1.5">
              {reviewWaiting.map(c => (
                <Link key={c.id} href={`/candidates/${c.id}`}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-white hover:bg-amber-50 transition-colors"
                  style={{ border: '1px solid #fde68a' }}>
                  <span className="text-sm text-zinc-700 truncate flex-1 mr-3">{c.title}</span>
                  <span className="text-xs text-amber-600 flex-shrink-0">確認依頼中 →</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ステータス内訳 */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-900">ステータス内訳</h3>
              <Link href="/candidates" className="text-xs text-indigo-600 hover:underline">一覧</Link>
            </div>
            <div className="space-y-3">
              {statusBreakdown.map(s => (
                <div key={s.status} className="flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
                  <span className="text-xs text-zinc-500 w-20 truncate">{s.label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${Math.max((s.count/(total||1))*100, 4)}%`, background: s.color, opacity: 0.6 }} />
                  </div>
                  <span className="text-xs font-medium w-4 text-right flex-shrink-0"
                    style={{ color: s.color }}>{s.count}</span>
                </div>
              ))}
              {!statusBreakdown.length && <p className="text-xs text-zinc-400 text-center py-4">データなし</p>}
            </div>
          </div>

          {/* 最近の投稿候補 */}
          <div className="glass-card p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-900">最近追加された投稿候補</h3>
              <Link href="/candidates" className="text-xs text-indigo-600 hover:underline">一覧</Link>
            </div>
            <div className="space-y-1">
              {(recent as PostCandidate[]|null)?.map(c => {
                const pb = PRIORITY_BADGE[c.priority]
                const sc = STATUS_STYLE[c.status]
                return (
                  <Link key={c.id} href={`/candidates/${c.id}`}
                    className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-zinc-50 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-800 truncate group-hover:text-zinc-900">{c.title}</p>
                      {c.category && <p className="text-xs text-zinc-400 mt-0.5">{c.category}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                        style={{ background: pb.bg, color: pb.color }}>{pb.label}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded font-medium text-zinc-500 bg-zinc-100">
                        {sc?.label || c.status}
                      </span>
                    </div>
                  </Link>
                )
              })}
              {!recent?.length && <p className="text-xs text-zinc-400 text-center py-4">投稿候補がありません</p>}
            </div>
          </div>
        </div>

        {/* 下段 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* 今週の投稿予定 */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-900">今週の投稿予定</h3>
              <Link href="/schedule" className="text-xs text-indigo-600 hover:underline">カレンダー</Link>
            </div>
            {weekPosts && weekPosts.length > 0 ? (
              <div className="space-y-1">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(weekPosts as any[]).map(post => {
                  const pb = PLATFORM_BADGE[post.platform] || PLATFORM_BADGE.x
                  return (
                    <div key={post.id} className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-zinc-50">
                      <span className="text-xs text-zinc-400 w-16 flex-shrink-0">
                        {format(new Date(post.scheduled_at!), 'M/d(E)', {locale:ja})}
                      </span>
                      <span className="text-sm text-zinc-700 flex-1 truncate">{post.post_candidates?.title}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                        style={{ background: pb.bg, color: pb.color }}>{pb.label}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-zinc-400 text-center py-6">今週の予定はありません</p>
            )}
          </div>

          {/* 締切が近い */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-900">締切が近い投稿候補</h3>
            </div>
            {(nearDeadline as PostCandidate[]|null)?.length ? (
              <div className="space-y-1">
                {(nearDeadline as PostCandidate[]).map(c => (
                  <Link key={c.id} href={`/candidates/${c.id}`}
                    className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-zinc-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-800 truncate">{c.title}</p>
                      <span className="text-xs text-zinc-400">
                        {CANDIDATE_STATUS_LABELS[c.status]}
                      </span>
                    </div>
                    <span className="text-sm font-semibold flex-shrink-0 text-red-500">
                      {format(new Date(c.deadline!), 'M/d', {locale:ja})}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-400 text-center py-6">締切が近い候補はありません</p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
