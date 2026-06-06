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
    if (value.length <= 4 && /^\d*$/.test(value)) setPin(value)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (pin.length !== 4) { setError('PINコードは4桁で入力してください'); return }
    setLoading(true); setError('')
    const email = `${staffId.toLowerCase()}@land.internal`
    const password = `pin_${pin}_land`
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('スタッフIDまたはPINコードが正しくありません'); setPin('') }
    else router.push('/dashboard')
    setLoading(false)
  }

  return (
    <div className="app-bg min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Soft background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, rgba(91,127,255,0.3), transparent)' }} />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(124,92,252,0.25), transparent)' }} />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.3), transparent)' }} />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #5b7fff 0%, #7c5cfc 100%)',
              boxShadow: '0 8px 32px rgba(91,127,255,0.3)',
            }}
          >
            <span className="text-white text-3xl font-bold">L</span>
          </div>
          <h1 className="text-3xl font-bold" style={{ color: '#1e2b3c' }}>LAND</h1>
          <p className="mt-1.5 text-sm" style={{ color: '#8a9abf' }}>情報発信統合システム</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8" style={{ boxShadow: '0 8px 40px rgba(100,120,200,0.14)' }}>
          <h2 className="text-lg font-semibold text-center mb-6" style={{ color: '#1e2b3c' }}>ログイン</h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl text-sm text-center"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#6b7a99' }}>スタッフID</label>
              <input
                required
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="w-full px-4 py-3 text-sm text-center tracking-widest"
                placeholder="例：yamada"
                autoCapitalize="none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 text-center" style={{ color: '#6b7a99' }}>
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
                className="w-full px-4 py-3 text-center text-3xl tracking-[1rem]"
                placeholder="••••"
              />
              <div className="flex justify-center gap-3 mt-3">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-3 h-3 rounded-full transition-all duration-200"
                    style={{
                      background: i < pin.length
                        ? 'linear-gradient(135deg, #5b7fff, #7c5cfc)'
                        : 'rgba(180,200,230,0.5)',
                      transform: i < pin.length ? 'scale(1.15)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || pin.length !== 4 || !staffId}
              className="w-full text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              style={{
                background: 'linear-gradient(135deg, #5b7fff 0%, #7c5cfc 100%)',
                boxShadow: '0 4px 16px rgba(91,127,255,0.35)',
              }}
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: '#a0aec0' }}>
          公益財団法人とかち財団
        </p>
      </div>
    </div>
  )
}
