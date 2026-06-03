import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/AppLayout'
import { CandidateForm } from '@/components/candidates/CandidateForm'
import { notFound } from 'next/navigation'

export default async function EditCandidatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: candidate } = await supabase.from('post_candidates').select('*').eq('id', id).single()
  if (!candidate) notFound()

  return (
    <AppLayout title="投稿候補 編集">
      <div className="max-w-3xl">
        <CandidateForm initial={candidate} candidateId={id} />
      </div>
    </AppLayout>
  )
}
