import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/AppLayout'
import Link from 'next/link'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  CANDIDATE_STATUS_COLORS,
  CANDIDATE_STATUS_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  CATEGORIES,
} from '@/lib/constants'
import type { PostCandidate } from '@/types'

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string; category?: string; q?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('post_candidates')
    .select('*')
    .order('created_at', { ascending: false })

  if (params.status) query = query.eq('status', params.status)
  if (params.priority) query = query.eq('priority', params.priority)
  if (params.category) query = query.eq('category', params.category)
  if (params.q) query = query.ilike('title', `%${params.q}%`)

  const { data: candidates } = await query

  return (
    <AppLayout title="投稿候補一覧">
      <div className="space-y-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: '#64748b' }}>{candidates?.length ?? 0}件</p>
          <Link
            href="/candidates/new"
            className="inline-flex items-center gap-2 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新規登録
          </Link>
        </div>

        {/* Filters */}
        <form className="glass-card p-4 flex flex-wrap gap-3">
          <input
            name="q"
            defaultValue={params.q}
            placeholder="タイトルで検索"
            className="rounded-xl px-3 py-2 text-sm w-full sm:w-48"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#e2e8f0',
            }}
          />
          <select
            name="status"
            defaultValue={params.status}
            className="rounded-xl px-3 py-2 text-sm"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#e2e8f0',
            }}
          >
            <option value="">全ステータス</option>
            {Object.entries(CANDIDATE_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <select
            name="priority"
            defaultValue={params.priority}
            className="rounded-xl px-3 py-2 text-sm"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#e2e8f0',
            }}
          >
            <option value="">全優先度</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
          <select
            name="category"
            defaultValue={params.category}
            className="rounded-xl px-3 py-2 text-sm"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#e2e8f0',
            }}
          >
            <option value="">全カテゴリ</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all text-white"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            検索
          </button>
          <Link href="/candidates" className="text-sm py-2 px-2" style={{ color: '#475569' }}>
            リセット
          </Link>
        </form>

        {/* Table - desktop */}
        <div className="glass-card overflow-hidden hidden sm:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>タイトル</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>カテゴリ</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>情報元</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>締切日</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>優先度</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>ステータス</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>更新日</th>
                </tr>
              </thead>
              <tbody>
                {(candidates as PostCandidate[])?.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    className="transition-colors hover:bg-white/5">
                    <td className="px-4 py-3">
                      <Link href={`/candidates/${c.id}`}
                        className="font-medium hover:underline line-clamp-1"
                        style={{ color: '#818cf8' }}>
                        {c.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#64748b' }}>{c.category || '-'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#64748b' }}>{c.source_name || '-'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: c.deadline ? '#f87171' : '#64748b' }}>
                      {c.deadline ? format(new Date(c.deadline), 'M/d', { locale: ja }) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${PRIORITY_COLORS[c.priority]}`}>
                        {PRIORITY_LABELS[c.priority]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${CANDIDATE_STATUS_COLORS[c.status]}`}>
                        {CANDIDATE_STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#475569' }}>
                      {format(new Date(c.updated_at), 'M/d', { locale: ja })}
                    </td>
                  </tr>
                ))}
                {!candidates?.length && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: '#475569' }}>
                      投稿候補がありません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cards - mobile */}
        <div className="sm:hidden space-y-3">
          {(candidates as PostCandidate[])?.map((c) => (
            <Link key={c.id} href={`/candidates/${c.id}`} className="block glass-card p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm font-medium" style={{ color: '#e2e8f0' }}>{c.title}</p>
                <span className={`px-2 py-0.5 rounded-full text-xs flex-shrink-0 ${PRIORITY_COLORS[c.priority]}`}>
                  {PRIORITY_LABELS[c.priority]}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-xs ${CANDIDATE_STATUS_COLORS[c.status]}`}>
                  {CANDIDATE_STATUS_LABELS[c.status]}
                </span>
                {c.category && <span className="text-xs" style={{ color: '#475569' }}>{c.category}</span>}
                {c.deadline && (
                  <span className="text-xs" style={{ color: '#f87171' }}>
                    締切: {format(new Date(c.deadline), 'M/d', { locale: ja })}
                  </span>
                )}
              </div>
            </Link>
          ))}
          {!candidates?.length && (
            <p className="text-center text-sm py-8" style={{ color: '#475569' }}>投稿候補がありません</p>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
