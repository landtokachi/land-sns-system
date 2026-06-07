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
      {/* Subtle bg orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] rounded-full opacity-40"
          style={{background:'radial-gradient(circle, rgba(139,92,246,0.18), transparent)'}} />
        <div className="absolute -bottom-32 right-1/4 w-[400px] h-[400px] rounded-full opacity-30"
          style={{background:'radial-gradient(circle, rgba(99,102,241,0.15), transparent)'}} />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black mx-auto mb-4"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 8px 28px rgba(99,102,241,0.35)',
            }}>
            L
          </div>
          <h1 className="text-2xl font-black gradient-text">LAND</h1>
          <p className="text-sm mt-1.5" style={{color:'#a5b4fc'}}>情報発信統合システム</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          <h2 className="text-base font-bold mb-1" style={{color:'#1e1b4b'}}>スタッフログイン</h2>
          <p className="text-xs mb-6" style={{color:'#c4b5fd'}}>IDとPINコードでログイン</p>

          {error && (
            <div className="mb-4 p-3 rounded-xl text-xs text-center"
              style={{background:'rgba(244,63,94,0.08)', border:'1px solid rgba(244,63,94,0.18)', color:'#f43f5e'}}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{color:'#6b7a99'}}>スタッフID</label>
              <input required value={staffId} onChange={e => setStaffId(e.target.value)}
                className="w-full px-4 py-3 text-sm text-center tracking-widest"
                placeholder="例：yamada" autoCapitalize="none"/>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-center" style={{color:'#6b7a99'}}>PINコード（4桁）</label>
              <input type="password" inputMode="numeric" pattern="\d{4}" maxLength={4}
                required value={pin} onChange={e => handlePinInput(e.target.value)}
                className="w-full px-4 py-3 text-center text-3xl tracking-[1rem]" placeholder="••••"/>
              <div className="flex justify-center gap-4 mt-3">
                {[0,1,2,3].map(i => (
                  <div key={i} className="rounded-full transition-all duration-200"
                    style={{
                      width: i < pin.length ? '13px' : '9px',
                      height: i < pin.length ? '13px' : '9px',
                      background: i < pin.length ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(99,102,241,0.15)',
                      boxShadow: i < pin.length ? '0 0 10px rgba(99,102,241,0.5)' : 'none',
                    }}/>
                ))}
              </div>
            </div>
            <button type="submit" disabled={loading || pin.length !== 4 || !staffId}
              className="btn-glow w-full py-3 rounded-2xl text-sm font-bold mt-2">
              {loading ? 'ログイン中...' : 'ログイン →'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-5" style={{color:'#d8d4f0'}}>公益財団法人とかち財団</p>
      </div>
    </div>
  )
}
