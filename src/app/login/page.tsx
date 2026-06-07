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
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center text-white font-black text-xl mx-auto mb-4">
            L
          </div>
          <h1 className="text-xl font-bold text-zinc-900">LAND</h1>
          <p className="text-sm text-zinc-500 mt-1">情報発信統合システム</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm" style={{ border: '1px solid #e4e4e7' }}>
          <h2 className="text-sm font-semibold text-zinc-700 mb-5">スタッフログイン</h2>

          {error && (
            <div className="mb-4 px-3 py-2.5 rounded-lg text-xs text-red-600 bg-red-50"
              style={{ border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">スタッフID</label>
              <input required value={staffId} onChange={e => setStaffId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm text-center tracking-widest"
                placeholder="例：yamada" autoCapitalize="none"/>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5 text-center">PINコード（4桁）</label>
              <input type="password" inputMode="numeric" pattern="\d{4}" maxLength={4}
                required value={pin} onChange={e => handlePinInput(e.target.value)}
                className="w-full px-3 py-2.5 text-center text-2xl tracking-[1rem]"
                placeholder="••••"/>
              <div className="flex justify-center gap-3 mt-2.5">
                {[0,1,2,3].map(i => (
                  <div key={i} className="rounded-full transition-all duration-150"
                    style={{
                      width: '10px', height: '10px',
                      background: i < pin.length ? '#18181b' : '#e4e4e7',
                    }}/>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading || pin.length !== 4 || !staffId}
              className="btn-glow w-full py-2.5 rounded-lg text-sm font-medium">
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-zinc-400 mt-6">公益財団法人とかち財団</p>
      </div>
    </div>
  )
}
