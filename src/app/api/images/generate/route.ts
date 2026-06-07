import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { type ImageTextData } from '@/lib/image/templates'
import OpenAI from 'openai'
import sharp from 'sharp'

// Vercel Hobby: 60秒まで延長（DALL-E生成に必要）
export const maxDuration = 60

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
      content: `You are a visual designer for a Japanese startup support facility "LAND" in Obihiro, Hokkaido.
Create a DALL-E 3 image generation prompt in English for an Instagram post background image.

Post title (Japanese): ${title}
Category: ${category}

Requirements:
- The image must have STRONG VISUAL SUBJECT directly related to the title topic
- Include realistic photo OR vivid illustration with relevant objects/people/scenes
- Examples by category:
  * 補助金・助成金: Japanese businesspeople reviewing documents, stacks of coins/banknotes, professional office with plants, hands holding a contract, calculator and graphs
  * イベント・セミナー: Conference hall with audience, presentation stage with spotlight, people networking at a business event, seminar room with participants
  * LAND・コワーキング: Modern coworking space interior, entrepreneurs working at laptops, startup team brainstorming, Obihiro Hokkaido cityscape
  * 事業者紹介: Artisan working in workshop, chef in restaurant kitchen, farmer in Hokkaido field, entrepreneur at their business
  * 採択者・学生起業: Young students presenting ideas, pitch competition stage, university students working together
  * 農業・食: Vast Hokkaido agricultural fields, fresh vegetables/livestock, food processing, farmers
  * 技能・訓練: Skilled craftsperson working, training workshop, hands-on technical work
  * 地域・まちづくり: Obihiro city street, local community gathering, town development scene

Style: cinematic photography or vivid illustration, dramatic lighting, rich colors, professional quality
CRITICAL: No text, no letters, no watermarks anywhere in the image
Faces can be shown but blurred/from behind is preferred
Make it visually rich and interesting - NOT just abstract gradients

Return ONLY the prompt text, nothing else.`,
    }],
    temperature: 0.9,
    max_tokens: 250,
  })
  return res.choices[0].message.content?.trim() ||
    'Japanese business professionals in a modern Hokkaido office, dramatic cinematic lighting, rich colors, no text'
}

