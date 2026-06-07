'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'

const navGroups = [
  {
    label: 'メイン',
    items: [
      { href: '/dashboard', label: 'ダッシュボード',
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h7v7H3zM3 17h7v4H3zM13 3h8v9h-8zM13 16h8v5h-8z"/></svg> },
      { href: '/candidates', label: '投稿候補',
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg> },
      { href: '/candidates/new', label: '新規登録',
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg> },
    ],
  },
  {
    label: 'AI・収集',
    items: [
      { href: '/collect', label: 'AI情報収集',
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg> },
      { href: '/sources', label: '巡回サイト',
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg> },
    ],
  },
  {
    label: 'スケジュール',
    items: [
      { href: '/schedule', label: '投稿予定',
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg> },
      { href: '/published', label: '投稿実績',
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
    ],
  },
  {
    label: '設定',
    items: [
      { href: '/settings/staff', label: 'スタッフ管理',
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg> },
      { href: '/settings', label: '設定',
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg> },
    ],
  },
]

interface SidebarProps { isOpen?: boolean; onClose?: () => void }

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()

  const inner = (
    <aside
      className={clsx(
        'w-[220px] min-h-screen flex flex-col bg-white',
        'fixed inset-y-0 left-0 z-50 transition-transform duration-200',
        'lg:relative lg:translate-x-0',
        isOpen === false ? '-translate-x-full' : 'translate-x-0',
      )}
      style={{ borderRight: '1px solid #e4e4e7' }}
    >
      {/* Logo */}
      <div className="px-4 h-14 flex items-center gap-2.5 flex-shrink-0"
        style={{ borderBottom: '1px solid #f4f4f5' }}>
        <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-black">L</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-900 leading-none">LAND</p>
          <p className="text-xs text-zinc-400 mt-0.5">SNS管理</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
        {navGroups.map(group => (
          <div key={group.label}>
            <p className="text-xs font-medium text-zinc-400 px-2 mb-1">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && item.href !== '/settings' && pathname.startsWith(item.href))
                return (
                  <Link key={item.href} href={item.href} onClick={onClose}
                    className={clsx(
                      'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
                      isActive
                        ? 'nav-active text-zinc-900'
                        : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50',
                    )}>
                    <span className={clsx('flex-shrink-0', isActive ? 'text-zinc-700' : 'text-zinc-400')}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-3 flex-shrink-0" style={{ borderTop: '1px solid #f4f4f5' }}>
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-zinc-50 cursor-pointer transition-colors">
          <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-semibold text-zinc-600 flex-shrink-0">
            L
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-zinc-800 truncate">LAND スタッフ</p>
            <p className="text-xs text-zinc-400 truncate">とかち財団</p>
          </div>
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
