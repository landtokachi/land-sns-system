import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { type ImageTextData } from '@/lib/image/templates'
import sharp from 'sharp'

export const maxDuration = 60

const adminClient = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── カテゴリ別 Unsplash 検索キーワード ────────────────────────────
function getUnsplashKeywords(category: string, title: string): string {
  const t = title

  // タイトルから具体的なキーワードを抽出
  if (t.includes('農業') || t.includes('農') || t.includes('食') || t.includes('畜産')) {
    return 'hokkaido,farm,agriculture,japan'
  }
  if (t.includes('IT') || t.includes('DX') || t.includes('デジタル') || t.includes('テクノロジー')) {
    return 'technology,laptop,digital,office'
  }
  if (t.includes('起業') || t.includes('創業') || t.includes('スタートアップ')) {
    return 'startup,entrepreneur,business,japan'
  }
  if (t.includes('観光') || t.includes('旅行') || t.includes('インバウンド')) {
    return 'hokkaido,travel,tourism,landscape'
  }
  if (t.includes('女性') || t.includes('ウーマン')) {
    return 'woman,business,professional,japan'
  }
  if (t.includes('若者') || t.includes('学生') || t.includes('ユース')) {
    return 'young,student,university,japan'
  }
  if (t.includes('地域') || t.includes('まちづくり') || t.includes('コミュニティ')) {
    return 'community,japan,town,people'
  }
  if (t.includes('ものづくり') || t.includes('製造') || t.includes('工場') || t.includes('技術')) {
    return 'manufacturing,factory,craftsmanship,japan'
  }
  if (t.includes('環境') || t.includes('省エネ') || t.includes('カーボン') || t.includes('SDGs')) {
    return 'environment,green,sustainable,nature'
  }
  if (t.includes('セミナー') || t.includes('研修') || t.includes('講座')) {
    return 'seminar,conference,business,meeting'
  }
  if (t.includes('イベント') || t.includes('フォーラム') || t.includes('シンポジウム')) {
    return 'event,conference,hall,people'
  }

  // カテゴリ別フォールバック
  if (category.includes('補助金') || category.includes('助成')) {
    return 'business,office,documents,japan'
  }
  if (category.includes('イベント') || category.includes('セミナー')) {
    return 'conference,seminar,presentation,japan'
  }
  if (category.includes('LAND') || category.includes('とかち')) {
    return 'hokkaido,obihiro,coworking,startup'
  }
  if (category.includes('事業者')) {
    return 'business,entrepreneur,shop,japan'
  }

  return 'japan,business,professional,office'
}

// ─── アクセントカラー（カテゴリ別） ─────────────────────────────────
function getAccentColor(templateType: string, category: string): string {
  if (templateType === 'subsidy' || category?.includes('補助金')) return '#fbbf24'
  if (templateType === 'event'   || category?.includes('イベント')) return '#818cf8'
  if (templateType === 'land'    || category?.includes('LAND'))     return '#fcd34d'
  if (templateType === 'business'|| category?.includes('事業者'))   return '#c4b5fd'
  return '#38bdf8'
}