// ─── タイトルオーバーレイSVG（背景が見えつつ文字も読める）─────────────
function generateOverlaySvg(title: string, accentColor: string): string {
  const lines = wrapJa(title, 8)
  const n = lines.length
  const fs = n === 1 ? 118 : n === 2 ? 100 : n === 3 ? 84 : 72
  const lh = fs * 1.25
  const startY = Math.round(540 - (n * lh) / 2 + fs * 0.15)

  // テキスト背景ブロックの位置・サイズ
  const blockTop = startY - fs * 0.85
  const blockH = n * lh + fs * 0.6

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
<defs>
  <!-- 全体の軽いダークベール（背景を少し落ち着かせる） -->
  <linearGradient id="veil" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stop-color="rgba(0,0,0,0.12)"/>
    <stop offset="40%"  stop-color="rgba(0,0,0,0.20)"/>
    <stop offset="70%"  stop-color="rgba(0,0,0,0.38)"/>
    <stop offset="100%" stop-color="rgba(0,0,0,0.55)"/>
  </linearGradient>
  <!-- テキスト背後のブロック（半透明の暗い帯） -->
  <linearGradient id="textBg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stop-color="rgba(0,0,0,0.0)"/>
    <stop offset="20%"  stop-color="rgba(0,0,0,0.45)"/>
    <stop offset="50%"  stop-color="rgba(0,0,0,0.62)"/>
    <stop offset="80%"  stop-color="rgba(0,0,0,0.45)"/>
    <stop offset="100%" stop-color="rgba(0,0,0,0.0)"/>
  </linearGradient>
  <!-- 強いテキストシャドウ -->
  <filter id="ts" x="-10%" y="-25%" width="120%" height="150%">
    <feDropShadow dx="0" dy="2" stdDeviation="8" flood-color="rgba(0,0,0,1.0)"/>
    <feDropShadow dx="0" dy="0" stdDeviation="16" flood-color="rgba(0,0,0,0.7)"/>
  </filter>
  <!-- アクセントグラデーション -->
  <linearGradient id="acc" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%"   stop-color="${accentColor}"/>
    <stop offset="100%" stop-color="${accentColor}66"/>
  </linearGradient>
  <!-- LANDバッジ用 -->
  <filter id="bts" x="-20%" y="-40%" width="140%" height="180%">
    <feDropShadow dx="0" dy="1" stdDeviation="4" flood-color="rgba(0,0,0,0.8)"/>
  </filter>
</defs>

<!-- 1: 全体ベール（背景が透けて見える薄暗め） -->
<rect width="1080" height="1080" fill="url(#veil)"/>

<!-- 2: テキスト帯（中央付近を少し暗く - 背景残しつつ文字読みやすく） -->
<rect x="0" y="${blockTop - 40}" width="1080" height="${blockH + 80}"
  fill="url(#textBg)"/>

<!-- 3: タイトルテキスト（白・大文字） -->
${lines.map((line, i) => `<text
  x="540" y="${startY + i * lh}"
  font-family="'Noto Sans JP','Hiragino Kaku Gothic ProN','Yu Gothic Bold',sans-serif"
  font-size="${fs}" font-weight="900"
  fill="white" text-anchor="middle" letter-spacing="3"
  filter="url(#ts)">${esc(line)}</text>`).join('\n')}

<!-- 4: アクセントライン -->
<rect x="${540 - 48}" y="${startY + n * lh + 12}"
  width="96" height="4" rx="2" fill="url(#acc)" opacity="0.9"/>

<!-- 5: 底部グラデーション（下1/4を暗く） -->
<rect x="0" y="810" width="1080" height="270" fill="rgba(0,0,0,0)" style=""/>
<linearGradient id="bottom" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%"   stop-color="rgba(0,0,0,0)"/>
  <stop offset="100%" stop-color="rgba(0,0,0,0.65)"/>
</linearGradient>
<rect x="0" y="810" width="1080" height="270" fill="url(#bottom)"/>

<!-- 6: LAND（左上） -->
<text x="44" y="54"
  font-family="Arial,sans-serif"
  font-size="22" font-weight="900" letter-spacing="5"
  fill="white" opacity="0.70"
  filter="url(#bts)">LAND</text>

<!-- 7: @land.tokachi（右下） -->
<text x="1036" y="1050"
  font-family="Arial,sans-serif"
  font-size="18" fill="white" text-anchor="end" opacity="0.60"
  filter="url(#bts)">@land.tokachi</text>
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
      console.log('[Image] Building DALL-E prompt for:', title)
      dallePrompt = await buildDallePrompt(title, category)
      console.log('[Image] DALL-E prompt:', dallePrompt.slice(0, 100))

      console.log('[Image] Calling DALL-E 3...')
      const dalleRes = await openai.images.generate({
        model: 'dall-e-3',
        prompt: dallePrompt + '. No text, no letters, no words anywhere in the image.',
        size: '1024x1024',
        quality: 'standard',
        n: 1,
      })

      const dalleUrl = dalleRes.data?.[0]?.url
      console.log('[Image] DALL-E URL:', dalleUrl ? 'received' : 'null')

      if (dalleUrl) {
        console.log('[Image] Downloading DALL-E image...')
        const imgRes = await fetch(dalleUrl, { signal: AbortSignal.timeout(45000) })
        if (!imgRes.ok) throw new Error(`Image download failed: ${imgRes.status}`)
        const arrayBuf = await imgRes.arrayBuffer()
        bgBuffer = Buffer.from(arrayBuf)
        console.log('[Image] DALL-E image downloaded:', bgBuffer.length, 'bytes')
      }
    } catch (dalleErr) {
      console.error('[Image] DALL-E generation failed:', dalleErr)
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
