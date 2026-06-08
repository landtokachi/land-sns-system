import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { generateSvgTemplate, type ImageTextData } from '@/lib/image/templates'
import sharp from 'sharp'

// タイムアウトは短くてOK（ジョブ開始だけで返すため）
export const maxDuration = 10

const adminClient = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// カテゴリ・タイトルからプロンプト生成
function buildPrompt(title: string, category: string, variant: number): string {
  const styles = [
    'vibrant colors, bold graphic design, orange and yellow tones, energetic',
    'clean white minimal, elegant typography, light blue accents',
    'dark premium, gold accents, luxury professional',
    'colorful gradient, trendy, Instagram-worthy, modern',
    'natural earthy, warm tones, organic feel',
  ]
  const style = styles[variant % 5]

  let subject = 'Japanese business professional setting, office documents'
  if (title.includes('農業') || title.includes('農') || title.includes('食')) subject = 'Hokkaido agricultural landscape, green fields, farm'
  else if (title.includes('IT') || title.includes('DX') || title.includes('デジタル')) subject = 'modern technology, laptop, digital workspace, blue tones'
  else if (title.includes('起業') || title.includes('創業') || title.includes('スタートアップ')) subject = 'startup coworking space, young entrepreneurs, modern office'
  else if (title.includes('観光') || title.includes('旅行')) subject = 'beautiful Hokkaido scenery, tourism landscape'
  else if (title.includes('セミナー') || title.includes('イベント')) subject = 'business conference hall, professional seminar, presentation'
  else if (title.includes('補助金') || title.includes('助成')) subject = 'Japanese business handshake, money coins, professional documents'
  else if (title.includes('地域') || title.includes('まちづくり')) subject = 'Obihiro Japan local community, town street'
  else if (category.includes('事業者')) subject = 'Japanese entrepreneur at work, small business shop'

  return `Instagram post background, ${subject}, ${style}, cinematic lighting, high quality, no text, no letters, no watermark, square format, SNS ready`
}

// Replicateでジョブ開始（完了を待たない）
async function startReplicate(prompt: string): Promise<string | null> {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) return null

  try {
    const res = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          prompt,
          aspect_ratio: '1:1',
          num_outputs: 1,
          output_format: 'jpg',
          output_quality: 90,
          num_inference_steps: 4,
        },
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      console.error('[Replicate] Start error:', await res.text())
      return null
    }
    const data = await res.json()
    console.log('[Replicate] Job started:', data.id, 'status:', data.status)
    return data.id || null
  } catch (e) {
    console.error('[Replicate] Start failed:', e)
    return null
  }
}

// SVGフォールバック（Replicateが使えない場合）
async function generateSvgPng(imageData: ImageTextData, candidateId: string, variant: number, timestamp: number) {
  const svg = generateSvgTemplate({ ...imageData, design_variant: variant })
  const pngBuffer = await sharp(Buffer.from(svg)).resize(1080, 1080).png().toBuffer()
  const fileName = `${candidateId}/v${variant}_${timestamp}.png`
  const { error } = await adminClient.storage
    .from('generated-images')
    .upload(fileName, pngBuffer, { contentType: 'image/png', upsert: true })
  if (error) throw error
  const { data } = adminClient.storage.from('generated-images').getPublicUrl(fileName)
  return data.publicUrl
}

