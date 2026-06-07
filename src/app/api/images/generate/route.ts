import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { type ImageTextData } from '@/lib/image/templates'
import OpenAI from 'openai'
import sharp from 'sharp'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const adminClient = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── DALL-E 3用プロンプトをGPTで生成 ───────────────────────────────
async function buildDallePrompt(title: string, category: string): Promise<string> {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: `次のSNS投稿タイトルとカテゴリに合った、Instagram背景画像のためのDALL-E 3プロンプトを英語で1文（100〜150語）で生成してください。

タイトル: ${title}
カテゴリ: ${category}

ルール:
- 写真風・リアルなビジュアル
- 北海道・十勝・帯広の地域感があれば尚良い
- テキストなし・人物の顔なし
- ドラマチックな照明・映画的
- SNS映えする美しい構図
- 補助金・支援制度系: ビジネス・オフィス・農業風景・自然
- イベント・セミナー系: 会場・人が集まる空間・光のボケ
- LAND系: 帯広の風景・コワーキングスペース・スタートアップ
- 事業者紹介系: 店舗・作業場・製品・人物（後ろ姿OK）
- お知らせ系: 抽象的・グラフィック・グラデーション

プロンプトのみ返答してください。説明不要。`,
    }],
    temperature: 0.8,
    max_tokens: 200,
  })
  return res.choices[0].message.content?.trim() ||
    'Beautiful Hokkaido landscape with dramatic sky, cinematic lighting, no text, photorealistic'
}

