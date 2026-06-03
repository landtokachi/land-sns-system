import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/AppLayout'
import { SocialPostsEditor } from '@/components/candidates/SocialPostsEditor'
import { notFound } from 'next/navigation'

export default async function SocialPostsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: candidate }, { data: socialPosts }] = await Promise.all([
    supabase.from('post_candidates').select('*').eq('id', id).single(),
    supabase.from('social_posts').select('*').eq('post_candidate_id', id).order('platform'),
  ])

  if (!candidate) notFound()

  return (
    <AppLayout title={`SNS投稿文 - ${candidate.title}`}>
      <div className="max-w-4xl">
        <SocialPostsEditor candidate={candidate} initialPosts={socialPosts || []} />
      </div>
    </AppLayout>
  )
}
