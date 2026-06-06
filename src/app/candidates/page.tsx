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
          <p className="text-sm font-medium" style={{ color: '#8a9abf' }}>
            {candidates?.length ?? 0}件
          </p>
          <Link
            href="/candidates/new"
            className="inline-flex items-center gap-2 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md transition-all hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, #5b7fff 0%, #7c5cfc 100%)',
              boxShadow: '0 4px 14px rgba(91,127,255,0.3)',
            }}
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
            className="px-3 py-2 text-sm w-full sm:w-48"
          />
          <select name="status" defaultValue={params.status} className="px-3 py-2 text-sm">
            <option value="">全ステータス</option>
            {Object.entries(CANDIDATE_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <select name="priority" defaultValue={params.priority} className="px-3 py-2 text-sm">
            <option value="">全優先度</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
          <select name="category" defaultValue={params.category} className="px-3 py-2 text-sm">
            <option value="">全カテゴリ</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #5b7fff, #7c5cfc)' }}
          >
            検索
          </button>
          <Link href="/candidates"
            className="text-sm py-2 px-2 rounded-xl hover:bg-white/50 transition-colors"
            style={{ color: '#a0aec0' }}>
            リセット
          </Link>
        </form>

        {/* Table - desktop */}
        <div className="glass-card overflow-hidden hidden sm:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left px-5 py-3.5">タイトル</th>
                  <th className="text-left px-5 py-3.5">カテゴリ</th>
                  <th className="text-left px-5 py-3.5">情報元</th>
                  <th className="text-left px-5 py-3.5">締切日</th>
                  <th className="text-left px-5 py-3.5">優先度</th>
                  <th className="text-left px-5 py-3.5">ステータス</th>
                  <th className="text-left px-5 py-3.5">更新日</th>
                </tr>
              </thead>
              <tbody>
                {(candidates as PostCandidate[])?.map((c) => (
                  <tr key={c.id} className="transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/candidates/${c.id}`}
                        className="font-medium hover:underline line-clamp-1"
                        style={{ color: '#5b7fff' }}>
                        {c.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: '#8a9abf' }}>{c.category || '—'}</td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: '#8a9abf' }}>{c.source_name || '—'}</td>
                    <td className="px-5 py-3.5 text-xs font-medium" style={{ color: c.deadline ? '#ef4444' : '#8a9abf' }}>
                      {c.deadline ? format(new Date(c.deadline), 'M/d', { locale: ja }) : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${PRIORITY_COLORS[c.priority]}`}>
                        {PRIORITY_LABELS[c.priority]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${CANDIDATE_STATUS_COLORS[c.status]}`}>
                        {CANDIDATE_STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: '#b0bcd4' }}>
                      {format(new Date(c.updated_at), 'M/d', { locale: ja })}
                    </td>
                  </tr>
                ))}
                {!candidates?.length && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-sm" style={{ color: '#b0bcd4' }}>
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
                <p className="text-sm font-medium" style={{ color: '#1e2b3c' }}>{c.title}</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${PRIORITY_COLORS[c.priority]}`}>
                  {PRIORITY_LABELS[c.priority]}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-xs ${CANDIDATE_STATUS_COLORS[c.status]}`}>
                  {CANDIDATE_STATUS_LABELS[c.status]}
                </span>
                {c.category && <span className="text-xs" style={{ color: '#a0aec0' }}>{c.category}</span>}
                {c.deadline && (
                  <span className="text-xs font-medium" style={{ color: '#ef4444' }}>
                    締切: {format(new Date(c.deadline), 'M/d', { locale: ja })}
                  </span>
                )}
              </div>
            </Link>
          ))}
          {!candidates?.length && (
            <p className="text-center text-sm py-8" style={{ color: '#b0bcd4' }}>投稿候補がありません</p>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
