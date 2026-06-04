'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'

const navItems = [
  { href: '/dashboard', label: 'ダッシュボード', icon: '📊' },
  { href: '/candidates', label: '投稿候補', icon: '📋' },
  { href: '/candidates/new', label: '新規登録', icon: '➕' },
  { href: '/collect', label: 'AI情報収集', icon: '🤖' },
  { href: '/sources', label: '巡回サイト管理', icon: '🔄' },
  { href: '/schedule', label: '投稿予定', icon: '📅' },
  { href: '/published', label: '投稿済み実績', icon: '✅' },
  { href: '/settings/staff', label: 'スタッフ管理', icon: '👤' },
  { href: '/settings', label: '設定', icon: '⚙️' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="p-5 border-b border-gray-700">
        <h1 className="text-lg font-bold text-white">LAND</h1>
        <p className="text-xs text-gray-400 mt-0.5">情報発信統合システム</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
              pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                ? 'bg-indigo-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            )}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-gray-700 text-xs text-gray-500">
        公益財団法人とかち財団
      </div>
    </aside>
  )
}
