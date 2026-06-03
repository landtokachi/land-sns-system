'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [staffId, setStaffId] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // PINの各桁入力
  function handlePinInput(value: string) {
    if (value.length <= 4 && /^\d*$/.test(value)) {
      setPin(value)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (pin.length !== 4) {
      setError('PINコードは4桁で入力してください')
      return
    }
    setLoading(true)
    setError('')

    // スタッフIDをメールアドレス形式に変換してSupabase Authで認証
    const email = `${staffId.toLowerCase()}@land.internal`
    const password = `pin_${pin}_land`

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('スタッフIDまたはPINコードが正しくありません')
      setPin('')
    } else {
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-3xl font-bold">L</span>
          </div>
          <h1 className="text-3xl font-bold text-white">LAND</h1>
          <p className="text-gray-400 mt-1">情報発信統合システム</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">ログイン</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">スタッフID</label>
              <input
                required
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center text-lg tracking-widest"
                placeholder="例：yamada"
                autoCapitalize="none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-center">PINコード（4桁）</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                required
                value={pin}
                onChange={(e) => handlePinInput(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-center text-3xl tracking-[1rem] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="••••"
              />
              {/* PIN dots display */}
              <div className="flex justify-center gap-3 mt-3">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full transition-colors ${
                      i < pin.length ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || pin.length !== 4 || !staffId}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-500 text-xs mt-6">
          公益財団法人とかち財団
        </p>
      </div>
    </div>
  )
}
