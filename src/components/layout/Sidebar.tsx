'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'

const navItems = [
  { href: '/dashboard', label: 'ダッシュボード',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 7h7v7H3zM3 17h7v4H3zM13 3h8v9h-8zM13 16h8v5h-8z"/></svg> },
  { href: '/candidates', label: '投稿候補',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg> },
  { href: '/candidates/new', label: '新規登録',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v16m8-8H4"/></svg> },
  { href: '/collect', label: 'AI情報収集',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg> },
  { href: '/sources', label: '巡回サイト',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg> },
  { href: '/schedule', label: '投稿予定',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg> },
  { href: '/published', label: '投稿実績',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
  { href: '/settings/staff', label: 'スタッフ管理',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg> },
  { href: '/settings', label: '設定',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg> },
]

interface SidebarProps { isOpen?: boolean; onClose?: () => void }

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()

  const inner = (
    <aside
      className={clsx(
        'w-[210px] min-h-screen flex flex-col',
        'fixed inset-y-0 left-0 z-50 transition-transform duration-300',
        'lg:relative lg:translate-x-0',
        isOpen === false ? '-translate-x-full' : 'translate-x-0',
      )}
      style={{
        background: 'linear-gradient(180deg, rgba(15,8,36,0.97) 0%, rgba(12,10,30,0.97) 100%)',
        borderRight: '1px solid rgba(139,92,246,0.12)',
        boxShadow: '4px 0 30px rgba(0,0,0,0.5)',
      }}
    >
      {/* ── Logo ── */}
      <div className="px-5 pt-6 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-lg relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)', boxShadow: '0 4px 16px rgba(124,58,237,0.5)' }}>
            <span className="relative z-10">L</span>
            <div className="absolute inset-0 opacity-30"
              style={{ background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent)' }} />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">LAND</p>
            <p className="text-xs mt-0.5" style={{ color: '#4a3a6a' }}>SNS管理システム</p>
          </div>
        </div>
      </div>

      {/* ── User profile (Glazzed style) ── */}
      <div className="mx-4 mt-4 mb-2 p-3 rounded-2xl relative overflow-hidden"
        style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}>
        <div className="absolute inset-0 opacity-20"
          style={{ background: 'radial-gradient(circle at 80% 50%, rgba(219,39,119,0.4), transparent)' }} />
        <div className="relative flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)', boxShadow: '0 2px 10px rgba(124,58,237,0.4)' }}>
            L
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-none">LAND スタッフ</p>
            <p className="text-xs mt-0.5" style={{ color: '#6d5a9a' }}>Admin Manager</p>
          </div>
        </div>
        <div className="relative flex gap-3 mt-3 pt-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { label: '投稿候補', href: '/candidates' },
            { label: '今週の予定', href: '/schedule' },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="text-xs hover:text-purple-300 transition-colors" style={{ color: '#4a3a6a' }}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <p className="text-xs font-semibold px-3 mb-2 tracking-wider" style={{ color: '#3a2a5a' }}>NAVIGATION</p>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && item.href !== '/settings' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href} onClick={onClose}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group',
                isActive ? 'nav-active' : 'hover:bg-white/5',
              )}
              style={isActive
                ? { paddingLeft: '10px', color: '#c4b5fd' }
                : { color: '#4a3a6a' }}
            >
              <span className={clsx('flex-shrink-0', isActive ? 'text-violet-400' : 'text-slate-600 group-hover:text-slate-400')}>
                {item.icon}
              </span>
              <span className={isActive ? 'font-medium' : 'group-hover:text-slate-300'}>{item.label}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: '#8b5cf6', boxShadow: '0 0 6px #8b5cf6' }} />
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── Footer ── */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
          <span className="text-xs truncate" style={{ color: '#2a1a4a' }}>公益財団法人とかち財団</span>
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
