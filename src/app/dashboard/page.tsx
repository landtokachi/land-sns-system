import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/AppLayout'
import Link from 'next/link'
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  CANDIDATE_STATUS_COLORS,
  CANDIDATE_STATUS_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
} from '@/lib/constants'
import type { PostCandidate, SocialPost } from '@/types'

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
    { label: '投稿候補数', value: total ?? 0, color: 'bg-blue-500' },
    { label: '優先度「高」', value: highPriority ?? 0, color: 'bg-red-500' },
    { label: '下書き作成済み', value: draftCreated ?? 0, color: 'bg-purple-500' },
    { label: '投稿予定', value: scheduled ?? 0, color: 'bg-teal-500' },
    { label: '投稿済み', value: published ?? 0, color: 'bg-green-500' },
  ]

  // ステータス別内訳
  type StatusCount = { status: string; count: number; color: string; label: string }
  const statusMap: Record<string, { color: string; label: string }> = {
    unconfirmed:    { color: 'bg-gray-400',   label: '未確認' },
    candidate:      { color: 'bg-blue-400',   label: '投稿候補' },
    drafting:       { color: 'bg-purple-400', label: '下書き中' },
    draft_created:  { color: 'bg-indigo-400', label: '下書き済み' },
    image_created:  { color: 'bg-cyan-400',   label: '画像生成済み' },
    review_waiting: { color: 'bg-orange-400', label: '確認待ち' },
    ready:          { color: 'bg-green-400',  label: '準備完了' },
    scheduled:      { color: 'bg-teal-400',   label: '投稿予定' },
    published:      { color: 'bg-emerald-500',label: '投稿済み' },
    skipped:        { color: 'bg-gray-300',   label: '見送り' },
  }
  const statusCounts = (allCandidates || []).reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1
    return acc
  }, {})
  const statusBreakdown: StatusCount[] = Object.entries(statusCounts)
    .map(([status, count]) => ({ status, count, ...( statusMap[status] || { color: 'bg-gray-300', label: status }) }))
    .sort((a, b) => b.count - a.count)

  return (
    <AppLayout title="ダッシュボード">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center mb-3`}>
                <span className="text-white text-lg font-bold">{s.value}</span>
              </div>
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className="text-2xl font-bold text-gray-800">{s.value}</p>
            </div>
          ))}
        </div>

        {/* ステータス内訳 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">投稿候補 ステータス内訳</h3>
            <Link href="/candidates" className="text-sm text-indigo-600 hover:underline">一覧へ</Link>
          </div>
          {statusBreakdown.length > 0 ? (
            <div className="space-y-2">
              {statusBreakdown.map(s => (
                <div key={s.status} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-24 text-right flex-shrink-0">{s.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.color} transition-all flex items-center justify-end pr-2`}
                      style={{ width: `${Math.max((s.count / (total || 1)) * 100, 8)}%` }}
                    >
                      <span className="text-white text-xs font-medium">{s.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">データがありません</p>
          )}
        </div>

        {/* 確認待ち */}
        {reviewWaiting && reviewWaiting.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-orange-800">⏳ 掲載確認待ち（{reviewWaiting.length}件）</h3>
              <Link href="/candidates?status=review_waiting" className="text-sm text-orange-600 hover:underline">一覧へ</Link>
            </div>
            <div className="space-y-2">
              {reviewWaiting.map((c) => (
                <Link key={c.id} href={`/candidates/${c.id}`} className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-100 hover:border-orange-300 transition-colors">
                  <span className="text-sm font-medium text-gray-800 truncate flex-1 mr-4">{c.title}</span>
                  <span className="text-xs text-orange-600 flex-shrink-0">確認依頼中 →</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          {/* Recent candidates */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">最近追加された投稿候補</h3>
              <Link href="/candidates" className="text-sm text-indigo-600 hover:underline">一覧へ</Link>
            </div>
            <div className="space-y-3">
              {(recent as PostCandidate[] | null)?.map((c) => (
                <Link key={c.id} href={`/candidates/${c.id}`} className="block hover:bg-gray-50 rounded-lg p-2 -mx-2 transition-colors">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-800 truncate flex-1 mr-2">{c.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[c.priority]}`}>
                      {PRIORITY_LABELS[c.priority]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {c.category && <span className="text-xs text-gray-400">{c.category}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${CANDIDATE_STATUS_COLORS[c.status]}`}>
                      {CANDIDATE_STATUS_LABELS[c.status]}
                    </span>
                  </div>
                </Link>
              ))}
              {!recent?.length && <p className="text-sm text-gray-400 text-center py-4">投稿候補がありません</p>}
            </div>
          </div>

          {/* Near deadline */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">⚡ 締切が近い投稿候補</h3>
            </div>
            <div className="space-y-3">
              {(nearDeadline as PostCandidate[] | null)?.map((c) => (
                <Link key={c.id} href={`/candidates/${c.id}`} className="block hover:bg-gray-50 rounded-lg p-2 -mx-2 transition-colors">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-800 truncate flex-1 mr-2">{c.title}</p>
                    <span className="text-sm font-semibold text-red-600">
                      {format(new Date(c.deadline!), 'M/d', { locale: ja })}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${CANDIDATE_STATUS_COLORS[c.status]}`}>
                    {CANDIDATE_STATUS_LABELS[c.status]}
                  </span>
                </Link>
              ))}
              {!nearDeadline?.length && <p className="text-sm text-gray-400 text-center py-4">締切が近い候補はありません</p>}
            </div>
          </div>
        </div>

        {/* This week's schedule */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">今週の投稿予定</h3>
            <Link href="/schedule" className="text-sm text-indigo-600 hover:underline">一覧へ</Link>
          </div>
          {weekPosts && weekPosts.length > 0 ? (
            <div className="space-y-2">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(weekPosts as any[]).map((post) => (
                <div key={post.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600 w-16">
                    {format(new Date(post.scheduled_at!), 'M/d(E)', { locale: ja })}
                  </span>
                  <span className="text-sm font-medium text-gray-800 flex-1">
                    {post.post_candidates?.title}
                  </span>
                  <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">{post.platform}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">今週の投稿予定はありません</p>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
