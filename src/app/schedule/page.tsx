import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/AppLayout'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { PLATFORM_LABELS, POST_STATUS_COLORS, POST_STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS } from '@/lib/constants'
import type { SocialPost, PostCandidate } from '@/types'
import Link from 'next/link'

export default async function SchedulePage() {
  const supabase = await createClient()

  const { data: posts } = await supabase
    .from('social_posts')
    .select('*, post_candidates(id, title, category, priority)')
    .not('scheduled_at', 'is', null)
    .order('scheduled_at')
    .limit(50)

  type PostWithCandidate = SocialPost & { post_candidates: PostCandidate }

  const grouped = (posts as PostWithCandidate[])?.reduce<Record<string, PostWithCandidate[]>>(
    (acc, post) => {
      const date = post.scheduled_at!.slice(0, 10)
      if (!acc[date]) acc[date] = []
      acc[date].push(post)
      return acc
    },
    {}
  )

  return (
    <AppLayout title="投稿予定一覧">
      <div className="max-w-4xl space-y-4">
        {grouped && Object.keys(grouped).length > 0 ? (
          Object.entries(grouped).map(([date, dayPosts]) => (
            <div key={date} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800">
                  {format(new Date(date), 'yyyy年M月d日（E）', { locale: ja })}
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {dayPosts.map((post) => (
                  <div key={post.id} className="px-5 py-4 flex items-center gap-4">
                    <span className="text-sm text-gray-500 w-12">
                      {post.scheduled_at ? format(new Date(post.scheduled_at), 'HH:mm') : '--:--'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      post.platform === 'instagram' ? 'bg-pink-100 text-pink-700'
                      : post.platform === 'facebook' ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                    }`}>
                      {PLATFORM_LABELS[post.platform]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/candidates/${post.post_candidates?.id}`}
                        className="text-sm font-medium text-gray-800 hover:text-indigo-600 hover:underline truncate block"
                      >
                        {post.post_candidates?.title}
                      </Link>
                      {post.post_candidates?.category && (
                        <p className="text-xs text-gray-400 mt-0.5">{post.post_candidates.category}</p>
                      )}
                    </div>
                    {post.post_candidates?.priority && (
                      <span className={`px-2 py-0.5 rounded-full text-xs ${PRIORITY_COLORS[post.post_candidates.priority]}`}>
                        {PRIORITY_LABELS[post.post_candidates.priority]}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-xs ${POST_STATUS_COLORS[post.status]}`}>
                      {POST_STATUS_LABELS[post.status]}
                    </span>
                    {post.external_post_url && (
                      <a href={post.external_post_url} target="_blank" rel="noopener" className="text-xs text-indigo-600 hover:underline">
                        投稿を見る
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400">投稿予定はまだありません</p>
            <p className="text-sm text-gray-400 mt-1">投稿候補の詳細画面から投稿文を作成し、予定日を設定してください</p>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
