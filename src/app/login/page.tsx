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

  function handlePinInput(v: string) { if (v.length <= 4 && /^\d*$/.test(v)) setPin(v) }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (pin.length !== 4) { setError('PINコードは4桁で入力してください'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: `${staffId.toLowerCase()}@land.internal`,
      password: `pin_${pin}_land`,
    })
    if (error) { setError('スタッフIDまたはPINコードが正しくありません'); setPin('') }
    else router.push('/dashboard')
    setLoading(false)
  }

  return (
    <div className="app-bg min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Floating orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full"
          style={{background:'radial-gradient(circle, rgba(124,58,237,0.18), transparent)', transform:'translate(-50%,-50%)'}} />
        <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] rounded-full"
          style={{background:'radial-gradient(circle, rgba(219,39,119,0.18), transparent)', transform:'translate(50%,50%)'}} />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] rounded-full"
          style={{background:'radial-gradient(circle, rgba(99,102,241,0.12), transparent)', transform:'translate(-50%,-50%)'}} />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-3xl text-white text-3xl font-black mx-auto mb-5 overflow-hidden"
            style={{
              background:'linear-gradient(135deg, #7c3aed, #6366f1, #3b82f6)',
              boxShadow:'0 12px 40px rgba(124,58,237,0.5), 0 0 0 1px rgba(139,92,246,0.3)',
            }}>
            <span className="relative z-10">L</span>
            <div className="absolute inset-0 opacity-40"
              style={{background:'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent)'}} />
          </div>
          <h1 className="text-3xl font-black gradient-text">LAND</h1>
          <p className="text-sm mt-1.5" style={{color:'#3a2a5a'}}>情報発信統合システム</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8"
          style={{boxShadow:'0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(139,92,246,0.1), inset 0 1px 0 rgba(255,255,255,0.07)'}}>
          <h2 className="text-base font-bold mb-1 text-white">スタッフログイン</h2>
          <p className="text-xs mb-6" style={{color:'#3a2a5a'}}>IDとPINコードでログイン</p>

          {error && (
            <div className="mb-4 p-3 rounded-xl text-xs text-center"
              style={{background:'rgba(244,63,94,0.1)', border:'1px solid rgba(244,63,94,0.2)', color:'#f87171'}}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{color:'#4a3a6a'}}>スタッフID</label>
              <input required value={staffId} onChange={e => setStaffId(e.target.value)}
                className="w-full px-4 py-3 text-sm text-center tracking-widest"
                placeholder="例：yamada" autoCapitalize="none" />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 text-center" style={{color:'#4a3a6a'}}>PINコード（4桁）</label>
              <input type="password" inputMode="numeric" pattern="\d{4}" maxLength={4}
                required value={pin} onChange={e => handlePinInput(e.target.value)}
                className="w-full px-4 py-3 text-center text-3xl tracking-[1rem]" placeholder="••••" />
              <div className="flex justify-center gap-4 mt-4">
                {[0,1,2,3].map(i => (
                  <div key={i} className="rounded-full transition-all duration-300"
                    style={{
                      width: i < pin.length ? '12px' : '8px',
                      height: i < pin.length ? '12px' : '8px',
                      background: i < pin.length ? 'linear-gradient(135deg, #8b5cf6, #db2777)' : 'rgba(255,255,255,0.08)',
                      boxShadow: i < pin.length ? '0 0 12px rgba(139,92,246,0.7)' : 'none',
                    }} />
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading || pin.length !== 4 || !staffId}
              className="btn-glow w-full py-3 rounded-2xl text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed mt-2">
              {loading ? 'ログイン中...' : 'ログイン →'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-5" style={{color:'#1a1030'}}>公益財団法人とかち財団</p>
      </div>
    </div>
  )
}
