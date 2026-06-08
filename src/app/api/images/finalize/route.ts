import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { type ImageTextData } from '@/lib/image/templates'
import sharp from 'sharp'

// タイムアウトを短く（写真DL＋合成のみ）
export const maxDuration = 10

const adminClient = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Replicateで完成した画像URLを取得
async function getReplicateOutput(predictionId: string): Promise<string | null> {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) return null
  try {
    const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    })
    const data = await res.json()
    if (data.status !== 'succeeded') return null
    const out = data.output
    if (Array.isArray(out) && out[0]) return String(out[0])
    if (typeof out === 'string') return out
    return null
  } catch { return null }
}

// オーバーレイSVG
function buildOverlay(title: string): string {
  const lines = wrapJa(title, 9)
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

// Replicateの画像 + テキストオーバーレイを合成してPNG保存
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { predictionId, variant, candidateId, timestamp, title } = await request.json() as {
      predictionId: string; variant: number; candidateId: string; timestamp: number; title: string
    }

    // Replicateの完成画像URLを取得
    const imageUrl = await getReplicateOutput(predictionId)
    if (!imageUrl) {
      return NextResponse.json({ status: 'not_ready' })
    }

    // 画像をダウンロード
    const photoRes = await fetch(imageUrl, { signal: AbortSignal.timeout(8000) })
    if (!photoRes.ok) return NextResponse.json({ status: 'error', error: 'Download failed' })
    const photoBuf = Buffer.from(await photoRes.arrayBuffer())

    // テキストオーバーレイを合成
    const overlay = buildOverlay(title)
    const pngBuffer = await sharp(photoBuf)
      .resize(1080, 1080, { fit: 'cover', position: 'center' })
      .composite([{ input: Buffer.from(overlay), blend: 'over' }])
      .png()
      .toBuffer()

    // Supabaseにアップロード
    const fileName = `${candidateId}/ai_v${variant}_${timestamp}.png`
    const { error } = await adminClient.storage
      .from('generated-images')
      .upload(fileName, pngBuffer, { contentType: 'image/png', upsert: true })
    if (error) throw error

    const { data } = adminClient.storage.from('generated-images').getPublicUrl(fileName)

    return NextResponse.json({ status: 'done', png_url: data.publicUrl, variant })

  } catch (e) {
    console.error('Finalize error:', e)
    return NextResponse.json({ status: 'error', error: String(e) }, { status: 500 })
  }
}
