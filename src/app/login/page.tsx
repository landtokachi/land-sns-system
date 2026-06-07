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
    <div className="min-h-screen flex" style={{ background: '#f0f4f9' }}>
      {/* Left blue panel */}
      <div className="hidden lg:flex lg:w-2/5 flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #1565c0 0%, #1976d2 50%, #42a5f5 100%)' }}>
        <div className="absolute inset-0 opacity-10">
          <svg viewBox="0 0 400 400" className="w-full h-full"><circle cx="350" cy="50" r="150" fill="white"/><circle cx="50" cy="350" r="120" fill="white"/><circle cx="200" cy="200" r="80" fill="white"/></svg>
        </div>
        <div className="relative z-10 text-center text-white">
          <div className="w-20 h-20 rounded-3xl bg-white/20 flex items-center justify-center text-4xl font-black mb-6 mx-auto"
            style={{ backdropFilter: 'blur(10px)' }}>L</div>
          <h1 className="text-4xl font-black mb-3">LAND</h1>
          <p className="text-blue-100 text-lg font-medium">情報発信統合システム</p>
          <p className="text-blue-200 text-sm mt-4">公益財団法人とかち財団</p>
          <div className="mt-10 space-y-3 text-left">
            {['SNS投稿の一元管理', 'AI自動情報収集', '投稿スケジュール管理', '直接投稿対応'].map(f => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <span className="text-blue-100 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white mx-auto mb-3"
              style={{ background: 'linear-gradient(135deg, #1565c0, #42a5f5)' }}>L</div>
            <h1 className="text-2xl font-black" style={{ color: '#1e293b' }}>LAND</h1>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg" style={{ border: '1px solid #e2e8f0' }}>
            <h2 className="text-xl font-bold mb-1" style={{ color: '#1e293b' }}>ログイン</h2>
            <p className="text-sm mb-6" style={{ color: '#94a3b8' }}>スタッフIDとPINコードでログイン</p>

            {error && (
              <div className="mb-4 p-3 rounded-xl text-sm text-center"
                style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#475569' }}>スタッフID</label>
                <input required value={staffId} onChange={e => setStaffId(e.target.value)}
                  className="w-full px-4 py-3 text-sm text-center tracking-widest"
                  placeholder="例：yamada" autoCapitalize="none" />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 text-center" style={{ color: '#475569' }}>
                  PINコード（4桁）
                </label>
                <input type="password" inputMode="numeric" pattern="\d{4}" maxLength={4}
                  required value={pin} onChange={e => handlePinInput(e.target.value)}
                  className="w-full px-4 py-3 text-center text-3xl tracking-[1rem]"
                  placeholder="••••" />
                <div className="flex justify-center gap-3 mt-3">
                  {[0,1,2,3].map(i => (
                    <div key={i} className="w-3 h-3 rounded-full transition-all duration-200"
                      style={{
                        background: i < pin.length ? 'linear-gradient(135deg, #1565c0, #42a5f5)' : '#e2e8f0',
                        transform: i < pin.length ? 'scale(1.2)' : 'scale(1)',
                        boxShadow: i < pin.length ? '0 0 8px rgba(21,101,192,0.4)' : 'none',
                      }} />
                  ))}
                </div>
              </div>

              <button type="submit" disabled={loading || pin.length !== 4 || !staffId}
                className="w-full text-white py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                style={{ background: 'linear-gradient(135deg, #1565c0, #42a5f5)', boxShadow: '0 4px 14px rgba(21,101,192,0.3)' }}>
                {loading ? 'ログイン中...' : 'ログイン →'}
              </button>
            </form>
          </div>

          <p className="text-center text-xs mt-4" style={{ color: '#cbd5e1' }}>
            公益財団法人とかち財団
          </p>
        </div>
      </div>
    </div>
  )
}
