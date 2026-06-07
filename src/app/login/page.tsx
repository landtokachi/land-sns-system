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
      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-15"
          style={{background:'radial-gradient(circle, rgba(59,130,246,0.6), transparent)'}} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-10"
          style={{background:'radial-gradient(circle, rgba(139,92,246,0.6), transparent)'}} />
        <div className="absolute top-1/2 right-1/3 w-60 h-60 rounded-full opacity-08"
          style={{background:'radial-gradient(circle, rgba(180,60,120,0.4), transparent)'}} />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{
              background:'linear-gradient(135deg, #1e40af, #7c3aed)',
              boxShadow:'0 0 40px rgba(59,130,246,0.35), 0 8px 32px rgba(0,0,0,0.4)',
            }}>
            <span className="text-white text-3xl font-black tracking-tight">L</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">LAND</h1>
          <p className="mt-1.5 text-sm" style={{color:'#4a5568'}}>情報発信統合システム</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          <h2 className="text-base font-semibold text-center mb-6" style={{color:'#94a3b8'}}>スタッフログイン</h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl text-sm text-center"
              style={{background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', color:'#f87171'}}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{color:'#64748b'}}>スタッフID</label>
              <input required value={staffId} onChange={e => setStaffId(e.target.value)}
                className="w-full px-4 py-3 text-sm text-center tracking-widest"
                placeholder="例：yamada" autoCapitalize="none" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-center" style={{color:'#64748b'}}>PINコード（4桁）</label>
              <input type="password" inputMode="numeric" pattern="\d{4}" maxLength={4}
                required value={pin} onChange={e => handlePinInput(e.target.value)}
                className="w-full px-4 py-3 text-center text-3xl tracking-[1rem]"
                placeholder="••••" />
              <div className="flex justify-center gap-3 mt-3">
                {[0,1,2,3].map(i => (
                  <div key={i} className="w-3 h-3 rounded-full transition-all duration-200"
                    style={{
                      background: i < pin.length ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.08)',
                      transform: i < pin.length ? 'scale(1.2)' : 'scale(1)',
                      boxShadow: i < pin.length ? '0 0 8px rgba(59,130,246,0.6)' : 'none',
                    }} />
                ))}
              </div>
            </div>
            <button type="submit" disabled={loading || pin.length !== 4 || !staffId}
              className="w-full text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background:'linear-gradient(135deg, #1e40af, #7c3aed)',
                boxShadow:'0 4px 20px rgba(59,130,246,0.3)',
              }}>
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{color:'#2d3748'}}>公益財団法人とかち財団</p>
      </div>
    </div>
  )
}
