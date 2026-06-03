import { AppLayout } from '@/components/layout/AppLayout'

export default function SettingsPage() {
  return (
    <AppLayout title="設定">
      <div className="max-w-2xl">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">システム設定</h3>
          <p className="text-sm text-gray-500">設定機能は順次追加予定です。</p>
        </div>
      </div>
    </AppLayout>
  )
}
