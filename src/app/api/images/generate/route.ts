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

// 1枚のSVGをPNGに変換してアップロード
async function generateOnePng(
  image_data: ImageTextData,
  candidate_id: string,
  variant: number,
  timestamp: number
): Promise<{ png_url: string; svg: string; variant: number }> {
  const data = { ...image_data, design_variant: variant }
  const svg = generateSvgTemplate(data)
  const svgBuffer = Buffer.from(svg)

  const pngBuffer = await sharp(svgBuffer).resize(1080, 1080).png().toBuffer()

  const fileName = `${candidate_id}/v${variant}_${timestamp}.png`
  const { error } = await adminClient.storage
    .from('generated-images')
    .upload(fileName, pngBuffer, { contentType: 'image/png', upsert: true })

  if (error) throw error

  const { data: urlData } = adminClient.storage
    .from('generated-images').getPublicUrl(fileName)

  return { png_url: urlData.publicUrl, svg, variant }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const {
      candidate_id,
      template_type,
      image_data,
      variants = [0, 1, 2],  // デフォルト3種類同時生成
      feedback,               // ユーザーのフィードバック
    } = body as {
      candidate_id: string
      template_type: string
      image_data: ImageTextData
      variants?: number[]
      feedback?: string
    }

    const timestamp = Date.now()
    const baseData: ImageTextData = {
      ...image_data,
      template_type,
      feedback: feedback || '',
    }

    // フィードバックに応じてバリアントを調整
    let targetVariants = variants
    if (feedback) {
      const fb = feedback.toLowerCase()
      if (fb.includes('明る') || fb.includes('白') || fb.includes('シンプル') || fb.includes('清潔')) {
        targetVariants = [1, 0, 3]
      } else if (fb.includes('暗') || fb.includes('黒') || fb.includes('プレミアム') || fb.includes('高級')) {
        targetVariants = [2, 3, 0]
      } else if (fb.includes('カラフル') || fb.includes('鮮やか') || fb.includes('派手') || fb.includes('目立')) {
        targetVariants = [3, 0, 2]
      } else if (fb.includes('自然') || fb.includes('緑') || fb.includes('農業') || fb.includes('シック')) {
        targetVariants = [4, 2, 0]
      } else if (fb.includes('違う') || fb.includes('別') || fb.includes('変え')) {
        // 現在と違うバリアントを提案
        targetVariants = variants.map(v => (v + 1) % 5)
      }
    }

    // 複数バリアントを並行生成
    const results = await Promise.allSettled(
      targetVariants.map(v => generateOnePng(baseData, candidate_id, v, timestamp))
    )

    const generated: Array<{ png_url: string; svg: string; variant: number }> = []
    for (const r of results) {
      if (r.status === 'fulfilled') generated.push(r.value)
    }

    if (generated.length === 0) {
      return NextResponse.json({ error: '画像生成に失敗しました' }, { status: 500 })
    }

    // DBに保存（最初の1枚をメインとして登録）
    const main = generated[0]
    const { data: imageRecord } = await supabase
      .from('generated_images')
      .insert({
        post_candidate_id: candidate_id,
        template_type,
        image_size: '1080x1080',
        image_url: main.png_url,
        png_url: main.png_url,
        image_text_json: {
          ...baseData,
          all_variants: generated.map(g => ({ variant: g.variant, url: g.png_url })),
          feedback: feedback || null,
        },
      })
      .select().single()

    await supabase.from('post_candidates')
      .update({ status: 'image_created' }).eq('id', candidate_id)

    return NextResponse.json({
      success: true,
      images: generated.map(g => ({
        variant: g.variant,
        png_url: g.png_url,
        svg: g.svg,
      })),
      image_id: imageRecord?.id,
      count: generated.length,
    })

  } catch (error) {
    console.error('Image generation error:', error)
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 })
  }
}
