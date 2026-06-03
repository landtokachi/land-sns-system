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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{candidates?.length ?? 0}件</p>
          <Link
            href="/candidates/new"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            ＋ 新規登録
          </Link>
        </div>

        {/* Filters */}
        <form className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
          <input
            name="q"
            defaultValue={params.q}
            placeholder="タイトルで検索"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
          />
          <select
            name="status"
            defaultValue={params.status}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">全ステータス</option>
            {Object.entries(CANDIDATE_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <select
            name="priority"
            defaultValue={params.priority}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">全優先度</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
          <select
            name="category"
            defaultValue={params.category}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">全カテゴリ</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            type="submit"
            className="bg-gray-100 text-gray-700 px-4 py-1.5 rounded-lg text-sm hover:bg-gray-200"
          >
            検索
          </button>
          <Link href="/candidates" className="text-sm text-gray-400 py-1.5">リセット</Link>
        </form>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">タイトル</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">カテゴリ</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">情報元</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">締切日</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">投稿予定</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">優先度</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ステータス</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">更新日</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(candidates as PostCandidate[])?.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/candidates/${c.id}`} className="font-medium text-indigo-600 hover:underline line-clamp-1">
                      {c.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{c.category || '-'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{c.source_name || '-'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {c.deadline ? format(new Date(c.deadline), 'M/d', { locale: ja }) : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {c.scheduled_at ? format(new Date(c.scheduled_at), 'M/d', { locale: ja }) : '-'}
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
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {format(new Date(c.updated_at), 'M/d', { locale: ja })}
                  </td>
                </tr>
              ))}
              {!candidates?.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    投稿候補がありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  )
}
