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
    candidate.category?.includes('補助金') || candidate.category?.includes('助成') ? 'subsidy'
    : candidate.category?.includes('イベント') || candidate.category?.includes('セミナー') ? 'event'
    : candidate.category?.includes('LAND') || candidate.category?.includes('とかち財団') || candidate.category?.includes('活動') ? 'land'
    : candidate.category?.includes('事業者') || candidate.category?.includes('採択') ? 'business'
    : 'notice'
  )
  // タイトル: 候補タイトルそのままを使う（画像テンプレートが折り返すため長くてOK）
  const [imageTitle, setImageTitle] = useState(socialPost?.image_title || candidate.title)
  // サブ: AI生成のimage_subtitleか、要約の先頭
  const [imageSubtitle, setImageSubtitle] = useState(
    socialPost?.image_subtitle || candidate.ai_summary?.slice(0, 44) || ''
  )

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
          date: candidate.event_date || '',
          deadline: candidate.deadline || '',
          amount: '', // 将来拡張用
          target_audience: candidate.target_audience || '',
          organizer: candidate.organizer || '',
          url: candidate.application_url || candidate.source_url || '',
          template_type: templateType,
        },
      }),
    })
    const data = await res.json()
    if (data.svg) setPreviewSvg(data.svg)

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
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-bold" style={{color:'#e2e8f0'}}>{candidate.title}</h2>
        <p className="text-xs mt-0.5" style={{color:'#4a3a6a'}}>SNS投稿用画像（1080×1080px）を生成</p>
      </div>

      {/* Settings */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-white">テンプレート・テキスト設定</h3>

        {/* Template selector */}
        <div>
          <label className="block text-xs font-semibold mb-2" style={{color:'#7c6fa8'}}>テンプレート種類</label>
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_TYPES.map((t) => (
              <button key={t.value} onClick={() => setTemplateType(t.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={templateType === t.value
                  ? { background: 'linear-gradient(135deg, #7c3aed, #6366f1)', color: 'white', boxShadow: '0 4px 12px rgba(124,58,237,0.4)' }
                  : { background: 'rgba(255,255,255,0.06)', color: '#7c6fa8', border: '1px solid rgba(255,255,255,0.08)' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{color:'#7c6fa8'}}>
            画像タイトル（そのまま大きく表示されます）
          </label>
          <input value={imageTitle} onChange={e => setImageTitle(e.target.value)}
            className="w-full px-3 py-2.5 text-sm rounded-xl" maxLength={40}/>
          <p className="text-xs mt-1" style={{color:'#3a2a5a'}}>※ 長い場合は自動で折り返し。短く・インパクトある表現が効果的</p>
        </div>

        {/* Subtitle */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{color:'#7c6fa8'}}>
            サブテキスト（タイトル下に小さく表示）
          </label>
          <input value={imageSubtitle} onChange={e => setImageSubtitle(e.target.value)}
            className="w-full px-3 py-2.5 text-sm rounded-xl" maxLength={44} placeholder="例: 最大〇〇万円補助 / 4月10日 無料参加"/>
        </div>

        {/* Info chips */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { icon: '📅', label: '締切/開催日', value: candidate.deadline || candidate.event_date },
            { icon: '👥', label: '対象者', value: candidate.target_audience },
            { icon: '🏢', label: '主催者', value: candidate.organizer },
            { icon: '🔗', label: '情報源', value: candidate.source_name },
          ].map(item => item.value && (
            <div key={item.label} className="px-3 py-2 rounded-xl"
              style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)'}}>
              <span style={{color:'#7c6fa8'}}>{item.icon} {item.label}: </span>
              <span className="text-white">{item.value}</span>
            </div>
          ))}
        </div>

        <Button onClick={handleGenerate} loading={generating} size="lg">
          🎨 画像を生成する
        </Button>
      </div>

      {/* Preview */}
      {previewSvg && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-bold text-white mb-4">プレビュー</h3>
          <div className="w-full max-w-xs mx-auto rounded-2xl overflow-hidden shadow-2xl"
            style={{boxShadow:'0 12px 40px rgba(0,0,0,0.5)'}}>
            <div dangerouslySetInnerHTML={{
              __html: previewSvg.replace(
                /width="1080" height="1080"/,
                'width="100%" height="100%" viewBox="0 0 1080 1080"'
              )
            }} />
          </div>
          <p className="text-xs text-center mt-3" style={{color:'#4a3a6a'}}>
            ※ 実際の画像は1080×1080pxで保存されます
          </p>
        </div>
      )}

      {/* Past images */}
      {images.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-bold text-white mb-4">生成済み画像</h3>
          <div className="grid grid-cols-2 gap-4">
            {images.map((img) => (
              <div key={img.id} className="rounded-xl overflow-hidden"
                style={{border:'1px solid rgba(255,255,255,0.08)'}}>
                <div className="px-3 py-2 text-xs flex items-center justify-between"
                  style={{background:'rgba(255,255,255,0.04)', color:'#4a3a6a'}}>
                  <span>{img.template_type}</span>
                  <span>{img.created_at.slice(0, 10)}</span>
                </div>
                {img.image_url && (
                  <a href={img.image_url} target="_blank" rel="noopener noreferrer">
                    <img src={img.image_url} alt="" className="w-full hover:opacity-90 transition-opacity"/>
                  </a>
                )}
                {(img as GeneratedImage & {png_url?: string}).png_url && (
                  <a href={(img as GeneratedImage & {png_url?: string}).png_url}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-2 text-xs font-semibold transition-all hover:bg-white/10"
                    style={{color:'#a78bfa'}}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                    </svg>
                    PNG保存（SNS投稿用）
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
