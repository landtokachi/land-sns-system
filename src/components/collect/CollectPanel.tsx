'use client'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

interface Source {
  id: string
  name: string
  url: string
  category: string | null
  crawl_frequency: 'daily' | 'weekly' | 'manual'
  is_active: boolean
  last_crawled_at: string | null
  last_found_count: number
}

interface Candidate {
  title: string
  summary: string
  category: string
  target_audience: string
  event_date: string | null
  deadline: string | null
  organizer: string
  source_url: string
  region: string
  ai_score: number
  ai_reason: string
}

interface SourceResult {
  source_name: string
  url: string
  status: string
  candidates?: Candidate[]
  error?: string
}

interface CollectResult {
  sources_checked: number
  candidates_found: number
  saved_count: number
  results: SourceResult[]
}

const FREQ_LABELS = { daily: '毎日', weekly: '週1回', manual: '手動のみ' }

export function CollectPanel() {
  const [sources, setSources] = useState<Source[]>([])
  const [loadingSources, setLoadingSources] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CollectResult | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState<'all' | 'select'>('all')
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  const loadSources = useCallback(async () => {
    setLoadingSources(true)
    try {
      const res = await fetch('/api/sources')
      if (res.ok) {
        const data: Source[] = await res.json()
        setSources(data.filter(s => s.is_active))
      }
    } finally {
      setLoadingSources(false)
    }
  }, [])

  useEffect(() => { loadSources() }, [loadSources])

  function toggleSource(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleCollect() {
    const targetSources = selectMode === 'all'
      ? sources
      : sources.filter(s => selectedIds.has(s.id))

    if (targetSources.length === 0) {
      alert('収集するサイトを選択してください')
      return
    }

    setLoading(true)
    setResult(null)

    // ★サイトを5件ずつに分割して順番に収集（1回のリクエストを軽くしてタイムアウトを防ぐ）
    const CHUNK = 3
    const allResults: SourceResult[] = []
    let savedTotal = 0
    let foundTotal = 0
    setProgress({ done: 0, total: targetSources.length })
    try {
      for (let i = 0; i < targetSources.length; i += CHUNK) {
        const chunk = targetSources.slice(i, i + CHUNK)
        try {
          const res = await fetch('/api/ai/collect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sources: chunk.map(s => ({ name: s.name, url: s.url, category: s.category })),
            }),
          })
          if (res.ok) {
            const data: CollectResult = await res.json()
            allResults.push(...(data.results || []))
            savedTotal += data.saved_count || 0
            foundTotal += data.candidates_found || 0
          } else {
            chunk.forEach(s => allResults.push({ source_name: s.name, url: s.url, status: 'error', error: 'サーバーエラー' }))
          }
        } catch {
          chunk.forEach(s => allResults.push({ source_name: s.name, url: s.url, status: 'error', error: '通信エラー（時間切れの可能性）' }))
        }
        setProgress({ done: Math.min(i + CHUNK, targetSources.length), total: targetSources.length })
        setResult({ sources_checked: allResults.length, candidates_found: foundTotal, saved_count: savedTotal, results: allResults })
      }
      // 完了後にソース一覧をリロード（最終確認日更新）
      await loadSources()
    } finally {
      setLoading(false)
      setProgress(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* 説明 */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
        <h2 className="font-semibold text-indigo-800 mb-2">🤖 AIが情報を自動収集します</h2>
        <p className="text-sm text-indigo-700 leading-relaxed">
          登録された巡回サイトを確認し、起業・創業・補助金・イベント等の情報を収集してSNS投稿候補に追加します。<br />
          収集した候補はステータス「未確認」で保存されます。内容を確認してから投稿に活用してください。
        </p>
      </div>

      {/* サイト一覧 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">収集対象のサイト</h3>
          <Link href="/sources" className="text-xs text-indigo-600 hover:underline">
            ＋ サイトを追加・管理する
          </Link>
        </div>

        {loadingSources ? (
          <p className="text-sm text-gray-400">読み込み中...</p>
        ) : sources.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500">巡回サイトが登録されていません</p>
            <Link href="/sources" className="text-sm text-indigo-600 hover:underline mt-2 inline-block">
              → サイトを登録する
            </Link>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setSelectMode('all')}
                className={`text-xs px-3 py-1.5 rounded-lg border ${selectMode === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600 hover:border-indigo-400'}`}
              >
                全サイト（{sources.length}件）
              </button>
              <button
                type="button"
                onClick={() => setSelectMode('select')}
                className={`text-xs px-3 py-1.5 rounded-lg border ${selectMode === 'select' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600 hover:border-indigo-400'}`}
              >
                サイトを選んで収集
              </button>
            </div>

            <div className="space-y-2">
              {sources.map(s => (
                <div
                  key={s.id}
                  onClick={() => selectMode === 'select' && toggleSource(s.id)}
                  className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                    selectMode === 'select'
                      ? selectedIds.has(s.id)
                        ? 'bg-indigo-50 border-indigo-300 cursor-pointer'
                        : 'bg-gray-50 border-gray-200 cursor-pointer hover:border-indigo-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {selectMode === 'select' && (
                      <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleSource(s.id)} className="rounded text-indigo-600" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-700">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 shrink-0">
                    <span className={`px-1.5 py-0.5 rounded ${s.crawl_frequency === 'daily' ? 'bg-green-100 text-green-700' : s.crawl_frequency === 'weekly' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                      {FREQ_LABELS[s.crawl_frequency]}
                    </span>
                    {s.last_crawled_at && (
                      <span>最終: {new Date(s.last_crawled_at).toLocaleDateString('ja-JP')}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 収集ボタン */}
      <Button
        onClick={handleCollect}
        loading={loading}
        size="lg"
        disabled={sources.length === 0}
      >
        🔍 情報収集を開始する
        {selectMode === 'select' && selectedIds.size > 0 && `（${selectedIds.size}サイト）`}
      </Button>

      {loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-700">情報を収集中です...{progress ? `（${progress.done}/${progress.total}サイト）` : ''}</p>
              <p className="text-xs text-blue-500 mt-1">5サイトずつ順番に確認しています。サイト数が多いと数分かかる場合があります。</p>
            </div>
          </div>
        </div>
      )}

      {/* 結果 */}
      {result && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="font-semibold text-green-800">
              ✅ 収集完了！　{result.sources_checked}サイトを確認 → {result.candidates_found}件の候補を発見 → {result.saved_count}件を保存
            </p>
            {result.saved_count > 0 && (
              <Link href="/candidates" className="text-sm text-green-700 underline mt-1 inline-block">
                → 収集した候補を確認する
              </Link>
            )}
          </div>

          {result.results.map((r) => (
            <div key={r.url} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-gray-800 text-sm">{r.source_name}</p>
                  <p className="text-xs text-gray-400">{r.url}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  r.status === 'success' ? 'bg-green-100 text-green-700' :
                  r.status === 'fetch_failed' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                }`}>
                  {r.status === 'success' ? `✅ ${r.candidates?.length || 0}件` :
                   r.status === 'fetch_failed' ? '⚠️ 取得失敗' : '❌ エラー'}
                </span>
              </div>

              {r.candidates && r.candidates.length > 0 && (
                <div className="space-y-2">
                  {r.candidates.map((c, i) => (
                    <div key={i} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-gray-800">{c.title}</p>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          c.ai_score >= 8 ? 'bg-green-100 text-green-700' :
                          c.ai_score >= 5 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          ★{c.ai_score}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{c.summary}</p>
                      <p className="text-xs text-indigo-600 mt-0.5">{c.ai_reason}</p>
                      <div className="flex gap-2 mt-1.5 flex-wrap">
                        {c.category && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">{c.category}</span>}
                        {c.organizer && <span className="text-xs text-gray-500">主催: {c.organizer}</span>}
                        {c.deadline && <span className="text-xs text-red-600 font-medium">締切: {c.deadline}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {r.error && <p className="text-xs text-gray-500">{r.error}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