// ─── タイトルオーバーレイSVG（透明背景）──────────────────────────────
function generateOverlaySvg(title: string, accentColor: string): string {
  const lines = wrapJa(title, 8)
  const n = lines.length
  const fs = n === 1 ? 118 : n === 2 ? 100 : n === 3 ? 84 : 72
  const lh = fs * 1.25
  const startY = Math.round(540 - (n * lh) / 2 + fs * 0.15)

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
<defs>
  <!-- 下部ダークグラデーション（テキスト可読性） -->
  <linearGradient id="dark" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stop-color="rgba(0,0,0,0.0)"/>
    <stop offset="30%"  stop-color="rgba(0,0,0,0.30)"/>
    <stop offset="100%" stop-color="rgba(0,0,0,0.72)"/>
  </linearGradient>
  <!-- テキストシャドウ -->
  <filter id="ts" x="-8%" y="-20%" width="116%" height="140%">
    <feDropShadow dx="0" dy="3" stdDeviation="10" flood-color="rgba(0,0,0,0.9)"/>
  </filter>
  <!-- アクセントグラデーション -->
  <linearGradient id="acc" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%"   stop-color="${accentColor}"/>
    <stop offset="100%" stop-color="${accentColor}88"/>
  </linearGradient>
</defs>

<!-- ダークグラデーションオーバーレイ -->
<rect width="1080" height="1080" fill="url(#dark)"/>

<!-- タイトルテキスト -->
${lines.map((line, i) => `<text
  x="540" y="${startY + i * lh}"
  font-family="'Noto Sans JP','Hiragino Kaku Gothic ProN','Yu Gothic Bold',sans-serif"
  font-size="${fs}" font-weight="900"
  fill="white" text-anchor="middle" letter-spacing="4"
  filter="url(#ts)">${esc(line)}</text>`).join('\n')}

<!-- アクセントライン（タイトル直下） -->
<rect x="${540 - 44}" y="${startY + n * lh + 10}"
  width="88" height="4" rx="2" fill="url(#acc)"/>

<!-- LAND（左上、最小限） -->
<text x="44" y="54"
  font-family="Arial,sans-serif"
  font-size="20" font-weight="900" letter-spacing="5"
  fill="white" opacity="0.55"
  filter="url(#ts)">LAND</text>

<!-- @land.tokachi（右下、最小限） -->
<text x="1036" y="1055"
  font-family="Arial,sans-serif"
  font-size="17" fill="white" text-anchor="end" opacity="0.50"
  filter="url(#ts)">@land.tokachi</text>
</svg>`
}

// カテゴリ別アクセントカラー
function getAccentColor(category: string, templateType: string): string {
  if (templateType === 'subsidy' || category?.includes('補助金')) return '#6ee7b7'
  if (templateType === 'event' || category?.includes('イベント')) return '#c7d2fe'
  if (templateType === 'land' || category?.includes('LAND')) return '#fde68a'
  if (templateType === 'business' || category?.includes('事業者')) return '#ddd6fe'
  return '#bae6fd'
}

function wrapJa(text: string, max: number): string[] {
  const out: string[] = []
  let cur = ''
  for (const ch of text) {
    cur += ch
    if (cur.length >= max) { out.push(cur); cur = '' }
  }
  if (cur) out.push(cur)
  return out
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

// ─── メインハンドラー ────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { candidate_id, template_type, image_data } = body as {
      candidate_id: string
      template_type: string
      image_data: ImageTextData
    }

    const title = image_data.title
    const category = image_data.category || ''
    const timestamp = Date.now()
    const accent = getAccentColor(category, template_type)

    // ── STEP 1: DALL-E 3で背景画像を生成 ──
    let bgBuffer: Buffer | null = null
    let dallePrompt = ''
    try {
      dallePrompt = await buildDallePrompt(title, category)
      console.log('DALL-E prompt:', dallePrompt)

      const dalleRes = await openai.images.generate({
        model: 'dall-e-3',
        prompt: dallePrompt + ', no text, no letters, no watermark',
        size: '1024x1024',
        quality: 'standard',
        n: 1,
      })

      const dalleUrl = dalleRes.data[0]?.url
      if (dalleUrl) {
        const imgRes = await fetch(dalleUrl, { signal: AbortSignal.timeout(30000) })
        const arrayBuf = await imgRes.arrayBuffer()
        bgBuffer = Buffer.from(arrayBuf)
      }
    } catch (dalleErr) {
      console.warn('DALL-E generation failed, using SVG fallback:', dalleErr)
    }

    // ── STEP 2: テキストオーバーレイSVGを生成 ──
    const overlaySvg = generateOverlaySvg(title, accent)

    // ── STEP 3: sharp で合成 → PNG 1080x1080 ──
    let pngBuffer: Buffer
    let svgFallback = ''

    if (bgBuffer) {
      // DALL-E背景 + テキストオーバーレイを合成
      pngBuffer = await sharp(bgBuffer)
        .resize(1080, 1080, { fit: 'cover', position: 'center' })
        .composite([
          { input: Buffer.from(overlaySvg), blend: 'over' }
        ])
        .png()
        .toBuffer()
    } else {
      // フォールバック: SVGのみ（グラデーション背景）
      const { generateSvgTemplate } = await import('@/lib/image/templates')
      svgFallback = generateSvgTemplate({ ...image_data, template_type })
      pngBuffer = await sharp(Buffer.from(svgFallback))
        .resize(1080, 1080)
        .png()
        .toBuffer()
    }

    // ── STEP 4: PNGをSupabase Storageにアップロード ──
    const pngFileName = `${candidate_id}/${template_type}_${timestamp}.png`
    const { error: pngErr } = await adminClient.storage
      .from('generated-images')
      .upload(pngFileName, pngBuffer, { contentType: 'image/png', upsert: true })
    if (pngErr) throw pngErr

    const { data: pngUrlData } = adminClient.storage
      .from('generated-images')
      .getPublicUrl(pngFileName)
    const pngUrl = pngUrlData.publicUrl

    // フォールバックSVGもアップロード（プレビュー用）
    let svgUrl = pngUrl
    if (svgFallback) {
      const svgFileName = `${candidate_id}/${template_type}_${timestamp}.svg`
      await adminClient.storage
        .from('generated-images')
        .upload(svgFileName, Buffer.from(svgFallback), { contentType: 'image/svg+xml', upsert: true })
      const { data: svgUrlData } = adminClient.storage
        .from('generated-images')
        .getPublicUrl(svgFileName)
      svgUrl = svgUrlData.publicUrl
    }

    // ── STEP 5: DBに保存 ──
    const { data: imageRecord } = await supabase
      .from('generated_images')
      .insert({
        post_candidate_id: candidate_id,
        template_type,
        image_size: '1080x1080',
        image_url: svgUrl,
        png_url: pngUrl,
        image_text_json: { ...image_data, dalle_prompt: dallePrompt },
      })
      .select()
      .single()

    await supabase
      .from('post_candidates')
      .update({ status: 'image_created' })
      .eq('id', candidate_id)

    // プレビュー用SVG（テキストオーバーレイのみ返す）
    return NextResponse.json({
      image_url: svgUrl,
      png_url: pngUrl,
      image_id: imageRecord?.id,
      svg: overlaySvg,
      dalle_used: !!bgBuffer,
      dalle_prompt: dallePrompt,
    })

  } catch (error) {
    console.error('Image generation error:', error)
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 })
  }
}
