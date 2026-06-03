import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/AppLayout'
import { AiPanel } from '@/components/candidates/AiPanel'
import { CommentSection } from '@/components/candidates/CommentSection'
import { CandidateDetailClient } from '@/components/candidates/CandidateDetailClient'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  CANDIDATE_STATUS_COLORS,
  CANDIDATE_STATUS_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  IMPORTANCE_LABELS,
  PLATFORM_LABELS,
} from '@/lib/constants'
import type { PostCandidate, SocialPost, GeneratedImage } from '@/types'

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: candidate },
    { data: socialPosts },
    { data: images },
  ] = await Promise.all([
    supabase.from('post_candidates').select('*').eq('id', id).single(),
    supabase.from('social_posts').select('*').eq('post_candidate_id', id).order('platform'),
    supabase.from('generated_images').select('*').eq('post_candidate_id', id).order('created_at', { ascending: false }),
  ])

  if (!candidate) notFound()

  const c = candidate as PostCandidate

  return (
    <AppLayout title={c.title}>
      <div className="max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${PRIORITY_COLORS[c.priority]}`}>
                {PRIORITY_LABELS[c.priority]}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${CANDIDATE_STATUS_COLORS[c.status]}`}>
                {CANDIDATE_STATUS_LABELS[c.status]}
              </span>
              {c.category && (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {c.category}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{c.title}</h1>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href={`/candidates/${id}/edit`} className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              編集
            </Link>
            <Link href={`/candidates/${id}/social`} className="px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              投稿文を管理
            </Link>
            <Link href={`/candidates/${id}/image`} className="px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              画像を生成
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-5">
            {/* Basic info */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-800 mb-4">基本情報</h3>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {c.source_name && (
                  <>
                    <dt className="text-gray-500">情報元</dt>
                    <dd className="text-gray-800">{c.source_name}</dd>
                  </>
                )}
                {c.source_url && (
                  <>
                    <dt className="text-gray-500">元URL</dt>
                    <dd><a href={c.source_url} target="_blank" rel="noopener" className="text-indigo-600 hover:underline truncate block">{c.source_url}</a></dd>
                  </>
                )}
                {c.organizer && (
                  <>
                    <dt className="text-gray-500">主催者</dt>
                    <dd className="text-gray-800">{c.organizer}</dd>
                  </>
                )}
                {c.target_audience && (
                  <>
                    <dt className="text-gray-500">対象者</dt>
                    <dd className="text-gray-800">{c.target_audience}</dd>
                  </>
                )}
                {c.region && (
                  <>
                    <dt className="text-gray-500">地域</dt>
                    <dd className="text-gray-800">{c.region}</dd>
                  </>
                )}
                {c.event_date && (
                  <>
                    <dt className="text-gray-500">開催日</dt>
                    <dd className="text-gray-800">{format(new Date(c.event_date), 'yyyy年M月d日', { locale: ja })}</dd>
                  </>
                )}
                {c.deadline && (
                  <>
                    <dt className="text-gray-500">締切日</dt>
                    <dd className="text-red-600 font-medium">{format(new Date(c.deadline), 'yyyy年M月d日', { locale: ja })}</dd>
                  </>
                )}
                {c.application_url && (
                  <>
                    <dt className="text-gray-500">申込URL</dt>
                    <dd><a href={c.application_url} target="_blank" rel="noopener" className="text-indigo-600 hover:underline truncate block">{c.application_url}</a></dd>
                  </>
                )}
                {c.importance && (
                  <>
                    <dt className="text-gray-500">重要度</dt>
                    <dd className="text-gray-800">{IMPORTANCE_LABELS[c.importance]}</dd>
                  </>
                )}
                {c.platforms && c.platforms.length > 0 && (
                  <>
                    <dt className="text-gray-500">投稿媒体</dt>
                    <dd className="flex gap-1 flex-wrap">{c.platforms.map((p) => <span key={p} className="text-xs bg-gray-100 px-2 py-0.5 rounded">{PLATFORM_LABELS[p]}</span>)}</dd>
                  </>
                )}
                {c.scheduled_at && (
                  <>
                    <dt className="text-gray-500">投稿予定日</dt>
                    <dd className="text-gray-800">{format(new Date(c.scheduled_at), 'yyyy年M月d日', { locale: ja })}</dd>
                  </>
                )}
              </dl>
            </div>

            {c.raw_text && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-800 mb-3">本文・メモ</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.raw_text}</p>
              </div>
            )}

            {/* AI Panel */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-800 mb-4">AI要約・分析</h3>
              <AiPanel candidate={c} />
            </div>

            {/* Social posts */}
            {socialPosts && socialPosts.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">SNS投稿文</h3>
                  <Link href={`/candidates/${id}/social`} className="text-sm text-indigo-600 hover:underline">編集へ</Link>
                </div>
                <div className="space-y-3">
                  {(socialPosts as SocialPost[]).map((post) => (
                    <div key={post.id} className="border border-gray-100 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium bg-gray-100 px-2 py-0.5 rounded">{PLATFORM_LABELS[post.platform]}</span>
                        <span className="text-xs text-gray-400">{post.status}</span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-3 whitespace-pre-wrap">{post.post_text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Images */}
            {images && images.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">生成済み画像</h3>
                  <Link href={`/candidates/${id}/image`} className="text-sm text-indigo-600 hover:underline">画像生成へ</Link>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(images as GeneratedImage[]).map((img) => (
                    <div key={img.id} className="border border-gray-100 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-2">{img.template_type} / {img.image_size}</p>
                      {img.image_url && (
                        <img src={img.image_url} alt={img.template_type} className="w-full rounded" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-800 mb-4">コメント</h3>
              <CommentSection candidateId={id} />
            </div>
          </div>

          {/* Sidebar actions */}
          <div className="space-y-4">
            <CandidateDetailClient candidate={c} />
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
