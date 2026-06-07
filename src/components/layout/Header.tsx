'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  title?: string
  onMenuClick?: () => void
}

export function Header({ title, onMenuClick }: HeaderProps) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header
      className="px-4 sm:px-6 h-14 flex items-center justify-between sticky top-0 z-30 flex-shrink-0"
      style={{
        background: 'rgba(11,18,38,0.85)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          style={{ color: '#94a3b8' }}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>

        {/* Breadcrumb style */}
        <div className="flex items-center gap-2 text-sm">
          <span style={{ color: '#4a5568' }}>LAND</span>
          <svg className="w-3 h-3" style={{ color: '#2d3748' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
          </svg>
          <span className="font-medium" style={{ color: '#e2e8f0' }}>{title || 'ダッシュボード'}</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Search */}
        <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm transition-colors hover:bg-white/8"
          style={{ color: '#4a5568', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <span className="hidden md:inline">検索...</span>
        </button>

        {/* Notification */}
        <button className="relative w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-white/8"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#4a5568' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
        </button>

        {/* Avatar + logout */}
        <button onClick={handleLogout}
          className="flex items-center gap-2 ml-1 px-2 py-1.5 rounded-xl transition-colors hover:bg-white/8"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
            L
          </div>
          <span className="text-xs hidden sm:inline" style={{ color: '#64748b' }}>ログアウト</span>
        </button>
      </div>
    </header>
  )
}