// テキストオーバーレイSVG
function buildOverlay(data: ImageTextData): string {
  const lines = wrapJa(data.title, 9)
  const n = lines.length
  const fs = n <= 2 ? 110 : n === 3 ? 94 : 80
  const lh = fs * 1.24
  const startY = Math.round(540 - (n * lh) / 2 + fs * 0.16)

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
<defs>
  <linearGradient id="top" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="rgba(0,0,0,0.40)"/><stop offset="100%" stop-color="rgba(0,0,0,0)"/>
  </linearGradient>
  <linearGradient id="bot" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="rgba(0,0,0,0)"/><stop offset="100%" stop-color="rgba(0,0,0,0.75)"/>
  </linearGradient>
  <linearGradient id="mid" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
    <stop offset="30%" stop-color="rgba(0,0,0,0.55)"/>
    <stop offset="50%" stop-color="rgba(0,0,0,0.70)"/>
    <stop offset="70%" stop-color="rgba(0,0,0,0.55)"/>
    <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
  </linearGradient>
  <filter id="ts">
    <feDropShadow dx="0" dy="3" stdDeviation="10" flood-color="rgba(0,0,0,1)"/>
    <feDropShadow dx="0" dy="0" stdDeviation="22" flood-color="rgba(0,0,0,0.7)"/>
  </filter>
  <filter id="bs"><feDropShadow dx="0" dy="1" stdDeviation="5" flood-color="rgba(0,0,0,0.9)"/></filter>
</defs>
<rect width="1080" height="320" fill="url(#top)"/>
<rect x="0" y="720" width="1080" height="360" fill="url(#bot)"/>
<rect width="1080" height="${n * lh + fs * 1.4}" y="${startY - fs * 0.85}" fill="url(#mid)"/>
${lines.map((l, i) => `<text x="540" y="${startY + i * lh}"
  font-family="'Noto Sans JP','Hiragino Kaku Gothic ProN','Yu Gothic Bold',sans-serif"
  font-size="${fs}" font-weight="900" fill="white" text-anchor="middle" letter-spacing="3"
  filter="url(#ts)">${esc(l)}</text>`).join('\n')}
<rect x="${540 - 55}" y="${startY + n * lh + 14}" width="110" height="5" rx="2.5" fill="white" opacity="0.75"/>
<text x="48" y="58" font-family="Arial,sans-serif" font-size="20" font-weight="900"
  letter-spacing="5" fill="white" opacity="0.65" filter="url(#bs)">LAND</text>
<text x="1032" y="1052" font-family="Arial,sans-serif" font-size="16"
  fill="white" text-anchor="end" opacity="0.55" filter="url(#bs)">@land.tokachi</text>
</svg>`
}

function wrapJa(t: string, max: number): string[] {
  const out: string[] = []; let cur = ''
  for (const ch of t) { cur += ch; if (cur.length >= max) { out.push(cur); cur = '' } }
  if (cur) out.push(cur); return out
}
function esc(s: string) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { candidate_id, template_type, image_data, variants = [0, 1, 2], feedback } = body as {
      candidate_id: string; template_type: string; image_data: ImageTextData
      variants?: number[]; feedback?: string
    }

    const timestamp = Date.now()
    const title = image_data.title
    const category = image_data.category || ''

    // フィードバックによるバリアント調整
    let targets = variants
    if (feedback) {
      const f = feedback.toLowerCase()
      if (f.includes('明る') || f.includes('白') || f.includes('シンプル')) targets = [1, 0, 3]
      else if (f.includes('暗') || f.includes('黒') || f.includes('プレミアム')) targets = [2, 3, 0]
      else if (f.includes('カラフル') || f.includes('鮮やか') || f.includes('派手')) targets = [3, 0, 2]
      else if (f.includes('自然') || f.includes('緑') || f.includes('農業')) targets = [4, 2, 0]
      else if (f.includes('違う') || f.includes('別') || f.includes('変え')) targets = variants.map(v => (v + 1) % 5)
    }

    // Replicateのジョブを3つ起動（完了を待たない）
    const jobs: Array<{ variant: number; predictionId: string | null; svgFallback: string }> = []

    for (const variant of targets) {
      const prompt = buildPrompt(title, category, variant)
      const predictionId = await startReplicate(prompt)
      // SVGフォールバックも事前生成しておく
      const svgFallbackUrl = await generateSvgPng(
        { ...image_data, template_type, design_variant: variant },
        candidate_id, variant, timestamp
      )
      jobs.push({ variant, predictionId, svgFallback: svgFallbackUrl })
    }

    // DBに仮保存（最初のSVGフォールバックをメインに）
    const main = jobs[0]
    const { data: rec } = await supabase.from('generated_images').insert({
      post_candidate_id: candidate_id,
      template_type,
      image_size: '1080x1080',
      image_url: main.svgFallback,
      png_url: main.svgFallback,
      image_text_json: {
        ...image_data,
        jobs: jobs.map(j => ({
          variant: j.variant,
          predictionId: j.predictionId,
          svgFallback: j.svgFallback,
          timestamp,
          candidateId: candidate_id,
        })),
      },
    }).select().single()

    await supabase.from('post_candidates').update({ status: 'image_created' }).eq('id', candidate_id)

    // フロントにジョブ情報を返す（ポーリング用）
    return NextResponse.json({
      success: true,
      jobs: jobs.map(j => ({
        variant: j.variant,
        predictionId: j.predictionId,
        svgFallback: j.svgFallback,
        timestamp,
        candidateId: candidate_id,
      })),
      image_id: rec?.id,
      using_ai: jobs.some(j => j.predictionId !== null),
    })

  } catch (e) {
    console.error('Image generation error:', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
