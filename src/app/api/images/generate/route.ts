import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { generateSvgTemplate, type ImageTextData } from '@/lib/image/templates'
import sharp from 'sharp'
import Replicate from 'replicate'

export const maxDuration = 60

const adminClient = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── カテゴリ・タイトルから Replicate 用プロンプトを生成 ───────────
function buildReplicatePrompt(title: string, category: string, variant: number): string {
  // バリアント別スタイル指示
  const styleGuide = [
    'bold vibrant colors, professional graphic design, strong contrast',
    'clean minimal white design, elegant typography, modern layout',
    'dark premium background, gold accents, luxury feel',
    'colorful gradient background, eye-catching, trendy social media style',
    'natural earthy tones, organic feel, warm colors',
  ][variant % 5]

  // カテゴリ別背景イメージ
  let bgConcept = 'Japanese business professional setting'
  const t = title
  if (t.includes('農業') || t.includes('農') || t.includes('食') || t.includes('畜産')) {
    bgConcept = 'Hokkaido agricultural landscape, vast green fields, farm'
  } else if (t.includes('IT') || t.includes('DX') || t.includes('デジタル') || t.includes('テクノロジー')) {
    bgConcept = 'modern technology office, computers, digital workspace'
  } else if (t.includes('起業') || t.includes('創業') || t.includes('スタートアップ')) {
    bgConcept = 'startup office coworking space, entrepreneurs, modern workspace'
  } else if (t.includes('観光') || t.includes('旅行')) {
    bgConcept = 'beautiful Hokkaido scenery, nature landscape'
  } else if (t.includes('セミナー') || t.includes('イベント') || t.includes('研修')) {
    bgConcept = 'business conference hall, seminar room, professional event'
  } else if (t.includes('補助金') || t.includes('助成') || t.includes('支援')) {
    bgConcept = 'professional Japanese business meeting, documents, partnership handshake'
  } else if (t.includes('地域') || t.includes('まちづくり')) {
    bgConcept = 'Obihiro city Japan, local community, town landscape'
  } else if (category.includes('事業者')) {
    bgConcept = 'Japanese small business, shop, entrepreneur at work'
  }

  return `Instagram post background image for Japanese SNS, ${bgConcept}, ${styleGuide}, cinematic lighting, high quality photography or illustration, NO TEXT in the image, no letters, no words, 1:1 square format, professional SNS post background`
}

// ─── Replicate API で画像生成（公式SDKを使用） ─────────────────────
async function generateWithReplicate(prompt: string): Promise<string | null> {
  if (!process.env.REPLICATE_API_TOKEN) {
    console.warn('[Replicate] API token not set')
    return null
  }

  try {
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })
    console.log('[Replicate] Running flux-schnell...')

    const output = await replicate.run(
      'black-forest-labs/flux-schnell',
      {
        input: {
          prompt,
          aspect_ratio: '1:1',
          num_outputs: 1,
          output_format: 'jpg',
          output_quality: 90,
          num_inference_steps: 4,
        },
      }
    )

    console.log('[Replicate] Output:', JSON.stringify(output).slice(0, 200))

    if (Array.isArray(output) && output[0]) {
      // ReadableStream or URL string
      const first = output[0]
      if (typeof first === 'string') return first
      // FileOutput / ReadableStream → URLを取得
      if (first && typeof (first as { url?: () => Promise<URL> }).url === 'function') {
        const url = await (first as { url: () => Promise<URL> }).url()
        return url.toString()
      }
      // toString()が使える場合
      return String(first)
    }

    return null
  } catch (err) {
    console.error('[Replicate] Generate error:', err)
    return null
  }
}

// ─── 1枚生成（Replicate + テキストオーバーレイ） ──────────────────
async function generateOnePng(
  imageData: ImageTextData,
  candidateId: string,
  variant: number,
  timestamp: number
): Promise<{ png_url: string; variant: number; used_ai: boolean }> {

  const title = imageData.title
  const category = imageData.category || ''

  // Replicateで背景画像生成
  let bgBuffer: Buffer | null = null
  let usedAi = false

  const prompt = buildReplicatePrompt(title, category, variant)
  console.log(`[Image v${variant}] Replicate prompt:`, prompt.slice(0, 80))

  const imageUrl = await generateWithReplicate(prompt)
  if (imageUrl) {
    try {
      const r = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) })
      if (r.ok) {
        bgBuffer = Buffer.from(await r.arrayBuffer())
        usedAi = true
        console.log(`[Image v${variant}] Photo downloaded: ${bgBuffer.length} bytes`)
      }
    } catch (e) {
      console.warn(`[Image v${variant}] Download failed:`, e)
    }
  }

  // テキストオーバーレイSVG
  const overlaySvg = buildOverlay(imageData)

  let pngBuffer: Buffer
  if (bgBuffer) {
    pngBuffer = await sharp(bgBuffer)
      .resize(1080, 1080, { fit: 'cover', position: 'center' })
      .composite([{ input: Buffer.from(overlaySvg), blend: 'over' }])
      .png()
      .toBuffer()
  } else {
    // フォールバック: SVGグラデーション
    console.warn(`[Image v${variant}] Using SVG fallback`)
    const svg = generateSvgTemplate({ ...imageData, design_variant: variant })
    pngBuffer = await sharp(Buffer.from(svg)).resize(1080, 1080).png().toBuffer()
  }

  const fileName = `${candidateId}/v${variant}_${timestamp}.png`
  const { error } = await adminClient.storage
    .from('generated-images')
    .upload(fileName, pngBuffer, { contentType: 'image/png', upsert: true })
  if (error) throw error

  const { data } = adminClient.storage.from('generated-images').getPublicUrl(fileName)
  return { png_url: data.publicUrl, variant, used_ai: usedAi }
}

