import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { generateSvgTemplate, type ImageTextData } from '@/lib/image/templates'
import sharp from 'sharp'

// Service role client for storage uploads (bypasses RLS)
const adminClient = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

    const svg = generateSvgTemplate({ ...image_data, template_type })
    const svgBuffer = Buffer.from(svg)
    const timestamp = Date.now()

    // SVGをアップロード
    const svgFileName = `${candidate_id}/${template_type}_${timestamp}.svg`
    const { error: svgUploadError } = await adminClient.storage
      .from('generated-images')
      .upload(svgFileName, svgBuffer, {
        contentType: 'image/svg+xml',
        upsert: true,
      })
    if (svgUploadError) throw svgUploadError

    const { data: svgUrlData } = adminClient.storage
      .from('generated-images')
      .getPublicUrl(svgFileName)
    const imageUrl = svgUrlData.publicUrl

    // PNG変換してアップロード（SNS投稿用）
    let pngUrl: string | null = null
    try {
      const pngBuffer = await sharp(svgBuffer)
        .resize(1080, 1080)
        .png()
        .toBuffer()
      const pngFileName = `${candidate_id}/${template_type}_${timestamp}.png`
      const { error: pngUploadError } = await adminClient.storage
        .from('generated-images')
        .upload(pngFileName, pngBuffer, {
          contentType: 'image/png',
          upsert: true,
        })
      if (!pngUploadError) {
        const { data: pngUrlData } = adminClient.storage
          .from('generated-images')
          .getPublicUrl(pngFileName)
        pngUrl = pngUrlData.publicUrl
      }
    } catch (pngError) {
      console.warn('PNG conversion failed, continuing without PNG:', pngError)
    }

    const { data: imageRecord } = await supabase
      .from('generated_images')
      .insert({
        post_candidate_id: candidate_id,
        template_type,
        image_size: '1080x1080',
        image_url: imageUrl,
        png_url: pngUrl,
        image_text_json: image_data,
      })
      .select()
      .single()

    await supabase
      .from('post_candidates')
      .update({ status: 'image_created' })
      .eq('id', candidate_id)

    return NextResponse.json({ image_url: imageUrl, png_url: pngUrl, image_id: imageRecord?.id, svg })
  } catch (error) {
    console.error('Image generation error:', error)
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 })
  }
}
