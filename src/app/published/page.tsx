import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/AppLayout'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { PLATFORM_LABELS, PLATFORM_COLORS } from '@/lib/constants'
import type { SocialPost, PostCandidate, Platform } from '@/types'
import Link from 'next/link'

type PostWithCandidate = SocialPost & { post_candidates: PostCandidate }

export default async function PublishedPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string; month?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  // 月フィルタ
  const now = new Date()
  const selectedMonth = params.month || format(now, 'yyyy-MM')
  const [year, month] = selectedMonth.split('-')
  const startDate = `${year}-${month}-01`
  const endDay = new Date(parseInt(year), parseInt(month), 0).getDate()
  const endDate = `${year}-${month}-${endDay.toString().padStart(2, '0')}`

  let query = supabase
    .from('social_posts')
    .select('*, post_candidates(id, title, category, priority, source_url, organizer)')
    .eq('status', 'published')
    .gte('published_at', startDate)
    .lte('published_at', endDate + 'T23:59:59')
    .order('published_at', { ascending: false })

  if (params.platform) query = query.eq('platform', params.platform)

  const { data: posts } = await query

  // 月別件数（直近6ヶ月）
  const { data: allPublished } = await supabase
    .from('social_posts')
    .select('published_at, platform')
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(200)

  // プラットフォーム別集計
  const platformCounts = (allPublished || []).reduce<Record<string, number>>((acc, p) => {
    acc[p.platform] = (acc[p.platform] || 0) + 1
    return acc
  }, {})

  // 月別集計（直近6ヶ月）
  const monthlyData: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthlyData[format(d, 'yyyy-MM')] = 0
  }
  ;(allPublished || []).forEach(p => {
    if (p.published_at) {
      const m = p.published_at.slice(0, 7)
      if (m in monthlyData) monthlyData[m]++
    }
  })

  const maxMonthly = Math.max(...Object.values(monthlyData), 1)

  // 月選択オプション（直近12ヶ月）
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return format(d, 'yyyy-MM')
  })

  return (
    <AppLayout title="投稿済み実績">
      <div className="space-y-6">

        {/* サマリーカード */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 col-span-1">
            <p className="text-xs text-gray-500 mb-1">総投稿数</p>
            <p className="text-3xl font-bold text-gray-800">{allPublished?.length ?? 0}<span className="text-sm text-gray-400 ml-1">件</span></p>
          </div>
          {(['instagram', 'facebook', 'x'] as Platform[]).map(pl => (
            <div key={pl} className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-500 mb-1">{PLATFORM_LABELS[pl]}</p>
              <p className="text-3xl font-bold text-gray-800">{platformCounts[pl] ?? 0}<span className="text-sm text-gray-400 ml-1">件</span></p>
            </div>
          ))}
        </div>

        {/* 月次推移グラフ */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">月次投稿推移</h3>
          <div className="flex items-end gap-3 h-24">
            {Object.entries(monthlyData).map(([m, count]) => (
              <div key={m} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-600 font-medium">{count}</span>
                <div
                  className={`w-full rounded-t-md transition-all ${m === selectedMonth ? 'bg-indigo-500' : 'bg-indigo-200'}`}
                  style={{ height: `${Math.max((count / maxMonthly) * 72, count > 0 ? 8 : 2)}px` }}
                />
                <span className="text-xs text-gray-400">{m.slice(5)}月</span>
              </div>
            ))}
          </div>
        </div>

        {/* フィルター */}
        <form className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-center">
          <select
            name="month"
            defaultValue={selectedMonth}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            {monthOptions.map(m => (
              <option key={m} value={m}>{m.replace('-', '年')}月</option>
            ))}
          </select>
          <select
            name="platform"
            defaultValue={params.platform}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">全プラットフォーム</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="x">X (Twitter)</option>
          </select>
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors">
            絞り込む
          </button>
          <span className="text-sm text-gray-400 ml-auto">{posts?.length ?? 0}件</span>
        </form>

        {/* 投稿一覧 */}
        <div className="space-y-3">
          {posts && posts.length > 0 ? (
            (posts as PostWithCandidate[]).map(post => (
              <div key={post.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLATFORM_COLORS[post.platform]}`}>
                        {PLATFORM_LABELS[post.platform]}
                      </span>
                      {post.published_at && (
                        <span className="text-xs text-gray-400">
                          {format(new Date(post.published_at), 'yyyy年M月d日（E） HH:mm', { locale: ja })}
                        </span>
                      )}
                      {post.external_post_url && (
                        <a
                          href={post.external_post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-600 hover:underline ml-auto"
                        >
                          投稿を見る →
                        </a>
                      )}
                    </div>
                    <Link href={`/candidates/${post.post_candidate_id}`} className="block hover:text-indigo-600 transition-colors">
                      <h4 className="font-semibold text-gray-800 mb-1">{post.post_candidates?.title}</h4>
                      {post.post_candidates?.category && (
                        <span className="text-xs text-gray-400">{post.post_candidates.category}</span>
                      )}
                    </Link>
                    {post.post_text && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-3 whitespace-pre-line leading-relaxed">
                        {post.post_text}
                      </p>
                    )}
                    {post.hashtags && (
                      <p className="text-xs text-indigo-400 mt-1">{post.hashtags}</p>
                    )}
                  </div>
                  {post.image_url && (
                    <img src={post.image_url} alt="投稿画像" className="w-20 h-20 rounded-lg object-cover flex-shrink-0 border border-gray-100" />
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-gray-400">この期間の投稿済み実績はありません</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