// ─── テキストオーバーレイSVG ─────────────────────────────────────
function buildOverlay(data: ImageTextData): string {
  const lines = wrapJa(data.title, 9)
  const n = lines.length
  const fs = n <= 2 ? 110 : n === 3 ? 94 : 80
  const lh = fs * 1.24
  const startY = Math.round(540 - (n * lh) / 2 + fs * 0.16)

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
<defs>
  <linearGradient id="ov1" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stop-color="rgba(0,0,0,0.35)"/>
    <stop offset="25%"  stop-color="rgba(0,0,0,0.10)"/>
    <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
  </linearGradient>
  <linearGradient id="ov2" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stop-color="rgba(0,0,0,0)"/>
    <stop offset="100%" stop-color="rgba(0,0,0,0.72)"/>
  </linearGradient>
  <linearGradient id="mid" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stop-color="rgba(0,0,0,0)"/>
    <stop offset="30%"  stop-color="rgba(0,0,0,0.52)"/>
    <stop offset="50%"  stop-color="rgba(0,0,0,0.68)"/>
    <stop offset="70%"  stop-color="rgba(0,0,0,0.52)"/>
    <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
  </linearGradient>
  <filter id="ts">
    <feDropShadow dx="0" dy="3" stdDeviation="10" flood-color="rgba(0,0,0,1)"/>
    <feDropShadow dx="0" dy="0" stdDeviation="22" flood-color="rgba(0,0,0,0.65)"/>
  </filter>
  <filter id="bs">
    <feDropShadow dx="0" dy="1" stdDeviation="5" flood-color="rgba(0,0,0,0.9)"/>
  </filter>
</defs>
<rect width="1080" height="320"  fill="url(#ov1)"/>
<rect width="1080" height="1080" fill="url(#ov2)" y="0"/>
<rect width="1080" height="${n * lh + fs * 1.4}" y="${startY - fs * 0.85}" fill="url(#mid)"/>
${lines.map((l, i) => `<text x="540" y="${startY + i * lh}"
  font-family="'Noto Sans JP','Hiragino Kaku Gothic ProN','Yu Gothic Bold',sans-serif"
  font-size="${fs}" font-weight="900" fill="white" text-anchor="middle" letter-spacing="3"
  filter="url(#ts)">${esc(l)}</text>`).join('\n')}
<rect x="${540 - 55}" y="${startY + n * lh + 14}" width="110" height="5" rx="2.5" fill="white" opacity="0.70"/>
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

// ─── メインハンドラー ─────────────────────────────────────────────
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
    const base: ImageTextData = { ...image_data, template_type, feedback }

    // フィードバックでバリアント調整
    let targets = variants
    if (feedback) {
      const f = feedback.toLowerCase()
      if (f.includes('明る') || f.includes('白') || f.includes('シンプル')) targets = [1, 0, 3]
      else if (f.includes('暗') || f.includes('黒') || f.includes('プレミアム')) targets = [2, 3, 0]
      else if (f.includes('カラフル') || f.includes('鮮やか') || f.includes('派手')) targets = [3, 0, 2]
      else if (f.includes('自然') || f.includes('緑') || f.includes('農業')) targets = [4, 2, 0]
      else if (f.includes('違う') || f.includes('別') || f.includes('変え')) targets = variants.map(v => (v + 1) % 5)
    }

    // 並行生成
    const results = await Promise.allSettled(targets.map(v => generateOnePng(base, candidate_id, v, timestamp)))
    const generated = results.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<{ png_url: string; variant: number; used_ai: boolean }>).value)

    if (!generated.length) return NextResponse.json({ error: '生成に失敗しました' }, { status: 500 })

    const main = generated[0]
    const { data: rec } = await supabase.from('generated_images').insert({
      post_candidate_id: candidate_id, template_type,
      image_size: '1080x1080', image_url: main.png_url, png_url: main.png_url,
      image_text_json: { ...base, variants: generated.map(g => ({ variant: g.variant, url: g.png_url })) },
    }).select().single()

    await supabase.from('post_candidates').update({ status: 'image_created' }).eq('id', candidate_id)

    return NextResponse.json({
      success: true,
      images: generated.map(g => ({ variant: g.variant, png_url: g.png_url, used_ai: g.used_ai })),
      image_id: rec?.id,
      count: generated.length,
    })

  } catch (e) {
    console.error('Image generation error:', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
