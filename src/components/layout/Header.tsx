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
    <header
      className="px-5 sm:px-7 h-14 flex items-center justify-between sticky top-0 z-30 flex-shrink-0"
      style={{
        background: 'rgba(245,245,252,0.88)',
        borderBottom: '1px solid rgba(99,102,241,0.09)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 1px 0 rgba(99,102,241,0.06)',
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-xl hover:bg-indigo-50 transition-colors"
          style={{ color: '#a5b4fc' }}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>

        {/* Search — FundFlow style pill */}
        <div className="hidden md:flex items-center gap-2.5 px-4 py-2 rounded-full text-xs cursor-pointer transition-all hover:bg-white/80"
          style={{
            background: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(99,102,241,0.14)',
            minWidth: '200px',
            color: '#c4b5fd',
          }}>
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <span>Search...</span>
          <span className="ml-auto text-xs px-1.5 py-0.5 rounded-md"
            style={{ background: 'rgba(99,102,241,0.10)', color: '#818cf8' }}>⌘K</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5">
        {/* Bell */}
        <button
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-indigo-50"
          style={{ color: '#c4b5fd' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
        </button>

        {/* Live pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full mx-1"
          style={{ background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.20)' }}>
          <div className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#4ade80', boxShadow: '0 0 5px rgba(74,222,128,0.7)' }} />
          <span className="text-xs font-semibold" style={{ color: '#22c55e' }}>Live</span>
        </div>

        {/* User */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full transition-all hover:bg-white/80"
          style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(99,102,241,0.12)' }}>
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 2px 6px rgba(99,102,241,0.3)' }}>
            L
          </div>
          <span className="text-xs font-medium hidden sm:inline" style={{ color: '#6b7a99' }}>logout</span>
        </button>
      </div>
    </header>
  )
}
