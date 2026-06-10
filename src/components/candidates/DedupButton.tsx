'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function DedupButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function run() {
    if (!confirm('同じタイトルの重複候補を整理します。\n各タイトルにつき1件だけ残し、残りは削除します（投稿予定があるものは優先して残します）。\nよろしいですか？')) return
    setLoading(true)
    try {
      const res = await fetch('/api/candidates/dedup', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        alert(`重複を整理しました：${data.deleted}件を削除しました。`)
        router.refresh()
      } else {
        alert('整理に失敗しました: ' + (data.error || ''))
      }
    } catch {
      alert('整理に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={run}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
    >
      {loading ? '整理中...' : '🧹 重複を整理'}
    </button>
  )
}
