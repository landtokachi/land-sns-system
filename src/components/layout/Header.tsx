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
    <header className="bg-white h-14 px-4 sm:px-6 flex items-center justify-between flex-shrink-0 sticky top-0 z-30"
      style={{ borderBottom: '1px solid #e2e8f0' }}>
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-md hover:bg-slate-100 transition-colors text-slate-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
        <h1 className="text-sm font-semibold text-slate-800">{title || 'ダッシュボード'}</h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
          style={{ border: '1px solid #e2e8f0', minWidth: '180px' }}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <span>検索...</span>
          <span className="ml-auto font-mono text-xs text-slate-300">⌘K</span>
        </div>
        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
        </button>
        <div className="w-px h-5 bg-slate-200 mx-1" />
        <button onClick={handleLogout}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors hover:bg-slate-100">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
            L
          </div>
          <span className="text-xs text-slate-500 hidden sm:inline">ログアウト</span>
        </button>
      </div>
    </header>
  )
}
