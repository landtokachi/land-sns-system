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
    <header className="bg-white px-5 sm:px-7 h-14 flex items-center justify-between sticky top-0 z-30 flex-shrink-0"
      style={{ borderBottom: '1px solid #e8edf5', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      {/* Left */}
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          style={{ color: '#64748b' }}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
        {/* Search bar (Google Drive style) */}
        <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full text-sm"
          style={{ background: '#f0f4f9', border: '1px solid #e2e8f0', minWidth: '240px', color: '#94a3b8' }}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <span>検索...</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Settings icon */}
        <button className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-slate-100"
          style={{ color: '#64748b' }}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
        </button>
        {/* Bell */}
        <button className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-slate-100"
          style={{ color: '#64748b' }}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
        </button>
        {/* User avatar (Google Drive style) */}
        <button onClick={handleLogout}
          className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full transition-colors hover:bg-slate-100 ml-1">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
            style={{ background: 'linear-gradient(135deg, #1565c0, #42a5f5)' }}>
            L
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold leading-none" style={{ color: '#1e293b' }}>LAND スタッフ</p>
            <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>ログアウト</p>
          </div>
        </button>
      </div>
    </header>
  )
}
