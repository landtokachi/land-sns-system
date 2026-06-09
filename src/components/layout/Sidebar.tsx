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
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3"/></svg> },
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
        'w-[220px] min-h-screen flex flex-col',
        'fixed inset-y-0 left-0 z-50 transition-transform duration-200',
        'lg:relative lg:translate-x-0',
        isOpen === false ? '-translate-x-full' : 'translate-x-0',
      )}
      style={{
        background: 'linear-gradient(185deg, #1e1b4b 0%, #312e81 48%, #4c1d95 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '2px 0 28px rgba(30,27,75,0.35)',
      }}
    >
      {/* Logo */}
      <div className="px-4 h-14 flex items-center gap-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #818cf8, #c084fc)', boxShadow: '0 4px 14px rgba(168,85,247,0.55)' }}>
          <span className="text-white text-base font-black">L</span>
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-none tracking-wide">LAND</p>
          <p className="text-[11px] text-indigo-300/80 mt-1">SNS管理</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
        {navGroups.map(group => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold text-indigo-300/60 px-2 mb-1.5 uppercase tracking-[0.12em]">{group.label}</p>
            <div className="space-y-1">
              {group.items.map(item => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && item.href !== '/settings' && pathname.startsWith(item.href))
                return (
                  <Link key={item.href} href={item.href} onClick={onClose}
                    className={clsx(
                      'group relative flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition-all duration-150',
                      isActive
                        ? 'text-white font-semibold'
                        : 'text-indigo-100/70 hover:text-white hover:bg-white/10',
                    )}
                    style={isActive ? {
                      background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                      boxShadow: '0 6px 18px rgba(124,58,237,0.45)',
                    } : undefined}>
                    {isActive && (
                      <span className="absolute -left-3 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-white/90" />
                    )}
                    <span className={isActive ? 'text-white' : 'text-indigo-300/80 group-hover:text-white transition-colors'}>
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
      <div className="px-3 py-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #818cf8, #c084fc)', boxShadow: '0 2px 8px rgba(168,85,247,0.5)' }}>
            L
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">LAND スタッフ</p>
            <p className="text-[11px] text-indigo-300/70 truncate">とかち財団</p>
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
