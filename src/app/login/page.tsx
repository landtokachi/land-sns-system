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
      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-[500px] h-[500px] rounded-full opacity-25"
          style={{background:'radial-gradient(circle, rgba(99,102,241,0.4), transparent)'}} />
        <div className="absolute -bottom-40 right-1/4 w-[400px] h-[400px] rounded-full opacity-20"
          style={{background:'radial-gradient(circle, rgba(139,92,246,0.4), transparent)'}} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-black"
              style={{background:'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow:'0 8px 24px rgba(99,102,241,0.4)'}}>
              L
            </div>
            <div className="text-left">
              <p className="text-xl font-black" style={{color:'#1e1b4b'}}>LAND</p>
              <p className="text-xs" style={{color:'#a5b4fc'}}>情報発信統合システム</p>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="glass-card p-8" style={{boxShadow:'0 20px 60px rgba(99,102,241,0.15)'}}>
          <h2 className="text-lg font-bold mb-1" style={{color:'#1e1b4b'}}>ログイン</h2>
          <p className="text-sm mb-6" style={{color:'#a5b4fc'}}>スタッフIDとPINコードでログイン</p>

          {error && (
            <div className="mb-4 p-3 rounded-xl text-sm text-center"
              style={{background:'rgba(244,63,94,0.08)', border:'1px solid rgba(244,63,94,0.2)', color:'#f43f5e'}}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{color:'#7c6fa8'}}>スタッフID</label>
              <input required value={staffId} onChange={e => setStaffId(e.target.value)}
                className="w-full px-4 py-3 text-sm text-center tracking-widest"
                placeholder="例：yamada" autoCapitalize="none" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-center" style={{color:'#7c6fa8'}}>PINコード（4桁）</label>
              <input type="password" inputMode="numeric" pattern="\d{4}" maxLength={4}
                required value={pin} onChange={e => handlePinInput(e.target.value)}
                className="w-full px-4 py-3 text-center text-3xl tracking-[1rem]"
                placeholder="••••" />
              <div className="flex justify-center gap-4 mt-3">
                {[0,1,2,3].map(i => (
                  <div key={i} className="transition-all duration-200"
                    style={{
                      width: i < pin.length ? '14px' : '10px',
                      height: i < pin.length ? '14px' : '10px',
                      borderRadius: '50%',
                      background: i < pin.length ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(99,102,241,0.15)',
                      boxShadow: i < pin.length ? '0 0 10px rgba(99,102,241,0.5)' : 'none',
                    }} />
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading || pin.length !== 4 || !staffId}
              className="w-full py-3 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-2"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
              }}>
              {loading ? 'ログイン中...' : 'ログイン →'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-5" style={{color:'#c4b5fd'}}>公益財団法人とかち財団</p>
      </div>
    </div>
  )
}
