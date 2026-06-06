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
    <div className="app-bg min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }} />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 0 40px rgba(99,102,241,0.4)',
            }}
          >
            <span className="text-white text-3xl font-bold">L</span>
          </div>
          <h1 className="text-3xl font-bold text-white">LAND</h1>
          <p className="mt-1 text-sm" style={{ color: '#64748b' }}>情報発信統合システム</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          <h2 className="text-lg font-semibold text-center mb-6" style={{ color: '#e2e8f0' }}>ログイン</h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl text-sm text-center"
              style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#94a3b8' }}>スタッフID</label>
              <input
                required
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm text-center tracking-widest"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#e2e8f0',
                }}
                placeholder="例：yamada"
                autoCapitalize="none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 text-center" style={{ color: '#94a3b8' }}>
                PINコード（4桁）
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                required
                value={pin}
                onChange={(e) => handlePinInput(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-center text-3xl tracking-[1rem]"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#e2e8f0',
                }}
                placeholder="••••"
              />
              <div className="flex justify-center gap-3 mt-3">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-3 h-3 rounded-full transition-all duration-200"
                    style={{
                      background: i < pin.length
                        ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                        : 'rgba(255,255,255,0.1)',
                      transform: i < pin.length ? 'scale(1.2)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || pin.length !== 4 || !staffId}
              className="w-full text-white py-3 rounded-xl font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: '#334155' }}>
          公益財団法人とかち財団
        </p>
      </div>
    </div>
  )
}
