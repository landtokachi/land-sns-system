'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { CATEGORIES } from '@/lib/constants'
import type { PostCandidate } from '@/types'
import type { FetchUrlResponse, FetchUrlItem } from '@/app/api/ai/fetch-url/route'

interface CandidateFormProps {
  initial?: Partial<PostCandidate>
  candidateId?: string
}

type FreqOption = 'daily' | 'weekly' | 'manual' | 'none'

export function CandidateForm({ initial, candidateId }: CandidateFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [urlFetching, setUrlFetching] = useState(false)
  const [fetchResult, setFetchResult] = useState<FetchUrlResponse | null>(null)
  const [selectedItem, setSelectedItem] = useState<FetchUrlItem | null>(null)
  const [applied, setApplied] = useState(false)

  // 巡回登録オプション
  const [crawlFreq, setCrawlFreq] = useState<FreqOption>('none')
  const [crawlRegistering, setCrawlRegistering] = useState(false)
  const [crawlDone, setCrawlDone] = useState(false)

  const [form, setForm] = useState({
    title: initial?.title || '',
    source_url: initial?.source_url || '',
    source_name: initial?.source_name || '',
    raw_text: initial?.raw_text || '',
    category: initial?.category || '',
    sub_category: initial?.sub_category || '',
    region: initial?.region || '',
    target_audience: initial?.target_audience || '',
    event_date: initial?.event_date || '',
    deadline: initial?.deadline || '',
    organizer: initial?.organizer || '',
    application_url: initial?.application_url || '',
    priority: initial?.priority || 'medium',
    importance: initial?.importance || 'normal',
    status: initial?.status || 'unconfirmed',
    scheduled_at: initial?.scheduled_at ? initial.scheduled_at.slice(0, 10) : '',
    platforms: initial?.platforms || [],
  })

  function set(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function togglePlatform(p: string) {
    setForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(p as never)
        ? prev.platforms.filter((x) => x !== p)
        : [...prev.platforms, p as never],
    }))
  }

  async function handleFetchUrl() {
    if (!form.source_url) return
    setUrlFetching(true)
    setFetchResult(null)
    setSelectedItem(null)
    setApplied(false)
    setCrawlDone(false)
    try {
      const res = await fetch('/api/ai/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: form.source_url }),
      })
      const data: FetchUrlResponse = await res.json()
      setFetchResult(data)
      // 情報が1件だけなら自動選択
      if (data.items && data.items.length === 1) {
        setSelectedItem(data.items[0])
      }
    } catch {
      setFetchResult({ fetch_success: false, site_name: null, page_type: 'unknown', items: [], unclear_points: ['情報の取得に失敗しました。'] })
    } finally {
      setUrlFetching(false)
    }
  }

  function applyItem(item: FetchUrlItem) {
    setSelectedItem(item)
    setForm((prev) => ({
      ...prev,
      title: item.title || prev.title,
      source_name: fetchResult?.site_name || prev.source_name,
      raw_text: item.raw_text || prev.raw_text,
      category: item.category || prev.category,
      target_audience: item.target_audience || prev.target_audience,
      organizer: item.organizer || prev.organizer,
      event_date: item.event_date || prev.event_date,
      deadline: item.deadline || prev.deadline,
      application_url: item.application_url || prev.application_url,
      region: item.region || prev.region,
    }))
    setApplied(true)
  }

  async function handleRegisterCrawl() {
    if (!form.source_url || crawlFreq === 'none') return
    setCrawlRegistering(true)
    try {
      await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fetchResult?.site_name || form.source_name || form.source_url,
          url: form.source_url,
          category: form.category || null,
          crawl_frequency: crawlFreq,
          notes: `新規登録時に追加 (${new Date().toLocaleDateString('ja-JP')})`,
        }),
      })
      setCrawlDone(true)
    } catch {
      alert('巡回登録に失敗しました')
    } finally {
      setCrawlRegistering(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()

    const payload = {
      ...form,
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      event_date: form.event_date || null,
      deadline: form.deadline || null,
    }

    if (candidateId) {
      await supabase.from('post_candidates').update(payload).eq('id', candidateId)
      router.push(`/candidates/${candidateId}`)
    } else {
      const { data } = await supabase.from('post_candidates').insert(payload).select().single()
      if (data) router.push(`/candidates/${data.id}`)
    }
    setLoading(false)
  }

  const freqLabels: Record<FreqOption, string> = {
    daily: '毎日チェック',
    weekly: '週1回チェック',
    manual: '手動のみ',
    none: '登録しない',
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h3 className="font-semibold text-gray-800">基本情報</h3>

        {/* URL入力 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">元URL</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={form.source_url}
              onChange={(e) => {
                set('source_url', e.target.value)
                setFetchResult(null)
                setSelectedItem(null)
                setApplied(false)
                setCrawlDone(false)
              }}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="https://... URLを貼るとAIが内容を自動読み取りします"
            />
            <Button
              type="button"
              onClick={handleFetchUrl}
              loading={urlFetching}
              disabled={!form.source_url || urlFetching}
              size="sm"
              variant="secondary"
            >
              🔍 URLを読み込む
            </Button>
          </div>
        </div>

        {/* === URL読み取り結果 === */}
        {urlFetching && (
          <div className="flex items-center gap-3 bg-blue-50 rounded-lg p-4">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
            <p className="text-sm text-blue-700">AIがページ内容を読み取り中です...</p>
          </div>
        )}

        {fetchResult && !applied && (
          <div className="space-y-3">
            {/* 読み取り失敗 */}
            {!fetchResult.fetch_success && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                <p className="text-sm font-semibold text-amber-700">⚠️ ページを自動読み取りできませんでした</p>
                <p className="text-xs text-amber-600">以下の情報を手動で入力してください：</p>
                <ul className="space-y-1">
                  {fetchResult.unclear_points.map((p, i) => (
                    <li key={i} className="text-xs text-amber-800">• {p}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 複数候補がある場合 → 選んでもらう */}
            {fetchResult.fetch_success && fetchResult.items.length > 1 && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-indigo-800">
                    📋 このページに {fetchResult.items.length} 件の情報が見つかりました
                  </p>
                  <p className="text-xs text-indigo-600 mt-0.5">どの情報をSNSで発信したいか選んでください</p>
                </div>
                <div className="space-y-2">
                  {fetchResult.items.map((item, i) => (
                    <div
                      key={i}
                      className="bg-white border border-indigo-100 rounded-lg p-3 cursor-pointer hover:border-indigo-400 hover:shadow-sm transition-all"
                      onClick={() => applyItem(item)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-gray-800">{item.title}</p>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs text-gray-500">おすすめ</span>
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                            item.ai_score >= 8 ? 'bg-green-100 text-green-700' :
                            item.ai_score >= 5 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{item.ai_score}/10</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{item.summary}</p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {item.category && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{item.category}</span>}
                        {item.deadline && <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded">締切 {item.deadline}</span>}
                        {item.event_date && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">開催日 {item.event_date}</span>}
                      </div>
                      <p className="text-xs text-indigo-600 mt-2 font-medium">→ この情報を使う</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 1件だけの場合 → そのまま確認 */}
            {fetchResult.fetch_success && fetchResult.items.length === 1 && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-3">
                <p className="text-sm font-semibold text-indigo-800">✅ 内容を読み取りました</p>
                <div className="bg-white rounded-lg p-3 border border-indigo-100">
                  <p className="text-sm font-medium text-gray-800">{fetchResult.items[0].title}</p>
                  <p className="text-xs text-gray-600 mt-1">{fetchResult.items[0].summary}</p>
                </div>
                {fetchResult.unclear_points.length > 0 && (
                  <div className="bg-amber-50 rounded p-3 border border-amber-100">
                    <p className="text-xs font-semibold text-amber-700 mb-1">⚠️ 確認してほしい点</p>
                    <ul className="space-y-0.5">
                      {fetchResult.unclear_points.map((p, i) => <li key={i} className="text-xs text-amber-800">• {p}</li>)}
                    </ul>
                  </div>
                )}
                <Button type="button" onClick={() => applyItem(fetchResult.items[0])} size="sm">
                  📋 この内容をフォームに反映する
                </Button>
              </div>
            )}

            {fetchResult.fetch_success && fetchResult.items.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-700">SNS投稿に使えそうな情報が見つかりませんでした。手動で入力してください。</p>
              </div>
            )}
          </div>
        )}

        {/* 反映完了 */}
        {applied && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-sm text-green-700">
            ✅ フォームに反映しました。内容を確認・修正してください。
          </div>
        )}

        {/* === 巡回登録オプション（URL入力後に表示） === */}
        {form.source_url && fetchResult?.fetch_success && !crawlDone && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700">🔄 このサイトを定期巡回に登録しますか？</p>
            <p className="text-xs text-gray-500">
              登録すると「AI情報収集」機能で自動的にこのサイトから新しい情報を収集します
            </p>
            <div className="flex gap-2 flex-wrap">
              {(['daily', 'weekly', 'manual', 'none'] as FreqOption[]).map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => setCrawlFreq(freq)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    crawlFreq === freq
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                  }`}
                >
                  {freq === 'daily' ? '📅 毎日' :
                   freq === 'weekly' ? '📆 週1回' :
                   freq === 'manual' ? '🖱️ 手動のみ' :
                   '✕ 登録しない'}
                </button>
              ))}
            </div>
            {crawlFreq !== 'none' && (
              <Button
                type="button"
                onClick={handleRegisterCrawl}
                loading={crawlRegistering}
                size="sm"
                variant="secondary"
              >
                巡回サイトとして登録する（{freqLabels[crawlFreq]}）
              </Button>
            )}
          </div>
        )}

        {crawlDone && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-sm text-blue-700">
            🔄 巡回サイトに登録しました（{freqLabels[crawlFreq]}）
          </div>
        )}

        {/* タイトル */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">タイトル <span className="text-red-500">*</span></label>
          <input
            required
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="投稿候補のタイトルを入力"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">情報元名</label>
          <input
            value={form.source_name}
            onChange={(e) => set('source_name', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="中小企業庁 など（URLから自動取得されます）"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">本文・メモ</label>
          <textarea
            value={form.raw_text}
            onChange={(e) => set('raw_text', e.target.value)}
            rows={5}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="URLを読み込むと自動入力されます。補足情報があれば追記してください"
          />
        </div>
      </div>

      {/* 分類・詳細 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h3 className="font-semibold text-gray-800">分類・詳細情報</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
            <select value={form.category} onChange={(e) => set('category', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">選択してください</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">小カテゴリ</label>
            <input value={form.sub_category} onChange={(e) => set('sub_category', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">地域</label>
            <input value={form.region} onChange={(e) => set('region', e.target.value)}
              placeholder="全国 / 北海道 / 十勝"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">対象者</label>
            <input value={form.target_audience} onChange={(e) => set('target_audience', e.target.value)}
              placeholder="中小企業・個人事業主 など"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">開催日</label>
            <input type="date" value={form.event_date} onChange={(e) => set('event_date', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">締切日</label>
            <input type="date" value={form.deadline} onChange={(e) => set('deadline', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">主催者</label>
            <input value={form.organizer} onChange={(e) => set('organizer', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">申込URL</label>
            <input type="url" value={form.application_url} onChange={(e) => set('application_url', e.target.value)}
              placeholder="https://..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
      </div>

      {/* 投稿設定 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h3 className="font-semibold text-gray-800">投稿設定</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">優先度</label>
            <select value={form.priority} onChange={(e) => set('priority', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">重要度</label>
            <select value={form.importance} onChange={(e) => set('importance', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="important">重要</option>
              <option value="normal">通常</option>
              <option value="reference">参考</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="unconfirmed">未確認</option>
              <option value="candidate">投稿候補</option>
              <option value="drafting">下書き作成中</option>
              <option value="draft_created">下書き作成済み</option>
              <option value="image_created">画像生成済み</option>
              <option value="review_waiting">掲載確認待ち</option>
              <option value="ready">投稿準備完了</option>
              <option value="scheduled">投稿予定</option>
              <option value="published">投稿済み</option>
              <option value="skipped">見送り</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">投稿予定日</label>
          <input type="date" value={form.scheduled_at} onChange={(e) => set('scheduled_at', e.target.value)}
            className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">投稿媒体</label>
          <div className="flex gap-3">
            {(['instagram', 'facebook', 'x'] as const).map((p) => (
              <label key={p} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.platforms.includes(p)} onChange={() => togglePlatform(p)} className="rounded text-indigo-600" />
                <span className="text-sm">{p === 'x' ? 'X (Twitter)' : p.charAt(0).toUpperCase() + p.slice(1)}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" loading={loading} size="lg">
          {candidateId ? '更新する' : '登録する'}
        </Button>
        <Button type="button" variant="secondary" size="lg" onClick={() => router.back()}>
          キャンセル
        </Button>
      </div>
    </form>
  )
}
