import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/AppLayout'
import { ImageGenerator } from '@/components/candidates/ImageGenerator'
import { notFound } from 'next/navigation'

export default async function ImagePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: candidate }, { data: images }, { data: socialPost }] = await Promise.all([
    supabase.from('post_candidates').select('*').eq('id', id).single(),
    supabase.from('generated_images').select('*').eq('post_candidate_id', id).order('created_at', { ascending: false }),
    supabase.from('social_posts').select('image_title, image_subtitle').eq('post_candidate_id', id).eq('platform', 'instagram').single(),
  ])

  if (!candidate) notFound()

  return (
    <AppLayout title={`画像生成 - ${candidate.title}`}>
      <div className="max-w-4xl">
        <ImageGenerator candidate={candidate} initialImages={images || []} socialPost={socialPost} />
      </div>
    </AppLayout>
  )
}
