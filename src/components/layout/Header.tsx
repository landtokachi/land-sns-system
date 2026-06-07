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
      style={{ borderBottom: '1px solid #e4e4e7' }}>
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-md hover:bg-zinc-100 transition-colors text-zinc-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
        <h1 className="text-sm font-semibold text-zinc-900">{title || 'ダッシュボード'}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-zinc-400 cursor-pointer transition-colors hover:bg-zinc-50"
          style={{ border: '1px solid #e4e4e7', minWidth: '200px' }}>
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <span>検索...</span>
          <span className="ml-auto text-zinc-300 font-mono text-xs">⌘K</span>
        </div>

        {/* Notification */}
        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-100 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-zinc-200" />

        {/* User + logout */}
        <button onClick={handleLogout}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors hover:bg-zinc-100">
          <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-white text-xs font-semibold">
            L
          </div>
          <span className="text-xs text-zinc-500 hidden sm:inline">ログアウト</span>
        </button>
      </div>
    </header>
  )
}
