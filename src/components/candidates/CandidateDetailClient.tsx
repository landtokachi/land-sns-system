'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import type { PostCandidate } from '@/types'

export function CandidateDetailClient({ candidate }: { candidate: PostCandidate }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function updateStatus(status: string) {
    setLoading(status)
    const supabase = createClient()
    await supabase.from('post_candidates').update({ status }).eq('id', candidate.id)
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

  return (
    <div className="space-y-4">
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

      <div className="bg-white rounded-xl border border-gray-200 p-4 text-xs text-gray-500 space-y-1">
        <p>作成: {new Date(candidate.created_at).toLocaleDateString('ja-JP')}</p>
        <p>更新: {new Date(candidate.updated_at).toLocaleDateString('ja-JP')}</p>
        <p>ID: {candidate.id.slice(0, 8)}...</p>
      </div>
    </div>
  )
}
