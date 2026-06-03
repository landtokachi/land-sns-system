'use client'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'

interface Source {
  id: string
  name: string
  url: string
  category: string | null
  crawl_frequency: 'daily' | 'weekly' | 'manual'
  is_active: boolean
  last_crawled_at: string | null
  last_found_count: number
  notes: string | null
  created_at: string
}

const FREQ_LABELS = {
  daily: '📅 毎日',
  weekly: '📆 週1回',
  manual: '🖱️ 手動のみ',
}

const FREQ_COLORS = {
  daily: 'bg-green-100 text-green-700',
  weekly: 'bg-blue-100 text-blue-700',
  manual: 'bg-gray-100 text-gray-600',
}

export function SourcesManager() {
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [newForm, setNewForm] = useState({
    name: '',
    url: '',
    category: '',
    crawl_frequency: 'weekly' as 'daily' | 'weekly' | 'manual',
    notes: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/sources')
      if (res.ok) setSources(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newForm),
      })
      if (res.ok) {
        setNewForm({ name: '', url: '', category: '', crawl_frequency: 'weekly', notes: '' })
        setShowAdd(false)
        await load()
      } else {
        const err = await res.json()
        alert(err.error || '登録に失敗しました')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(source: Source) {
    await fetch(`/api/sources/${source.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !source.is_active }),
    })
    await load()
  }

  async function handleFreqChange(source: Source, freq: 'daily' | 'weekly' | 'manual') {
    await fetch(`/api/sources/${source.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crawl_frequency: freq }),
    })
    setEditId(null)
    await load()
  }

  async function handleDelete(source: Source) {
    if (!confirm(`「${source.name}」を削除しますか？`)) return
    await fetch(`/api/sources/${source.id}`, { method: 'DELETE' })
    await load()
  }

  const activeSources = sources.filter(s => s.is_active)
  const inactiveSources = sources.filter(s => !s.is_active)

  if (loading) return <div className="text-sm text-gray-500 p-8 text-center">読み込み中...</div>

  return (
    <div className="space-y-6">
      {/* 説明 */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
        <h2 className="font-semibold text-indigo-800 mb-2">🔄 定期巡回サイトの管理</h2>
        <p className="text-sm text-indigo-700 leading-relaxed">
          ここで登録したサイトは「AI情報収集」機能で定期的にチェックされ、新しい投稿候補が自動で追加されます。<br />
          新規登録時にURLを貼り付けて巡回登録したサイトもここに表示されます。
        </p>
        <div className="flex gap-4 mt-3 text-xs text-indigo-600">
          <span>📅 毎日 → 毎日自動チェック</span>
          <span>📆 週1回 → 週に1回チェック</span>
          <span>🖱️ 手動のみ → 自動チェックなし・手動実行のみ</span>
        </div>
      </div>

      {/* 追加ボタン */}
      <div className="flex justify-between items-center">
        <div>
          <span className="text-sm text-gray-600">有効: <strong>{activeSources.length}件</strong></span>
          <span className="text-sm text-gray-400 ml-3">無効: {inactiveSources.length}件</span>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} size="sm">
          ＋ サイトを追加
        </Button>
      </div>

      {/* 新規追加フォーム */}
      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white border-2 border-indigo-300 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-gray-800">新しい巡回サイトを追加</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">サイト名 <span className="text-red-500">*</span></label>
              <input
                required
                value={newForm.name}
                onChange={(e) => setNewForm(p => ({ ...p, name: e.target.value }))}
                placeholder="例: 中小企業庁"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">URL <span className="text-red-500">*</span></label>
              <input
                required
                type="url"
                value={newForm.url}
                onChange={(e) => setNewForm(p => ({ ...p, url: e.target.value }))}
                placeholder="https://..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">カテゴリ（任意）</label>
              <input
                value={newForm.category}
                onChange={(e) => setNewForm(p => ({ ...p, category: e.target.value }))}
                placeholder="補助金・助成金・支援制度 など"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">巡回頻度</label>
              <select
                value={newForm.crawl_frequency}
                onChange={(e) => setNewForm(p => ({ ...p, crawl_frequency: e.target.value as 'daily' | 'weekly' | 'manual' }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="daily">毎日チェック</option>
                <option value="weekly">週1回チェック</option>
                <option value="manual">手動のみ</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">メモ（任意）</label>
            <input
              value={newForm.notes}
              onChange={(e) => setNewForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="このサイトについての補足"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" loading={saving} size="sm">登録する</Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowAdd(false)}>キャンセル</Button>
          </div>
        </form>
      )}

      {/* 有効なサイト一覧 */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-700 text-sm">✅ 有効なサイト</h3>
        {activeSources.length === 0 && (
          <p className="text-sm text-gray-500 py-4 text-center">登録されているサイトがありません</p>
        )}
        {activeSources.map((source) => (
          <SourceCard
            key={source.id}
            source={source}
            editId={editId}
            setEditId={setEditId}
            onToggleActive={handleToggleActive}
            onFreqChange={handleFreqChange}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* 無効なサイト */}
      {inactiveSources.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-400 text-sm">⏸️ 停止中のサイト</h3>
          {inactiveSources.map((source) => (
            <SourceCard
              key={source.id}
              source={source}
              editId={editId}
              setEditId={setEditId}
              onToggleActive={handleToggleActive}
              onFreqChange={handleFreqChange}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SourceCard({
  source, editId, setEditId, onToggleActive, onFreqChange, onDelete,
}: {
  source: Source
  editId: string | null
  setEditId: (id: string | null) => void
  onToggleActive: (s: Source) => void
  onFreqChange: (s: Source, freq: 'daily' | 'weekly' | 'manual') => void
  onDelete: (s: Source) => void
}) {
  const isEditing = editId === source.id

  return (
    <div className={`bg-white rounded-xl border p-4 ${source.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-gray-800 text-sm">{source.name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FREQ_COLORS[source.crawl_frequency]}`}>
              {FREQ_LABELS[source.crawl_frequency]}
            </span>
            {source.category && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{source.category}</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{source.url}</p>
          {source.notes && <p className="text-xs text-gray-500 mt-0.5">{source.notes}</p>}
          <div className="flex gap-4 mt-1 text-xs text-gray-400">
            {source.last_crawled_at && (
              <span>最終確認: {new Date(source.last_crawled_at).toLocaleDateString('ja-JP')}</span>
            )}
            {source.last_found_count > 0 && (
              <span>前回取得: {source.last_found_count}件</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* 頻度変更 */}
          {isEditing ? (
            <div className="flex gap-1">
              {(['daily', 'weekly', 'manual'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => onFreqChange(source, f)}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    source.crawl_frequency === f
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                  }`}
                >
                  {f === 'daily' ? '毎日' : f === 'weekly' ? '週1' : '手動'}
                </button>
              ))}
              <button type="button" onClick={() => setEditId(null)} className="text-xs text-gray-400 px-1">✕</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditId(source.id)}
              className="text-xs text-indigo-600 hover:underline"
            >
              頻度変更
            </button>
          )}

          {/* 有効/無効切替 */}
          <button
            type="button"
            onClick={() => onToggleActive(source)}
            className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
              source.is_active
                ? 'text-gray-600 border-gray-300 hover:bg-gray-50'
                : 'text-green-600 border-green-300 hover:bg-green-50'
            }`}
          >
            {source.is_active ? '停止' : '有効化'}
          </button>

          {/* 削除 */}
          <button
            type="button"
            onClick={() => onDelete(source)}
            className="text-xs text-red-400 hover:text-red-600"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  )
}