// ─── タイトルオーバーレイSVG ─────────────────────────────────────────
function generateOverlaySvg(title: string, accentColor: string): string {
  const lines = wrapJa(title, 9)
  const n = lines.length
  const fs = n === 1 ? 115 : n === 2 ? 98 : n === 3 ? 82 : 70
  const lh = fs * 1.25
  const startY = Math.round(540 - (n * lh) / 2 + fs * 0.15)

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
<defs>
  <!-- 上部を少し暗く -->
  <linearGradient id="top" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stop-color="rgba(0,0,0,0.40)"/>
    <stop offset="30%"  stop-color="rgba(0,0,0,0.10)"/>
    <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
  </linearGradient>
  <!-- テキスト部分を暗く（背景が見えつつ文字が読める） -->
  <linearGradient id="mid" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stop-color="rgba(0,0,0,0)"/>
    <stop offset="20%"  stop-color="rgba(0,0,0,0.50)"/>
    <stop offset="50%"  stop-color="rgba(0,0,0,0.68)"/>
    <stop offset="80%"  stop-color="rgba(0,0,0,0.50)"/>
    <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
  </linearGradient>
  <!-- 下部を暗く（ブランディング用） -->
  <linearGradient id="bot" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stop-color="rgba(0,0,0,0)"/>
    <stop offset="100%" stop-color="rgba(0,0,0,0.72)"/>
  </linearGradient>
  <!-- アクセントグラデーション -->
  <linearGradient id="acc" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%"   stop-color="${accentColor}"/>
    <stop offset="100%" stop-color="${accentColor}66"/>
  </linearGradient>
  <!-- 強いテキストシャドウ -->
  <filter id="ts" x="-10%" y="-25%" width="120%" height="150%">
    <feDropShadow dx="0" dy="2" stdDeviation="8"  flood-color="rgba(0,0,0,1.0)"/>
    <feDropShadow dx="0" dy="0" stdDeviation="18" flood-color="rgba(0,0,0,0.7)"/>
  </filter>
  <filter id="bs" x="-5%" y="-10%" width="110%" height="120%">
    <feDropShadow dx="0" dy="1" stdDeviation="4" flood-color="rgba(0,0,0,0.9)"/>
  </filter>
</defs>

<!-- 上部オーバーレイ -->
<rect width="1080" height="320" fill="url(#top)"/>

<!-- テキスト帯（中央） -->
<rect x="0" y="${startY - fs * 0.9}" width="1080" height="${n * lh + fs * 1.2}" fill="url(#mid)"/>

<!-- 下部オーバーレイ（下1/3） -->
<rect x="0" y="720" width="1080" height="360" fill="url(#bot)"/>

<!-- タイトルテキスト -->
${lines.map((line, i) => `<text
  x="540" y="${startY + i * lh}"
  font-family="'Noto Sans JP','Hiragino Kaku Gothic ProN','Yu Gothic Bold',sans-serif"
  font-size="${fs}" font-weight="900"
  fill="white" text-anchor="middle" letter-spacing="3"
  filter="url(#ts)">${esc(line)}</text>`).join('\n')}

<!-- アクセントライン -->
<rect x="${540 - 52}" y="${startY + n * lh + 14}"
  width="104" height="5" rx="2.5" fill="url(#acc)"/>

<!-- LAND（左上） -->
<text x="46" y="58"
  font-family="Arial,sans-serif" font-size="20" font-weight="900"
  letter-spacing="5" fill="white" opacity="0.70"
  filter="url(#bs)">LAND</text>

<!-- @land.tokachi（右下） -->
<text x="1034" y="1050"
  font-family="Arial,sans-serif" font-size="17"
  fill="white" text-anchor="end" opacity="0.60"
  filter="url(#bs)">@land.tokachi</text>
</svg>`
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
    const accent = getAccentColor(template_type, category)

    // ── STEP 1: Unsplash から写真を取得 ──
    let bgBuffer: Buffer | null = null
    let photoSource = ''

    try {
      const keywords = getUnsplashKeywords(category, title)
      // Unsplashのランダム写真エンドポイント（APIキー不要）
      // タイムスタンプでキャッシュを回避して毎回異なる写真に
      const unsplashUrl = `https://source.unsplash.com/1080x1080/?${encodeURIComponent(keywords)}&t=${timestamp}`
      console.log('[Image] Fetching Unsplash photo:', keywords)

      const photoRes = await fetch(unsplashUrl, {
        signal: AbortSignal.timeout(15000),
        headers: { 'User-Agent': 'LAND-SNS-System/1.0' },
      })

      if (photoRes.ok) {
        const buf = await photoRes.arrayBuffer()
        bgBuffer = Buffer.from(buf)
        photoSource = `unsplash:${keywords}`
        console.log('[Image] Photo downloaded:', bgBuffer.length, 'bytes')
      }
    } catch (err) {
      console.warn('[Image] Unsplash fetch failed:', err)
    }

    // ── STEP 2: テキストオーバーレイSVG ──
    const overlaySvg = generateOverlaySvg(title, accent)

    // ── STEP 3: sharp で合成 ──
    let pngBuffer: Buffer
    let svgFallbackUrl = ''

    if (bgBuffer) {
      // 写真 + オーバーレイ合成
      pngBuffer = await sharp(bgBuffer)
        .resize(1080, 1080, { fit: 'cover', position: 'center' })
        .composite([{ input: Buffer.from(overlaySvg), blend: 'over' }])
        .png()
        .toBuffer()
    } else {
      // フォールバック: SVGグラデーション背景
      console.warn('[Image] Using SVG fallback')
      const { generateSvgTemplate } = await import('@/lib/image/templates')
      const svgFallback = generateSvgTemplate({ ...image_data, template_type })
      pngBuffer = await sharp(Buffer.from(svgFallback))
        .resize(1080, 1080)
        .png()
        .toBuffer()
      // SVGも保存
      const svgFileName = `${candidate_id}/${template_type}_${timestamp}.svg`
      await adminClient.storage.from('generated-images')
        .upload(svgFileName, Buffer.from(svgFallback), { contentType: 'image/svg+xml', upsert: true })
      const { data: svgD } = adminClient.storage.from('generated-images').getPublicUrl(svgFileName)
      svgFallbackUrl = svgD.publicUrl
    }

    // ── STEP 4: PNG アップロード ──
    const pngFileName = `${candidate_id}/${template_type}_${timestamp}.png`
    const { error: pngErr } = await adminClient.storage
      .from('generated-images')
      .upload(pngFileName, pngBuffer, { contentType: 'image/png', upsert: true })
    if (pngErr) throw pngErr

    const { data: pngD } = adminClient.storage.from('generated-images').getPublicUrl(pngFileName)
    const pngUrl = pngD.publicUrl

    // ── STEP 5: DB 保存 ──
    const { data: imageRecord } = await supabase
      .from('generated_images')
      .insert({
        post_candidate_id: candidate_id,
        template_type,
        image_size: '1080x1080',
        image_url: svgFallbackUrl || pngUrl,
        png_url: pngUrl,
        image_text_json: { ...image_data, photo_source: photoSource },
      })
      .select().single()

    await supabase.from('post_candidates')
      .update({ status: 'image_created' }).eq('id', candidate_id)

    return NextResponse.json({
      image_url: svgFallbackUrl || pngUrl,
      png_url: pngUrl,
      image_id: imageRecord?.id,
      svg: overlaySvg,
      photo_used: !!bgBuffer,
      photo_source: photoSource,
    })

  } catch (error) {
    console.error('Image generation error:', error)
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 })
  }
}
