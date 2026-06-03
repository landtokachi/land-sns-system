import { AppLayout } from '@/components/layout/AppLayout'
import { CollectPanel } from '@/components/collect/CollectPanel'

export default function CollectPage() {
  return (
    <AppLayout title="AI情報収集">
      <div className="max-w-4xl">
        <CollectPanel />
      </div>
    </AppLayout>
  )
}
