'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { TEMPLATE_TYPES } from '@/lib/constants'
import type { PostCandidate, GeneratedImage } from '@/types'

interface Props {
  candidate: PostCandidate
  initialImages: GeneratedImage[]
  socialPost?: { image_title?: string | null; image_subtitle?: string | null } | null
}

export function ImageGenerator({ candidate, initialImages, socialPost }: Props) {
  const router = useRouter()
  const [images, setImages] = useState<GeneratedImage[]>(initialImages)
  const [generating, setGenerating] = useState(false)
  const [previewSvg, setPreviewSvg] = useState<string | null>(null)
  const [templateType, setTemplateType] = useState(
    candidate.category?.includes('補助金') ? 'subsidy'
    : candidate.category?.includes('イベント') ? 'event'
    : candidate.category?.includes('LAND') ? 'land'
    : candidate.category?.includes('事業者') ? 'business'
    : 'notice'
  )
  const [imageTitle, setImageTitle] = useState(socialPost?.image_title || candidate.title.slice(0, 30))
  const [imageSubtitle, setImageSubtitle] = useState(socialPost?.image_subtitle || '')

  async function handleGenerate() {
    setGenerating(true)
    const res = await fetch('/api/images/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate_id: candidate.id,
        template_type: templateType,
        image_data: {
          title: imageTitle,
          subtitle: imageSubtitle,
          category: candidate.category || '',
          date: candidate.deadline || candidate.event_date || '',
          target_audience: candidate.target_audience || '',
          organizer: candidate.organizer || '',
          url: candidate.application_url || candidate.source_url || '',
          template_type: templateType,
        },
      }),
    })
    const data = await res.json()
    if (data.svg) setPreviewSvg(data.svg)

    // Refresh images
    const supabase = (await import('@/lib/supabase/client')).createClient()
    const { data: refreshed } = await supabase
      .from('generated_images')
      .select('*')
      .eq('post_candidate_id', candidate.id)
      .order('created_at', { ascending: false })
    if (refreshed) setImages(refreshed)
    setGenerating(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">{candidate.title}</h2>
        <p className="text-sm text-gray-500">Instagram用投稿画像（1080×1080px）を生成します</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">テンプレート設定</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">テンプレート種類</label>
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setTemplateType(t.value)}
                className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                  templateType === t.value
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">画像タイトル（30文字以内）</label>
            <input
              value={imageTitle}
              onChange={(e) => setImageTitle(e.target.value)}
              maxLength={30}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">サブタイトル（40文字以内）</label>
            <input
              value={imageSubtitle}
              onChange={(e) => setImageSubtitle(e.target.value)}
              maxLength={40}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
          <p>📅 締切/開催日: {candidate.deadline || candidate.event_date || '未設定'}</p>
          <p>👥 対象者: {candidate.target_audience || '未設定'}</p>
          <p>🏢 主催者: {candidate.organizer || '未設定'}</p>
        </div>

        <Button onClick={handleGenerate} loading={generating} size="lg">
          🎨 画像を生成する
        </Button>
      </div>

      {/* Preview */}
      {previewSvg && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">プレビュー</h3>
          <div
            className="w-full max-w-sm mx-auto rounded-lg overflow-hidden border"
            dangerouslySetInnerHTML={{ __html: previewSvg.replace(/width="1080" height="1080"/, 'width="100%" height="100%" viewBox="0 0 1080 1080"') }}
          />
        </div>
      )}

      {/* Past images */}
      {images.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">生成済み画像</h3>
          <div className="grid grid-cols-2 gap-4">
            {images.map((img) => (
              <div key={img.id} className="border border-gray-100 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-2">{img.template_type} / {img.created_at.slice(0, 10)}</p>
                {img.image_url && (
                  <a href={img.image_url} target="_blank" rel="noopener" className="block">
                    <img src={img.image_url} alt="" className="w-full rounded hover:opacity-90 transition-opacity" />
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
