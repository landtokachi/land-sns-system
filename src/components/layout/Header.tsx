'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface HeaderProps { title?: string; onMenuClick?: () => void }

export function Header({ title, onMenuClick }: HeaderProps) {
  const router = useRouter()
  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="px-5 sm:px-7 h-14 flex items-center justify-between sticky top-0 z-30 flex-shrink-0"
      style={{
        background: 'rgba(7, 6, 18, 0.80)',
        borderBottom: '1px solid rgba(139,92,246,0.10)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}>

      {/* Left */}
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-xl hover:bg-white/8 transition-colors"
          style={{ color: '#6d5a9a' }}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <span style={{ color: '#3a2a5a' }}>LAND</span>
          <span style={{ color: '#2a1a4a' }}>›</span>
          <span className="font-semibold" style={{ color: '#c4b5fd' }}>{title || 'Dashboard'}</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs cursor-pointer transition-all hover:bg-white/8"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(139,92,246,0.15)',
            color: '#3a2a5a',
            minWidth: '180px',
          }}>
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <span>Search...</span>
          <span className="ml-auto text-xs px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}>⌘K</span>
        </div>

        {/* Bell */}
        <button className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-white/8"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#4a3a6a' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
        </button>

        {/* Live */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#4ade80', boxShadow: '0 0 5px #4ade80' }} />
          <span className="text-xs font-medium" style={{ color: '#4ade80' }}>Live</span>
        </div>

        {/* User */}
        <button onClick={handleLogout}
          className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full transition-all hover:bg-white/8 ml-1"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(139,92,246,0.15)' }}>
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)', boxShadow: '0 2px 8px rgba(124,58,237,0.4)' }}>
            L
          </div>
          <span className="text-xs hidden sm:inline" style={{ color: '#4a3a6a' }}>logout</span>
        </button>
      </div>
    </header>
  )
}
