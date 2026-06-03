'use client'
import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/Button'

export default function StaffSettingsPage() {
  const [staffId, setStaffId] = useState('')
  const [pin, setPin] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null)

  function handlePinInput(value: string) {
    if (value.length <= 4 && /^\d*$/.test(value)) setPin(value)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    const res = await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff_id: staffId, pin, name }),
    })
    const data = await res.json()

    if (data.success) {
      setResult({ success: true })
      setStaffId('')
      setPin('')
      setName('')
    } else {
      setResult({ error: data.error })
    }
    setLoading(false)
  }

  return (
    <AppLayout title="スタッフ管理">
      <div className="max-w-md">
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h3 className="font-semibold text-gray-800">スタッフを追加する</h3>
          <p className="text-sm text-gray-500">スタッフIDと4桁のPINコードを設定します。</p>

          {result?.success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              スタッフを追加しました。このスタッフIDとPINでログインできます。
            </div>
          )}
          {result?.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              エラー: {result.error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                スタッフID <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                placeholder="例：yamada"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-400 mt-1">英数字のみ。ログイン時に使用します。</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                名前
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例：山田 太郎"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PINコード（4桁） <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => handlePinInput(e.target.value)}
                placeholder="••••"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex justify-center gap-3 mt-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`w-3 h-3 rounded-full ${i < pin.length ? 'bg-indigo-600' : 'bg-gray-200'}`} />
                ))}
              </div>
            </div>

            <Button type="submit" loading={loading} className="w-full">
              スタッフを追加する
            </Button>
          </form>
        </div>

        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">⚠️ 注意</p>
          <p>PINコードは設定後に確認できません。設定した値を必ずメモしておいてください。</p>
        </div>
      </div>
    </AppLayout>
  )
}
