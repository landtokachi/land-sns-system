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
      className="px-5 sm:px-7 h-14 flex items-center justify-between sticky top-0 z-30 flex-shrink-0"
      style={{
        background: 'rgba(243,241,255,0.80)',
        borderBottom: '1px solid rgba(139,92,246,0.10)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 1px 0 rgba(139,92,246,0.06)',
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-xl hover:bg-white/60 transition-colors"
          style={{ color: '#8b5cf6' }}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>

        {/* Search — FundFlow style */}
        <div className="hidden md:flex items-center gap-2.5 px-4 py-2 rounded-full text-sm cursor-pointer transition-all hover:bg-white/70"
          style={{
            background: 'rgba(255,255,255,0.55)',
            border: '1px solid rgba(139,92,246,0.15)',
            minWidth: '220px',
            color: '#a5b4fc',
            backdropFilter: 'blur(10px)',
          }}>
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <span className="text-xs">Search...</span>
          <span className="ml-auto text-xs px-1.5 py-0.5 rounded-md font-mono" style={{ background: 'rgba(99,102,241,0.1)', color: '#8b5cf6' }}>⌘K</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Icon buttons */}
        {[
          <svg key="bell" className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>,
          <svg key="settings" className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
        ].map((icon, i) => (
          <button key={i}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-white/70"
            style={{ background: 'rgba(255,255,255,0.45)', border: '1px solid rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
            {icon}
          </button>
        ))}

        {/* Divider */}
        <div className="w-px h-5 mx-1" style={{ background: 'rgba(139,92,246,0.15)' }} />

        {/* User avatar */}
        <button onClick={handleLogout}
          className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full transition-all hover:bg-white/60"
          style={{ background: 'rgba(255,255,255,0.45)', border: '1px solid rgba(139,92,246,0.15)' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 2px 6px rgba(99,102,241,0.3)' }}>
            L
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold leading-none" style={{ color: '#1e1b4b' }}>LAND</p>
            <p className="text-xs" style={{ color: '#a5b4fc' }}>logout</p>
          </div>
        </button>
      </div>
    </header>
  )
}
