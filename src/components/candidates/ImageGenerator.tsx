'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { TEMPLATE_TYPES } from '@/lib/constants'
import type { PostCandidate, GeneratedImage } from '@/types'

interface JobInfo {
  variant: number
  predictionId: string | null
  svgFallback: string
  timestamp: number
  candidateId: string
}

interface ImageResult {
  variant: number
  png_url: string
  is_ai: boolean
}

const VARIANT_NAMES = ['ボールド', 'ミニマル', 'ダーク', 'ビビッド', 'ナチュラル']
const VARIANT_DESC = ['力強い・存在感', '清潔・シンプル', 'プレミアム感', 'SNS映え・鮮やか', '自然・地域感']

interface Props {
  candidate: PostCandidate
  initialImages: GeneratedImage[]
  socialPost?: { image_title?: string | null; image_subtitle?: string | null } | null
}

export function ImageGenerator({ candidate, initialImages, socialPost }: Props) {
  const router = useRouter()
  const [images, setImages] = useState<GeneratedImage[]>(initialImages)
  const [generating, setGenerating] = useState(false)
  const [results, setResults] = useState<ImageResult[]>([])
  const [jobs, setJobs] = useState<JobInfo[]>([])
  const [polling, setPolling] = useState(false)
  const [pollCount, setPollCount] = useState(0)
  const [feedback, setFeedback] = useState('')
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [templateType, setTemplateType] = useState(
    candidate.category?.includes('補助金') || candidate.category?.includes('助成') ? 'subsidy'
    : candidate.category?.includes('イベント') || candidate.category?.includes('セミナー') ? 'event'
    : candidate.category?.includes('LAND') || candidate.category?.includes('とかち財団') ? 'land'
    : candidate.category?.includes('事業者') || candidate.category?.includes('採択') ? 'business'
    : 'notice'
  )
  const [imageTitle, setImageTitle] = useState(socialPost?.image_title || candidate.title)

  // ポーリング: Replicateの完成を確認→完成したら合成API呼び出し
  useEffect(() => {
    if (jobs.length === 0 || !polling) return

    const pendingJobs = jobs.filter(j => j.predictionId && !results.find(r => r.variant === j.variant && r.is_ai))

    if (pendingJobs.length === 0) {
      setPolling(false)
      return
    }

    pollingRef.current = setInterval(async () => {
      setPollCount(c => c + 1)

      for (const job of pendingJobs) {
        if (!job.predictionId) continue
        // ステータス確認
        try {
          const statusRes = await fetch(`/api/images/status?id=${job.predictionId}`)
          const statusData = await statusRes.json()

          if (statusData.status === 'succeeded') {
            // 完成→合成処理
            const finalRes = await fetch('/api/images/finalize', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                predictionId: job.predictionId,
                variant: job.variant,
                candidateId: job.candidateId,
                timestamp: job.timestamp,
                title: imageTitle,
              }),
            })
            const finalData = await finalRes.json()
            if (finalData.status === 'done' && finalData.png_url) {
              setResults(prev => [
                ...prev.filter(r => !(r.variant === job.variant && r.is_ai)),
                { variant: job.variant, png_url: finalData.png_url, is_ai: true },
              ])
            }
          } else if (statusData.status === 'failed') {
            // 失敗→SVGフォールバックはすでに表示済み
            console.warn(`[Polling] Job v${job.variant} failed`)
          }
        } catch (e) {
          console.warn('[Polling] Error:', e)
        }
      }

      // 60秒後に諦める
      if (pollCount > 20) {
        setPolling(false)
        if (pollingRef.current) clearInterval(pollingRef.current)
      }
    }, 3000)

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, polling, pollCount])

  // ポーリング完了チェック
  useEffect(() => {
    if (!polling) return
    const aiCount = results.filter(r => r.is_ai).length
    if (jobs.length > 0 && aiCount >= jobs.filter(j => j.predictionId).length) {
      setPolling(false)
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [results, jobs, polling])

  async function handleGenerate(variantList?: number[]) {
    setGenerating(true)
    setResults([])
    setJobs([])
    setPollCount(0)
    if (pollingRef.current) clearInterval(pollingRef.current)

    try {
      const res = await fetch('/api/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_id: candidate.id,
          template_type: templateType,
          image_data: {
            title: imageTitle,
            subtitle: '',
            category: candidate.category || '',
            date: candidate.event_date || '',
            deadline: candidate.deadline || '',
            target_audience: candidate.target_audience || '',
            organizer: candidate.organizer || '',
            template_type: templateType,
          },
          variants: variantList || [0, 1, 2],
          feedback: feedback || undefined,
        }),
      })
      const data = await res.json()

      if (data.jobs) {
        const jobList: JobInfo[] = data.jobs
        setJobs(jobList)

        // SVGフォールバックをまず表示
        const svgResults: ImageResult[] = jobList.map(j => ({
          variant: j.variant,
          png_url: j.svgFallback,
          is_ai: false,
        }))
        setResults(svgResults)

        // AIジョブがあればポーリング開始
        if (data.using_ai) {
          setPolling(true)
        }
      }

      // 生成済み画像リストを更新
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const { data: refreshed } = await supabase
        .from('generated_images').select('*')
        .eq('post_candidate_id', candidate.id)
        .order('created_at', { ascending: false })
      if (refreshed) setImages(refreshed)
      router.refresh()
    } catch (e) {
      console.error(e)
    } finally {
      setGenerating(false)
    }
  }

  async function handleFeedbackRegenerate() {
    if (!feedback.trim()) return
    await handleGenerate()
    setFeedback('')
  }

  const aiCount = results.filter(r => r.is_ai).length
  const totalAiJobs = jobs.filter(j => j.predictionId).length

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-bold text-slate-900">{candidate.title}</h2>
        <p className="text-xs text-slate-500 mt-0.5">SNS投稿用画像（1080×1080px）を3種類同時生成</p>
      </div>

      {/* 設定 */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-800">設定</h3>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-2">テンプレート種類</label>
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_TYPES.map(t => (
              <button key={t.value} onClick={() => setTemplateType(t.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={templateType === t.value
                  ? { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white' }
                  : { background: '#f1f5f9', color: '#64748b' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">画像に表示するタイトル</label>
          <input value={imageTitle} onChange={e => setImageTitle(e.target.value)}
            className="w-full px-3 py-2.5 text-sm" maxLength={40}/>
          <p className="text-xs text-slate-400 mt-1">短くインパクトある表現が効果的です</p>
        </div>
        <Button onClick={() => handleGenerate()} loading={generating} size="lg">
          🎨 3種類のデザインを同時生成
        </Button>
      </div>

      {/* 生成結果 */}
      {results.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800">
              生成結果 — {results.length}種類
            </h3>
            {polling && (
              <div className="flex items-center gap-2 text-xs text-indigo-600">
                <div className="w-3 h-3 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"/>
                AI画像を生成中... ({aiCount}/{totalAiJobs} 完了)
              </div>
            )}
            {!polling && totalAiJobs > 0 && aiCount === totalAiJobs && (
              <span className="text-xs text-green-600 font-semibold">✅ AI画像生成完了</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {results.map(item => (
              <div key={`${item.variant}-${item.is_ai}`}
                className="rounded-xl overflow-hidden border-2 border-slate-200 transition-all hover:border-indigo-300">
                <div className="px-3 py-2 bg-slate-50 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-700">{VARIANT_NAMES[item.variant]}</span>
                    <span className="text-xs text-slate-400 ml-2">{VARIANT_DESC[item.variant]}</span>
                  </div>
                  {item.is_ai
                    ? <span className="text-xs font-semibold text-indigo-600">✨ AI写真</span>
                    : polling && jobs.find(j => j.variant === item.variant)?.predictionId
                    ? <span className="text-xs text-amber-500">⏳ 生成中...</span>
                    : null
                  }
                </div>
                <img src={item.png_url} alt={`デザイン${item.variant + 1}`}
                  className="w-full aspect-square object-cover"/>
                <div className="px-3 py-2 bg-white border-t border-slate-100">
                  <a href={item.png_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                    </svg>
                    PNG保存（SNS投稿用）
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* フィードバック */}
          <div className="mt-5 pt-5 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-600 mb-2">
              💬 気に入らない場合は、どんな感じにしたいか教えてください
            </p>
            <div className="flex gap-2">
              <input value={feedback} onChange={e => setFeedback(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFeedbackRegenerate()}
                placeholder="例: もっと明るく・暗くしたい・カラフルに・違うデザインに"
                className="flex-1 px-3 py-2.5 text-sm"/>
              <button onClick={handleFeedbackRegenerate}
                disabled={!feedback.trim() || generating}
                className="btn-glow px-4 py-2 rounded-lg text-sm font-semibold flex-shrink-0 disabled:opacity-50">
                {generating ? '生成中...' : '↺ 再生成'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {['明るく・白系に', '暗くてプレミアムに', 'カラフルに', 'シンプルに', '別のデザインに'].map(hint => (
                <button key={hint} onClick={() => setFeedback(hint)}
                  className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                  {hint}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 過去の生成済み画像 */}
      {images.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">過去に生成した画像</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map(img => (
              <div key={img.id} className="rounded-xl overflow-hidden border border-slate-200">
                <div className="px-2 py-1.5 bg-slate-50 flex justify-between">
                  <span className="text-xs text-slate-400">{img.template_type}</span>
                  <span className="text-xs text-slate-400">{img.created_at.slice(0, 10)}</span>
                </div>
                {(img as GeneratedImage & { png_url?: string }).png_url && (
                  <a href={(img as GeneratedImage & { png_url?: string }).png_url}
                    target="_blank" rel="noopener noreferrer">
                    <img src={(img as GeneratedImage & { png_url?: string }).png_url || ''}
                      alt="" className="w-full aspect-square object-cover hover:opacity-90 transition-opacity"/>
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
