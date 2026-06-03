import { AppLayout } from '@/components/layout/AppLayout'
import { SourcesManager } from '@/components/sources/SourcesManager'

export default function SourcesPage() {
  return (
    <AppLayout title="巡回サイト管理">
      <div className="max-w-4xl">
        <SourcesManager />
      </div>
    </AppLayout>
  )
}
