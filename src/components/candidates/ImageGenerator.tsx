'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { TEMPLATE_TYPES } from '@/lib/constants'
import type { PostCandidate, GeneratedImage } from '@/types'

interface GeneratedItem {
  variant: number
  png_url: string
  svg: string
}

interface Props {
  candidate: PostCandidate
  initialImages: GeneratedImage[]
  socialPost?: { image_title?: string | null; image_subtitle?: string | null } | null
}

const VARIANT_NAMES = ['ボールド', 'ミニマル', 'ダーク', 'ビビッド', 'ナチュラル']
const VARIANT_DESC = [
  '力強い・存在感',
  '清潔・シンプル',
  'プレミアム感',
  'SNS映え・鮮やか',
  '自然・地域感',
]

export function ImageGenerator({ candidate, initialImages, socialPost }: Props) {
  const router = useRouter()
  const [images, setImages] = useState<GeneratedImage[]>(initialImages)
  const [generating, setGenerating] = useState(false)
  const [generatedItems, setGeneratedItems] = useState<GeneratedItem[]>([])
  const [feedback, setFeedback] = useState('')
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null)
  const [templateType, setTemplateType] = useState(
    candidate.category?.includes('補助金') || candidate.category?.includes('助成') ? 'subsidy'
    : candidate.category?.includes('イベント') || candidate.category?.includes('セミナー') ? 'event'
    : candidate.category?.includes('LAND') || candidate.category?.includes('とかち財団') ? 'land'
    : candidate.category?.includes('事業者') || candidate.category?.includes('採択') ? 'business'
    : 'notice'
  )
  const [imageTitle, setImageTitle] = useState(socialPost?.image_title || candidate.title)

  async function handleGenerate(variantList?: number[]) {
    setGenerating(true)
    setGeneratedItems([])

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
      if (data.images) {
        setGeneratedItems(data.images)
      }

      // 生成済み画像リストを更新
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const { data: refreshed } = await supabase
        .from('generated_images')
        .select('*')
        .eq('post_candidate_id', candidate.id)
        .order('created_at', { ascending: false })
      if (refreshed) setImages(refreshed)
      router.refresh()
    } catch (err) {
      console.error(err)
    } finally {
      setGenerating(false)
    }
  }

  // フィードバックを送って再生成
  async function handleFeedbackRegenerate() {
    if (!feedback.trim()) return
    await handleGenerate()
    setFeedback('')
  }

  return (
    <div className="space-y-5">
      {/* タイトル */}
      <div>
        <h2 className="text-sm font-bold text-slate-900">{candidate.title}</h2>
        <p className="text-xs text-slate-500 mt-0.5">SNS投稿用画像（1080×1080px）を3種類同時生成します</p>
      </div>

      {/* 設定 */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-800">設定</h3>

        {/* テンプレート */}
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

        {/* タイトル */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">
            画像に表示するタイトル
          </label>
          <input value={imageTitle} onChange={e => setImageTitle(e.target.value)}
            className="w-full px-3 py-2.5 text-sm" maxLength={40}/>
          <p className="text-xs text-slate-400 mt-1">長い場合は自動で折り返し。短くインパクトある表現が効果的です</p>
        </div>

        {/* 生成ボタン */}
        <Button onClick={() => handleGenerate()} loading={generating} size="lg">
          🎨 3種類のデザインを同時生成
        </Button>
      </div>

      {/* 生成結果 - 3枚横並び */}
      {generatedItems.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">
            生成結果 — {generatedItems.length}種類
            <span className="text-xs text-slate-400 font-normal ml-2">気に入った画像のPNGをダウンロードしてください</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {generatedItems.map(item => (
              <div key={item.variant}
                className={`rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                  selectedVariant === item.variant
                    ? 'border-indigo-500 shadow-lg shadow-indigo-100'
                    : 'border-slate-200 hover:border-indigo-300'
                }`}
                onClick={() => setSelectedVariant(item.variant)}>
                {/* デザイン名 */}
                <div className="px-3 py-2 bg-slate-50 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-700">
                      {VARIANT_NAMES[item.variant]}
                    </span>
                    <span className="text-xs text-slate-400 ml-2">
                      {VARIANT_DESC[item.variant]}
                    </span>
                  </div>
                  {selectedVariant === item.variant && (
                    <span className="text-xs font-semibold text-indigo-600">✓ 選択中</span>
                  )}
                </div>

                {/* 画像プレビュー */}
                <img src={item.png_url} alt={`デザイン${item.variant + 1}`}
                  className="w-full aspect-square object-cover"/>

                {/* ダウンロード */}
                <div className="px-3 py-2 bg-white border-t border-slate-100">
                  <a href={item.png_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                    onClick={e => e.stopPropagation()}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                    </svg>
                    PNG保存（SNS投稿用）
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* フィードバック再生成 */}
          <div className="mt-5 pt-5 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-600 mb-2">
              💬 気に入らない場合は、どんな感じにしたいか教えてください
            </p>
            <div className="flex gap-2">
              <input
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFeedbackRegenerate()}
                placeholder="例: もっと明るく・暗くしたい・シンプルにして・カラフルにして・違うデザインに など"
                className="flex-1 px-3 py-2.5 text-sm"/>
              <button
                onClick={handleFeedbackRegenerate}
                disabled={!feedback.trim() || generating}
                className="btn-glow px-4 py-2 rounded-lg text-sm font-semibold flex-shrink-0 disabled:opacity-50">
                {generating ? '生成中...' : '↺ 再生成'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {['明るく・白系に', '暗くてプレミアムに', 'カラフルに', 'シンプルに', '別のデザインに'].map(hint => (
                <button key={hint}
                  onClick={() => { setFeedback(hint); }}
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
                <div className="px-2 py-1.5 bg-slate-50 flex items-center justify-between">
                  <span className="text-xs text-slate-400">{img.template_type}</span>
                  <span className="text-xs text-slate-400">{img.created_at.slice(0, 10)}</span>
                </div>
                {(img as GeneratedImage & { png_url?: string }).png_url ? (
                  <a href={(img as GeneratedImage & { png_url?: string }).png_url}
                    target="_blank" rel="noopener noreferrer">
                    <img
                      src={(img as GeneratedImage & { png_url?: string }).png_url || img.image_url || ''}
                      alt=""
                      className="w-full aspect-square object-cover hover:opacity-90 transition-opacity"/>
                  </a>
                ) : img.image_url ? (
                  <a href={img.image_url} target="_blank" rel="noopener noreferrer">
                    <img src={img.image_url} alt="" className="w-full"/>
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
