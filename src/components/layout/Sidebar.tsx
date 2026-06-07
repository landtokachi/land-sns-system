'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'

const navItems = [
  { href: '/dashboard', label: 'ダッシュボード',
    icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h7v7H3zM3 17h7v4H3zM13 3h8v9h-8zM13 16h8v5h-8z"/></svg> },
  { href: '/candidates', label: '投稿候補',
    icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg> },
  { href: '/candidates/new', label: '新規登録',
    icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg> },
  { href: '/collect', label: 'AI情報収集',
    icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg> },
  { href: '/sources', label: '巡回サイト',
    icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg> },
  { href: '/schedule', label: '投稿予定',
    icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg> },
  { href: '/published', label: '投稿実績',
    icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
  { href: '/settings/staff', label: 'スタッフ',
    icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg> },
  { href: '/settings', label: '設定',
    icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg> },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()

  const inner = (
    <aside
      className={clsx(
        'w-[200px] min-h-screen flex flex-col',
        'fixed inset-y-0 left-0 z-50 transition-transform duration-300',
        'lg:relative lg:translate-x-0',
        isOpen === false ? '-translate-x-full' : 'translate-x-0',
      )}
      style={{
        background: 'rgba(248,247,255,0.75)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRight: '1px solid rgba(139,92,246,0.12)',
        boxShadow: '4px 0 24px rgba(99,102,241,0.06)',
      }}
    >
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-2xl flex items-center justify-center text-white font-black text-lg flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
          }}
        >
          L
        </div>
        <div>
          <p className="text-sm font-bold leading-none" style={{ color: '#1e1b4b' }}>LAND</p>
          <p className="text-xs mt-0.5" style={{ color: '#a5b4fc' }}>SNS管理</p>
        </div>
      </div>

      {/* User card (Glazzed風) */}
      <div className="mx-3 mb-3 p-3 rounded-2xl"
        style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))', border: '1px solid rgba(99,102,241,0.15)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }}>
            L
          </div>
          <div>
            <p className="text-xs font-bold" style={{ color: '#1e1b4b' }}>LAND スタッフ</p>
            <p className="text-xs" style={{ color: '#a5b4fc' }}>とかち財団</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        <p className="text-xs font-semibold px-3 mb-2 mt-1" style={{ color: '#c4b5fd' }}>MENU</p>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && item.href !== '/settings' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group',
                isActive ? 'nav-active font-semibold' : 'hover:bg-white/50',
              )}
              style={{ color: isActive ? '#4f46e5' : '#7c6fa8' }}
            >
              <span className={clsx('flex-shrink-0', isActive ? 'text-indigo-600' : 'text-violet-300 group-hover:text-violet-500')}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-2 p-2 rounded-xl"
          style={{ background: 'rgba(99,102,241,0.06)' }}>
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#6ee7b7', boxShadow: '0 0 6px #6ee7b7' }} />
          <span className="text-xs truncate" style={{ color: '#a5b4fc' }}>公益財団法人とかち財団</span>
        </div>
      </div>
    </aside>
  )

  return (
    <>
      {isOpen && <div className="sidebar-overlay lg:hidden" onClick={onClose} />}
      {inner}
    </>
  )
}
