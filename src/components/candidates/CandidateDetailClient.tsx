'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { REVIEW_STATUS_LABELS } from '@/lib/constants'
import type { PostCandidate, ReviewStatus } from '@/types'

const REVIEW_STATUS_CONFIG: Record<ReviewStatus, { color: string; icon: string }> = {
  not_required:     { color: 'bg-gray-100 text-gray-500',    icon: '－' },
  not_started:      { color: 'bg-gray-100 text-gray-600',    icon: '○' },
  requesting:       { color: 'bg-orange-100 text-orange-700', icon: '⏳' },
  revision_requested:{ color: 'bg-red-100 text-red-700',     icon: '✏️' },
  confirmed:        { color: 'bg-green-100 text-green-700',  icon: '✅' },
  rejected:         { color: 'bg-red-100 text-red-800',      icon: '✕' },
  skipped:          { color: 'bg-gray-100 text-gray-400',    icon: '→' },
}

export function CandidateDetailClient({ candidate }: { candidate: PostCandidate }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewComment, setReviewComment] = useState('')

  async function updateStatus(status: string) {
    setLoading(status)
    const supabase = createClient()
    await supabase.from('post_candidates').update({ status }).eq('id', candidate.id)
    router.refresh()
    setLoading(null)
  }

  async function updateReviewStatus(review_status: ReviewStatus) {
    setLoading('review_' + review_status)
    const supabase = createClient()
    await supabase.from('post_candidates').update({ review_status }).eq('id', candidate.id)
    router.refresh()
    setLoading(null)
  }

  async function generatePosts() {
    setLoading('generate')
    await fetch('/api/ai/generate-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: candidate.id, candidate }),
    })
    router.refresh()
    setLoading(null)
  }

  async function requestReview() {
    setLoading('review_request')
    const supabase = createClient()
    await supabase.from('post_candidates').update({
      review_status: 'requesting',
      status: 'review_waiting',
    }).eq('id', candidate.id)
    if (reviewComment.trim()) {
      await supabase.from('comments').insert({
        post_candidate_id: candidate.id,
        comment: `【確認依頼】${reviewComment}`,
      })
    }
    setShowReviewModal(false)
    setReviewComment('')
    router.refresh()
    setLoading(null)
  }

  const reviewCfg = REVIEW_STATUS_CONFIG[candidate.review_status]

  return (
    <div className="space-y-4">
      {/* クイックアクション */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h3 className="font-semibold text-gray-800 text-sm">クイックアクション</h3>
        <Button
          onClick={generatePosts}
          loading={loading === 'generate'}
          className="w-full"
          size="sm"
        >
          ✍️ SNS投稿文を生成
        </Button>
        <Button
          onClick={() => updateStatus('ready')}
          loading={loading === 'ready'}
          variant="secondary"
          className="w-full"
          size="sm"
        >
          ✅ 投稿準備完了にする
        </Button>
        <Button
          onClick={() => updateStatus('published')}
          loading={loading === 'published'}
          variant="secondary"
          className="w-full"
          size="sm"
        >
          📤 投稿済みにする
        </Button>
        <Button
          onClick={() => updateStatus('skipped')}
          loading={loading === 'skipped'}
          variant="ghost"
          className="w-full text-gray-400"
          size="sm"
        >
          見送りにする
        </Button>
      </div>

      {/* レビュー・承認フロー */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h3 className="font-semibold text-gray-800 text-sm">掲載確認フロー</h3>

        {/* 現在の確認ステータス */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${reviewCfg.color}`}>
            {reviewCfg.icon} {REVIEW_STATUS_LABELS[candidate.review_status]}
          </span>
        </div>

        {/* 確認依頼ボタン（未依頼・修正依頼時に表示） */}
        {(candidate.review_status === 'not_started' || candidate.review_status === 'not_required' || candidate.review_status === 'revision_requested') && (
          <button
            onClick={() => setShowReviewModal(true)}
            className="w-full py-2 rounded-lg border border-orange-200 bg-orange-50 text-orange-700 text-sm font-medium hover:bg-orange-100 transition-colors"
          >
            📋 掲載確認を依頼する
          </button>
        )}

        {/* 確認中ステータスの場合：承認・修正依頼ボタン */}
        {candidate.review_status === 'requesting' && (
          <div className="space-y-2">
            <p className="text-xs text-orange-600 bg-orange-50 rounded p-2">確認依頼中です。確認が完了したら下記を選択してください。</p>
            <button
              onClick={() => updateReviewStatus('confirmed')}
              disabled={loading === 'review_confirmed'}
              className="w-full py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              ✅ 確認OK・掲載承認
            </button>
            <button
              onClick={() => updateReviewStatus('revision_requested')}
              disabled={loading === 'review_revision_requested'}
              className="w-full py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              ✏️ 修正を依頼する
            </button>
            <button
              onClick={() => updateReviewStatus('rejected')}
              disabled={loading === 'review_rejected'}
              className="w-full py-2 rounded-lg border border-gray-200 text-gray-500 text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              掲載見送り
            </button>
          </div>
        )}

        {/* 承認済み */}
        {candidate.review_status === 'confirmed' && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 border border-green-100">
            <span className="text-green-600 text-sm">✅ 掲載確認済みです</span>
          </div>
        )}

        {/* 掲載不可 */}
        {candidate.review_status === 'rejected' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 border border-red-100">
              <span className="text-red-600 text-sm">✕ 掲載不可となっています</span>
            </div>
            <button
              onClick={() => updateReviewStatus('not_started')}
              className="w-full py-1.5 rounded-lg border border-gray-200 text-gray-500 text-xs hover:bg-gray-50 transition-colors"
            >
              確認フローをリセット
            </button>
          </div>
        )}
      </div>

      {/* メタ情報 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 text-xs text-gray-500 space-y-1">
        <p>作成: {new Date(candidate.created_at).toLocaleDateString('ja-JP')}</p>
        <p>更新: {new Date(candidate.updated_at).toLocaleDateString('ja-JP')}</p>
        <p>ID: {candidate.id.slice(0, 8)}...</p>
      </div>

      {/* 確認依頼モーダル */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">掲載確認を依頼する</h3>
              <p className="text-sm text-gray-500 mt-0.5">「{candidate.title}」の掲載確認を依頼します</p>
            </div>
            <div className="px-6 py-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">メモ・コメント（任意）</label>
              <textarea
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                placeholder="確認してほしい点や注意事項があれば記入してください"
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
              />
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => { setShowReviewModal(false); setReviewComment('') }}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={requestReview}
                disabled={loading === 'review_request'}
                className="flex-1 py-2.5 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {loading === 'review_request' ? '送信中...' : '確認依頼を送る'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
