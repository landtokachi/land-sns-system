import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { generateSvgTemplate, type ImageTextData } from '@/lib/image/templates'

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

    // Store SVG as image (PNG conversion would require server-side canvas/sharp)
    const svgBuffer = Buffer.from(svg)
    const fileName = `${candidate_id}/${template_type}_${Date.now()}.svg`

    const { error: uploadError } = await adminClient.storage
      .from('generated-images')
      .upload(fileName, svgBuffer, {
        contentType: 'image/svg+xml',
        upsert: true,
      })

    if (uploadError) throw uploadError

    const { data: urlData } = adminClient.storage
      .from('generated-images')
      .getPublicUrl(fileName)

    const imageUrl = urlData.publicUrl

    const { data: imageRecord } = await supabase
      .from('generated_images')
      .insert({
        post_candidate_id: candidate_id,
        template_type,
        image_size: '1080x1080',
        image_url: imageUrl,
        image_text_json: image_data,
      })
      .select()
      .single()

    await supabase
      .from('post_candidates')
      .update({ status: 'image_created' })
      .eq('id', candidate_id)

    return NextResponse.json({ image_url: imageUrl, image_id: imageRecord?.id, svg })
  } catch (error) {
    console.error('Image generation error:', error)
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 })
  }
}
