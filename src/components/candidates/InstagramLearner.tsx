'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface AnalysisResult {
  analysis: {
    insights: string[]
    top_categories: string[]
    recommendation: string
  }
  priority_weights: Record<string, string>
  updated_count: number
}

export function InstagramLearner() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  async function handleLearn() {
    setLoading(true); setError(''); setResult(null); setApplied(false)
    try {
      const res = await fetch('/api/ai/instagram-priority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: 'land.tokachi', applyToAll: false }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      setResult(data)
    } catch {
      setError('Instagram分析に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  async function handleApply() {
    setApplying(true)
    try {
      const res = await fetch('/api/ai/instagram-priority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: 'land.tokachi', applyToAll: true }),
      })
      const data = await res.json()
      setResult(data)
      setApplied(true)
    } catch {
      setError('優先度の更新に失敗しました')
    } finally {
      setApplying(false)
    }
  }

  const priorityColors: Record<string, string> = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-blue-100 text-blue-700',
  }
  const priorityLabels: Record<string, string> = {
    high: '🔴 高', medium: '🟡 中', low: '🔵 低',
  }

  if (!open) {
    return (
      <button
        type='button'
        onClick={() => { setOpen(true); handleLearn() }}
        className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors'
        style={{ background: '#f0fdf4', color: '#065f46', border: '1px solid #a7f3d0' }}>
        📸 Instagramから優先度を学習
      </button>
    )
  }

  return (
    <div className='rounded-2xl overflow-hidden' style={{ border: '1px solid #a7f3d0', background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)' }}>
      <div className='px-5 py-3 flex items-center justify-between' style={{ borderBottom: '1px solid #a7f3d0' }}>
        <div className='flex items-center gap-2'>
          <span>📸</span>
          <span className='text-sm font-bold text-emerald-900'>@land.tokachi Instagram分析</span>
          <span className='text-xs text-emerald-600'>— 投稿パターンから優先度を自動最適化</span>
        </div>
        <button type='button' onClick={() => setOpen(false)} className='text-xs text-emerald-600 hover:text-emerald-800'>✕ 閉じる</button>
      </div>

      <div className='p-5 space-y-4'>
        {loading && (
          <div className='flex items-center gap-3 bg-white rounded-xl p-4 border border-emerald-100'>
            <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600' />
            <div>
              <p className='text-sm font-medium text-emerald-800'>@land.tokachiを分析中...</p>
              <p className='text-xs text-emerald-600'>1601件の投稿パターンをAIが学習しています</p>
            </div>
          </div>
        )}

        {error && (
          <div className='bg-red-50 border border-red-200 rounded-xl p-4'>
            <p className='text-sm text-red-700'>{error}</p>
          </div>
        )}

        {result && (
          <div className='space-y-4'>
            {/* インサイト */}
            <div className='bg-white rounded-xl p-4 border border-emerald-100'>
              <p className='text-xs font-bold text-emerald-800 mb-2'>📊 投稿パターンの分析結果</p>
              <div className='space-y-1.5'>
                {(result.analysis?.insights || []).map((insight, i) => (
                  <p key={i} className='text-xs text-gray-700 flex items-start gap-1.5'>
                    <span className='text-emerald-500 mt-0.5'>✓</span> {insight}
                  </p>
                ))}
              </div>
              {result.analysis?.recommendation && (
                <div className='mt-3 bg-emerald-50 rounded-lg p-3'>
                  <p className='text-xs font-medium text-emerald-800'>💡 {result.analysis.recommendation}</p>
                </div>
              )}
            </div>

            {/* 優先度マッピング */}
            <div className='bg-white rounded-xl p-4 border border-emerald-100'>
              <p className='text-xs font-bold text-emerald-800 mb-2'>🎯 LANDのInstagram投稿傾向に基づく優先度設定</p>
              <div className='grid grid-cols-2 gap-2'>
                {Object.entries(result.priority_weights).map(([cat, pri]) => (
                  <div key={cat} className='flex items-center justify-between gap-2 text-xs'>
                    <span className='text-gray-700 truncate'>{cat}</span>
                    <span className={'px-1.5 py-0.5 rounded font-bold text-xs shrink-0 ' + (priorityColors[pri] || 'bg-gray-100 text-gray-600')}>
                      {priorityLabels[pri] || pri}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 適用ボタン */}
            {!applied ? (
              <div className='flex items-center gap-3'>
                <Button type='button' onClick={handleApply} loading={applying} size='sm'
                  style={{ background: '#065f46', borderColor: '#065f46' }}>
                  ✅ この優先度設定を未確認候補に一括適用する
                </Button>
                <p className='text-xs text-emerald-600'>カテゴリに基づいて優先度が自動更新されます</p>
              </div>
            ) : (
              <div className='bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3'>
                <p className='text-sm font-semibold text-emerald-800'>
                  ✅ {result.updated_count}件の投稿候補の優先度を更新しました！
                </p>
                <p className='text-xs text-emerald-600 mt-0.5'>ページをリロードすると新しい優先度が反映されます</p>
                <button type='button' onClick={() => window.location.reload()} className='mt-2 text-xs text-emerald-700 underline'>ページを更新する →</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
