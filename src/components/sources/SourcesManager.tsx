'use client'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'

interface Source {
  id: string; name: string; url: string; category: string | null
  crawl_frequency: 'daily' | 'weekly' | 'manual'; is_active: boolean
  last_crawled_at: string | null; last_found_count: number
  notes: string | null; created_at: string
}
const FREQ_LABELS = { daily: '📅 毎日', weekly: '📆 週1回', manual: '🖱️ 手動のみ' }
const FREQ_COLORS = { daily: 'bg-green-100 text-green-700', weekly: 'bg-blue-100 text-blue-700', manual: 'bg-gray-100 text-gray-600' }
type FormData = { name: string; url: string; category: string; crawl_frequency: 'daily'|'weekly'|'manual'; notes: string }

export function SourcesManager() {
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingSource, setEditingSource] = useState<Source | null>(null)
  const [saving, setSaving] = useState(false)
  const [newForm, setNewForm] = useState<FormData>({ name:'', url:'', category:'', crawl_frequency:'weekly', notes:'' })
  const [editForm, setEditForm] = useState<FormData>({ name:'', url:'', category:'', crawl_frequency:'weekly', notes:'' })
  const load = useCallback(async () => {
    setLoading(true)
    try { const res = await fetch('/api/sources'); if (res.ok) setSources(await res.json()) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])
  function startEdit(source: Source) {
    setEditingSource(source)
    setEditForm({ name: source.name, url: source.url, category: source.category || '', crawl_frequency: source.crawl_frequency, notes: source.notes || '' })
  }
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch('/api/sources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newForm) })
      if (res.ok) { setNewForm({ name:'', url:'', category:'', crawl_frequency:'weekly', notes:'' }); setShowAdd(false); await load() }
      else { const err = await res.json(); alert(err.error || '登録に失敗しました') }
    } finally { setSaving(false) }
  }
  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); if (!editingSource) return; setSaving(true)
    try {
      const res = await fetch('/api/sources/' + editingSource.id, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editForm.name, url: editForm.url, category: editForm.category || null, crawl_frequency: editForm.crawl_frequency, notes: editForm.notes || null })
      })
      if (res.ok) { setEditingSource(null); await load() } else alert('更新に失敗しました')
    } finally { setSaving(false) }
  }
  async function handleToggleActive(source: Source) {
    await fetch('/api/sources/' + source.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !source.is_active }) })
    await load()
  }
  async function handleDelete(source: Source) {
    if (!confirm('「' + source.name + '」を削除しますか？')) return
    await fetch('/api/sources/' + source.id, { method: 'DELETE' }); await load()
  }
  const activeSources = sources.filter(s => s.is_active)
  const inactiveSources = sources.filter(s => !s.is_active)
  if (loading) return <div className="text-sm text-gray-500 p-8 text-center">読み込み中...</div>
  return (
    <div className="space-y-6">
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
        <h2 className="font-semibold text-indigo-800 mb-2">🔄 定期巡回サイトの管理</h2>
        <p className="text-sm text-indigo-700">ここで登録したサイトは「AI情報収集」機能で定期的にチェックされます。</p>
      </div>
      <div className="flex justify-between items-center">
        <div><span className="text-sm text-gray-600">有効: <strong>{activeSources.length}件</strong></span><span className="text-sm text-gray-400 ml-3">無効: {inactiveSources.length}件</span></div>
        <Button onClick={() => { setShowAdd(!showAdd); setEditingSource(null) }} size="sm">＋ サイトを追加</Button>
      </div>
      {showAdd && <SourceForm title="新しい巡回サイトを追加" form={newForm} setForm={setNewForm} onSubmit={handleAdd} onCancel={() => setShowAdd(false)} saving={saving} submitLabel="登録する" />}
      {editingSource && <SourceForm title={'「' + editingSource.name + '」を編集'} form={editForm} setForm={setEditForm} onSubmit={handleEdit} onCancel={() => setEditingSource(null)} saving={saving} submitLabel="保存する" highlight />}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-700 text-sm">✅ 有効なサイト</h3>
        {activeSources.length === 0 && <p className="text-sm text-gray-500 py-4 text-center">なし</p>}
        {activeSources.map(s => <SourceCard key={s.id} source={s} isEditing={editingSource?.id === s.id} onEdit={() => startEdit(s)} onToggleActive={handleToggleActive} onDelete={handleDelete} />)}
      </div>
      {inactiveSources.length > 0 && <div className="space-y-3"><h3 className="font-semibold text-gray-400 text-sm">⏸️ 停止中</h3>
        {inactiveSources.map(s => <SourceCard key={s.id} source={s} isEditing={editingSource?.id === s.id} onEdit={() => startEdit(s)} onToggleActive={handleToggleActive} onDelete={handleDelete} />)}
      </div>}
    </div>
  )
}
function SourceForm({ title, form, setForm, onSubmit, onCancel, saving, submitLabel, highlight }: {
  title: string; form: FormData; setForm: (f: FormData) => void
  onSubmit: (e: React.FormEvent) => void; onCancel: () => void
  saving: boolean; submitLabel: string; highlight?: boolean
}) {
  return (
    <form onSubmit={onSubmit} className={'bg-white rounded-xl p-5 space-y-4 ' + (highlight ? 'border-2 border-amber-400' : 'border-2 border-indigo-300')}>
      <h3 className="font-semibold text-gray-800">{title}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-xs font-medium text-gray-600 mb-1">サイト名 *</label>
          <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="例: 中小企業庁" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
        <div><label className="block text-xs font-medium text-gray-600 mb-1">URL *</label>
          <input required type="url" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-xs font-medium text-gray-600 mb-1">カテゴリ</label>
          <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
        <div><label className="block text-xs font-medium text-gray-600 mb-1">巡回頻度</label>
          <select value={form.crawl_frequency} onChange={e => setForm({ ...form, crawl_frequency: e.target.value as 'daily'|'weekly'|'manual' })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="daily">毎日</option><option value="weekly">週1回</option><option value="manual">手動</option>
          </select></div>
      </div>
      <div><label className="block text-xs font-medium text-gray-600 mb-1">メモ</label>
        <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
      <div className="flex gap-2">
        <Button type="submit" loading={saving} size="sm">{submitLabel}</Button>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>キャンセル</Button>
      </div>
    </form>
  )
}
function SourceCard({ source, isEditing, onEdit, onToggleActive, onDelete }: {
  source: Source; isEditing: boolean
  onEdit: () => void; onToggleActive: (s: Source) => void; onDelete: (s: Source) => void
}) {
  return (
    <div className={'bg-white rounded-xl border p-4 ' + (isEditing ? 'border-amber-400 bg-amber-50' : source.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-gray-800 text-sm">{source.name}</p>
            <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' + FREQ_COLORS[source.crawl_frequency]}>{FREQ_LABELS[source.crawl_frequency]}</span>
            {source.category && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{source.category}</span>}
          </div>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{source.url}</p>
          {source.notes && <p className="text-xs text-gray-500 mt-0.5">{source.notes}</p>}
          <div className="flex gap-4 mt-1 text-xs text-gray-400">
            {source.last_crawled_at && <span>最終確認: {new Date(source.last_crawled_at).toLocaleDateString('ja-JP')}</span>}
            {source.last_found_count > 0 && <span>前回取得: {source.last_found_count}件</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={onEdit} className="text-xs text-indigo-600 hover:underline font-medium">✏️ 編集</button>
          <button type="button" onClick={() => onToggleActive(source)} className={'text-xs px-2.5 py-1 rounded-lg border ' + (source.is_active ? 'text-gray-600 border-gray-300' : 'text-green-600 border-green-300')}>
            {source.is_active ? '停止' : '有効化'}
          </button>
          <button type="button" onClick={() => onDelete(source)} className="text-xs text-red-400 hover:text-red-600">削除</button>
        </div>
      </div>
    </div>
  )
}
