import { AppLayout } from '@/components/layout/AppLayout'
import { CandidateForm } from '@/components/candidates/CandidateForm'

export default function NewCandidatePage() {
  return (
    <AppLayout title="投稿候補 新規登録">
      <div className="max-w-3xl">
        <CandidateForm />
      </div>
    </AppLayout>
  )
}
