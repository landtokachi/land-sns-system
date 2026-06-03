'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { PostCandidate, AiSummaryResult } from '@/types'

interface AiPanelProps {
  candidate: PostCandidate
}

export function AiPanel({ candidate }: AiPanelProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AiSummaryResult | null>(null)

  async function handleSummarize() {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: candidate.id,
          title: candidate.title,
          source_url: candidate.source_url,
          raw_text: candidate.raw_text,
        }),
      })
      const data = await res.json()
      setResult(data)
    } finally {
      setLoading(false)
    }
  }

  const summary = result?.summary || candidate.ai_summary
  const score = result?.ai_score ?? candidate.ai_score
  const reason = result?.ai_reason || candidate.ai_reason
  const factChecks = result?.fact_check_points || candidate.fact_check_points || []

  return (
    <div className="space-y-4">
      <Button onClick={handleSummarize} loading={loading} size="sm">
        🤖 AI要約・分類を実行
      </Button>

      {summary && (
        <div className="space-y-3">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-xs font-semibold text-blue-700 mb-1">AI要約</p>
            <p className="text-sm text-gray-700">{summary}</p>
          </div>

          {score != null && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">投稿おすすめ度:</span>
              <div className="flex gap-1">
                {Array.from({ length: 10 }, (_, i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-sm ${i < score ? 'bg-indigo-500' : 'bg-gray-200'}`}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-gray-700">{score}/10</span>
            </div>
          )}

          {reason && (
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-green-700 mb-1">おすすめ理由</p>
              <p className="text-sm text-gray-700">{reason}</p>
            </div>
          )}

          {factChecks.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-amber-700 mb-2">⚠️ 事実確認が必要な項目</p>
              <ul className="space-y-1">
                {factChecks.map((item, i) => (
                  <li key={i} className="text-sm text-amber-800 flex items-center gap-2">
                    <span>•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
