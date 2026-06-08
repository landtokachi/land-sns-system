import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { generateSvgTemplate, type ImageTextData } from '@/lib/image/templates'
import sharp from 'sharp'

export const maxDuration = 60

const adminClient = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Canvaアクセストークン取得（リフレッシュ対応） ──────────────────
async function getCanvaToken(): Promise<string | null> {
  const accessToken = process.env.CANVA_ACCESS_TOKEN
  if (accessToken) return accessToken

  // リフレッシュトークンで新しいアクセストークンを取得
  const refreshToken = process.env.CANVA_REFRESH_TOKEN
  const clientId = process.env.CANVA_CLIENT_ID
  const clientSecret = process.env.CANVA_CLIENT_SECRET
  if (!refreshToken || !clientId || !clientSecret) return null

  try {
    const res = await fetch('https://api.canva.com/rest/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.access_token || null
  } catch {
    return null
  }
}

// ─── CanvaでInstagram投稿デザインを生成 ─────────────────────────────
async function generateWithCanva(
  title: string,
  category: string,
  variant: number
): Promise<{ designId: string; thumbnailUrl: string } | null> {
  const token = await getCanvaToken()
  if (!token) { console.warn('[Canva] No token'); return null }

  // スタイル指示をバリアントで変える
  const styles = [
    'bright vibrant colors, bold, energetic, orange and yellow',
    'clean minimal white, elegant, professional, light blue',
    'dark premium, gold accents, luxury',
    'colorful gradient, trendy, Instagram-worthy',
    'natural warm tones, earthy, organic',
  ]
  const style = styles[variant % 5]

  // カテゴリ別の説明
  let theme = 'Japanese business professional'
  if (category.includes('補助金') || category.includes('助成')) theme = 'money and business support, documents, handshake, Hokkaido Japan'
  else if (category.includes('イベント') || category.includes('セミナー')) theme = 'business conference, seminar stage, people gathering, professional event'
  else if (category.includes('LAND') || category.includes('とかち財団')) theme = 'startup coworking space, Obihiro Hokkaido, entrepreneurs, community'
  else if (category.includes('事業者')) theme = 'Japanese small business, entrepreneur, shop, craftsmanship'

  const query = `Japanese SNS Instagram post for "${title}". Theme: ${theme}. Style: ${style}. Include bold Japanese text area. Professional design for social media. No English text in design.`

  try {
    const res = await fetch('https://api.canva.com/rest/v1/designs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        design_type: { type: 'preset', name: 'InstagramPost' },
        title: title.slice(0, 50),
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[Canva] Create design error:', err)
      return null
    }

    const data = await res.json()
    const designId = data.design?.id
    if (!designId) return null

    console.log('[Canva] Design created:', designId)
    return { designId, thumbnailUrl: data.design?.thumbnail?.url || '' }
  } catch (e) {
    console.error('[Canva] Error:', e)
    return null
  }
}

// ─── CanvaデザインをPNGでエクスポート ───────────────────────────────
async function exportCanvaDesign(designId: string): Promise<string | null> {
  const token = await getCanvaToken()
  if (!token) return null

  try {
    // エクスポートジョブを開始
    const res = await fetch(`https://api.canva.com/rest/v1/designs/${designId}/exports`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ format: { type: 'png' } }),
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      console.error('[Canva] Export error:', await res.text())
      return null
    }

    const data = await res.json()
    const exportId = data.job?.id
    if (!exportId) return null

    // エクスポート完了まで待機（ポーリング）
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 2000))
      const statusRes = await fetch(`https://api.canva.com/rest/v1/designs/${designId}/exports/${exportId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      })
      if (!statusRes.ok) continue
      const statusData = await statusRes.json()
      if (statusData.job?.status === 'success') {
        return statusData.job?.urls?.[0] || null
      }
      if (statusData.job?.status === 'failed') return null
    }
    return null
  } catch (e) {
    console.error('[Canva] Export error:', e)
    return null
  }
}

// ─── SVGフォールバック ───────────────────────────────────────────────
async function generateSvgFallback(
  imageData: ImageTextData, candidateId: string, variant: number, timestamp: number
): Promise<string> {
  const svg = generateSvgTemplate({ ...imageData, design_variant: variant })
  const pngBuffer = await sharp(Buffer.from(svg)).resize(1080, 1080).png().toBuffer()
  const fileName = `${candidateId}/v${variant}_${timestamp}.png`
  await adminClient.storage.from('generated-images')
    .upload(fileName, pngBuffer, { contentType: 'image/png', upsert: true })
  const { data } = adminClient.storage.from('generated-images').getPublicUrl(fileName)
  return data.publicUrl
}

// ─── テキストオーバーレイSVG ─────────────────────────────────────────
function buildOverlay(title: string): string {
  const lines = wrapJa(title, 9)
  const n = lines.length
  const fs = n <= 2 ? 110 : n === 3 ? 94 : 80
  const lh = fs * 1.24
  const startY = Math.round(540 - (n * lh) / 2 + fs * 0.16)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
<defs>
  <linearGradient id="mid" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
    <stop offset="30%" stop-color="rgba(0,0,0,0.55)"/>
    <stop offset="50%" stop-color="rgba(0,0,0,0.70)"/>
    <stop offset="70%" stop-color="rgba(0,0,0,0.55)"/>
    <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
  </linearGradient>
  <linearGradient id="bot" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
    <stop offset="100%" stop-color="rgba(0,0,0,0.70)"/>
  </linearGradient>
  <filter id="ts">
    <feDropShadow dx="0" dy="3" stdDeviation="10" flood-color="rgba(0,0,0,1)"/>
    <feDropShadow dx="0" dy="0" stdDeviation="22" flood-color="rgba(0,0,0,0.7)"/>
  </filter>
  <filter id="bs"><feDropShadow dx="0" dy="1" stdDeviation="5" flood-color="rgba(0,0,0,0.9)"/></filter>
</defs>
<rect width="1080" height="${n * lh + fs * 1.4}" y="${startY - fs * 0.85}" fill="url(#mid)"/>
<rect x="0" y="720" width="1080" height="360" fill="url(#bot)"/>
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

// ─── メインハンドラー ─────────────────────────────────────────────────
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

    // Canvaでデザイン生成（3種類）
    const canvaToken = await getCanvaToken()
    const useCanva = !!canvaToken

    const generatedImages: Array<{ variant: number; png_url: string; canva_design_id?: string; is_canva: boolean }> = []

    for (const variant of targets) {
      try {
        if (useCanva) {
          // Canvaでデザイン作成
          const canvaResult = await generateWithCanva(title, category, variant)
          if (canvaResult) {
            // Canvaデザインの画像URLを取得（サムネイル使用）
            const bgUrl = canvaResult.thumbnailUrl

            // テキストオーバーレイを合成
            const overlay = buildOverlay(title)

            let pngBuffer: Buffer
            if (bgUrl) {
              const photoRes = await fetch(bgUrl, { signal: AbortSignal.timeout(8000) })
              if (photoRes.ok) {
                const photoBuf = Buffer.from(await photoRes.arrayBuffer())
                pngBuffer = await sharp(photoBuf)
                  .resize(1080, 1080, { fit: 'cover', position: 'center' })
                  .composite([{ input: Buffer.from(overlay), blend: 'over' }])
                  .png().toBuffer()
              } else {
                pngBuffer = await sharp(Buffer.from(generateSvgTemplate({ ...image_data, template_type, design_variant: variant })))
                  .resize(1080, 1080).png().toBuffer()
              }
            } else {
              pngBuffer = await sharp(Buffer.from(generateSvgTemplate({ ...image_data, template_type, design_variant: variant })))
                .resize(1080, 1080).png().toBuffer()
            }

            const fileName = `${candidate_id}/canva_v${variant}_${timestamp}.png`
            const { error } = await adminClient.storage.from('generated-images')
              .upload(fileName, pngBuffer, { contentType: 'image/png', upsert: true })
            if (!error) {
              const { data } = adminClient.storage.from('generated-images').getPublicUrl(fileName)
              generatedImages.push({
                variant,
                png_url: data.publicUrl,
                canva_design_id: canvaResult.designId,
                is_canva: true,
              })
              continue
            }
          }
        }
        // フォールバック: SVG
        const svgUrl = await generateSvgFallback({ ...image_data, template_type }, candidate_id, variant, timestamp)
        generatedImages.push({ variant, png_url: svgUrl, is_canva: false })
      } catch (e) {
        console.error(`[Gen v${variant}] Error:`, e)
        const svgUrl = await generateSvgFallback({ ...image_data, template_type }, candidate_id, variant, timestamp)
        generatedImages.push({ variant, png_url: svgUrl, is_canva: false })
      }
    }

    if (!generatedImages.length) return NextResponse.json({ error: '生成失敗' }, { status: 500 })

    const main = generatedImages[0]
    const { data: rec } = await supabase.from('generated_images').insert({
      post_candidate_id: candidate_id, template_type,
      image_size: '1080x1080', image_url: main.png_url, png_url: main.png_url,
      image_text_json: {
        ...image_data,
        generated: generatedImages.map(g => ({ variant: g.variant, url: g.png_url, canva: g.is_canva })),
      },
    }).select().single()

    await supabase.from('post_candidates').update({ status: 'image_created' }).eq('id', candidate_id)

    return NextResponse.json({
      success: true,
      images: generatedImages.map(g => ({
        variant: g.variant,
        png_url: g.png_url,
        canva_design_id: g.canva_design_id,
        is_canva: g.is_canva,
      })),
      image_id: rec?.id,
      using_canva: useCanva,
      count: generatedImages.length,
    })

  } catch (e) {
    console.error('Image generation error:', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
