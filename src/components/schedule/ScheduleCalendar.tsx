'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, addWeeks, subWeeks, isSameMonth, isSameDay, isToday, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Platform = 'instagram' | 'facebook' | 'x' | 'line'
type PostStatus = 'draft' | 'ready' | 'scheduled' | 'published' | 'skipped' | 'failed'

interface ScheduledPost {
  id: string
  post_candidate_id: string
  platform: Platform
  post_text: string | null
  hashtags: string | null
  scheduled_at: string
  status: PostStatus
  post_candidates: {
    id: string
    title: string
    category: string | null
    priority: string
    status: string
  }
}

interface Candidate {
  id: string
  title: string
  category: string | null
  priority: string
  status: string
  platforms: Platform[]
  event_date: string | null
  deadline: string | null
}

const PLATFORM_CONFIG: Record<Platform, { label: string; color: string; bg: string; dot: string }> = {
  instagram: { label: 'Instagram', color: 'text-pink-700', bg: 'bg-pink-50 border-pink-200', dot: 'bg-pink-500' },
  facebook:  { label: 'Facebook',  color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200',  dot: 'bg-blue-500'  },
  x:         { label: 'X',         color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200',  dot: 'bg-gray-700'  },
  line:      { label: 'LINE',      color: 'text-green-700',bg: 'bg-green-50 border-green-200',dot: 'bg-green-500' },
}

const STATUS_CONFIG: Record<PostStatus, { label: string; color: string }> = {
  draft:     { label: '下書き',   color: 'bg-gray-100 text-gray-600' },
  ready:     { label: '準備完了', color: 'bg-yellow-100 text-yellow-700' },
  scheduled: { label: '予定済み', color: 'bg-indigo-100 text-indigo-700' },
  published: { label: '投稿済み', color: 'bg-green-100 text-green-700' },
  skipped:   { label: 'スキップ', color: 'bg-gray-100 text-gray-500' },
  failed:    { label: '失敗',     color: 'bg-red-100 text-red-700' },
}

export default function ScheduleCalendar() {
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [posts, setPosts] = useState<ScheduledPost[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [addForm, setAddForm] = useState({
    post_candidate_id: '',
    platform: 'instagram' as Platform,
    scheduled_date: '',
    scheduled_time: '10:00',
  })
  const [saving, setSaving] = useState(false)

  // ── 新規作成モード用 ──
  const [addMode, setAddMode] = useState<'existing' | 'new'>('existing')
  const [newForm, setNewForm] = useState({ title: '', source_url: '', source_name: '', raw_text: '', category: '', event_date: '', deadline: '' })
  const [importInput, setImportInput] = useState<'url' | 'pdf'>('url')
  const [urlFetching, setUrlFetching] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const [pdfjsReady, setPdfjsReady] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // PDF.js を読み込む
  useEffect(() => {
    if (typeof window === 'undefined') return
    const w = window as unknown as Record<string, unknown>
    if (w.pdfjsLib) { setPdfjsReady(true); return }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.onload = () => {
      const pdfjs = (window as unknown as Record<string, { GlobalWorkerOptions: { workerSrc: string } }>).pdfjsLib
      if (pdfjs) pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      setPdfjsReady(true)
    }
    document.head.appendChild(script)
  }, [])

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth() + 1
    try {
      const res = await fetch(`/api/schedule?year=${year}&month=${month}`)
      const data = await res.json()
      setPosts(Array.isArray(data) ? data : [])
    } catch {
      setPosts([])
    } finally {
      setLoading(false)
    }
  }, [currentDate])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const fetchCandidates = async () => {
    try {
      const res = await fetch('/api/candidates')
      const data = await res.json()
      setCandidates(Array.isArray(data) ? data : [])
    } catch { setCandidates([]) }
  }

  const resetNewForm = () => {
    setNewForm({ title: '', source_url: '', source_name: '', raw_text: '', category: '', event_date: '', deadline: '' })
    setImportMsg(''); setImportInput('url')
  }

  const openAddModal = (date?: Date) => {
    fetchCandidates()
    setAddMode('existing')
    resetNewForm()
    setAddForm(f => ({
      ...f,
      post_candidate_id: '',
      scheduled_date: date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    }))
    setShowAddModal(true)
  }

  // URLを読み込んで新規フォームに反映
  const handleImportUrl = async () => {
    if (!newForm.source_url) return
    setUrlFetching(true); setImportMsg('')
    try {
      const res = await fetch('/api/ai/fetch-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: newForm.source_url }) })
      const data = await res.json()
      if (data.fetch_success && data.items?.length > 0) {
        const item = data.items[0]
        setNewForm(f => ({
          ...f,
          title: item.title || f.title,
          source_name: data.site_name || f.source_name,
          raw_text: item.raw_text || f.raw_text,
          category: item.category || f.category,
          event_date: item.event_date || f.event_date,
          deadline: item.deadline || f.deadline,
        }))
        setImportMsg(data.items.length > 1 ? `✅ ${data.items.length}件のうち最初の情報を反映しました（必要なら本文を編集してください）` : '✅ 内容を読み取りました')
      } else {
        setImportMsg('⚠️ 自動で読み取れませんでした。タイトル・本文を手入力してください。')
      }
    } catch {
      setImportMsg('⚠️ 読み取りに失敗しました。タイトル・本文を手入力してください。')
    } finally {
      setUrlFetching(false)
    }
  }

  // PDFを読み込んで新規フォームに反映
  const handleImportPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setPdfLoading(true); setImportMsg('')
    try {
      type PdfJs = { getDocument: (o: { data: ArrayBuffer }) => { promise: Promise<{ numPages: number; getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: Array<{ str: string }> }> }> }> } }
      const pdfjs = (window as unknown as Record<string, PdfJs>).pdfjsLib
      if (!pdfjs) throw new Error('PDF.jsが読み込まれていません')
      const ab = await file.arrayBuffer()
      const pdf = await pdfjs.getDocument({ data: ab }).promise
      let txt = ''
      for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
        const page = await pdf.getPage(i)
        const c = await page.getTextContent()
        txt += c.items.map(x => x.str).join(' ') + '\n'
      }
      if (txt.trim().length < 20) { setImportMsg('⚠️ テキストを読み取れませんでした（画像のみのPDFは非対応）'); return }
      const res = await fetch('/api/ai/from-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: txt, filename: file.name }) })
      if (!res.ok) throw new Error('API error')
      const r = await res.json()
      setNewForm(f => ({
        ...f,
        title: (r.title as string) || f.title,
        raw_text: (r.summary as string) || f.raw_text,
        category: (r.category as string) || f.category,
        event_date: (r.event_date as string) || f.event_date,
        deadline: (r.deadline as string) || f.deadline,
      }))
      setImportMsg('✅ PDFを読み取りました')
    } catch (err) {
      setImportMsg('⚠️ PDF分析に失敗しました: ' + String(err))
    } finally {
      setPdfLoading(false)
    }
  }

  const handleAddSchedule = async () => {
    if (!addForm.scheduled_date) return
    const scheduled_at = `${addForm.scheduled_date}T${addForm.scheduled_time}:00`
    setSaving(true)
    try {
      let candidateId = addForm.post_candidate_id

      if (addMode === 'new') {
        if (!newForm.title.trim()) { setSaving(false); return }
        // 新しい投稿候補を作成（後から投稿候補ページでAI生成・編集できる）
        const supabase = createClient()
        const { data: created, error } = await supabase
          .from('post_candidates')
          .insert({
            title: newForm.title.trim(),
            source_url: newForm.source_url || null,
            source_name: newForm.source_name || null,
            raw_text: newForm.raw_text || null,
            category: newForm.category || null,
            event_date: newForm.event_date || null,
            deadline: newForm.deadline || null,
            status: 'drafting',
            priority: 'medium',
            importance: 'normal',
            platforms: [addForm.platform],
          })
          .select('id')
          .single()
        if (error || !created) { alert('候補の作成に失敗しました: ' + (error?.message || '')); setSaving(false); return }
        candidateId = created.id
      }

      if (!candidateId) { setSaving(false); return }

      await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_candidate_id: candidateId,
          platform: addForm.platform,
          scheduled_at,
        }),
      })
      setShowAddModal(false)
      setAddForm({ post_candidate_id: '', platform: 'instagram', scheduled_date: '', scheduled_time: '10:00' })
      resetNewForm()
      await fetchPosts()
    } finally {
      setSaving(false)
    }
  }

  const canSubmit = addMode === 'existing'
    ? !!addForm.post_candidate_id && !!addForm.scheduled_date
    : !!newForm.title.trim() && !!addForm.scheduled_date

  const getPostsForDay = (date: Date) => {
    return posts.filter(p => isSameDay(parseISO(p.scheduled_at), date))
  }

  // ── 月ビュー用カレンダー日付生成 ──
  const buildMonthDays = () => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 })
    const days: Date[] = []
    let d = start
    while (d <= end) { days.push(d); d = addDays(d, 1) }
    return days
  }

  // ── 週ビュー用日付生成 ──
  const buildWeekDays = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 })
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }

  const prev = () => viewMode === 'month' ? setCurrentDate(subMonths(currentDate, 1)) : setCurrentDate(subWeeks(currentDate, 1))
  const next = () => viewMode === 'month' ? setCurrentDate(addMonths(currentDate, 1)) : setCurrentDate(addWeeks(currentDate, 1))
  const goToday = () => setCurrentDate(new Date())

  const headerLabel = viewMode === 'month'
    ? format(currentDate, 'yyyy年M月', { locale: ja })
    : (() => {
        const days = buildWeekDays()
        return `${format(days[0], 'yyyy年M月d日', { locale: ja })} 〜 ${format(days[6], 'M月d日', { locale: ja })}`
      })()

  const selectedDayPosts = selectedDate ? getPostsForDay(selectedDate) : []

  return (
    <div className="flex gap-6 h-full">
      {/* ── メインカレンダー ── */}
      <div className="flex-1 min-w-0">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button onClick={prev} className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
            </button>
            <h2 className="text-xl font-bold text-gray-800 min-w-[200px] text-center">{headerLabel}</h2>
            <button onClick={next} className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
            </button>
            <button onClick={goToday} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors">
              今日
            </button>
          </div>
          <div className="flex items-center gap-3">
            {/* ビュー切替 */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 text-sm rounded-md transition-all ${viewMode === 'month' ? 'bg-white shadow text-gray-800 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
              >月
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 text-sm rounded-md transition-all ${viewMode === 'week' ? 'bg-white shadow text-gray-800 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
              >週
              </button>
            </div>
            <button
              onClick={() => openAddModal()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
              投稿を追加
            </button>
          </div>
        </div>

        {/* カレンダー本体 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
              <div key={d} className={`py-3 text-center text-xs font-semibold ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'}`}>
                {d}
              </div>
            ))}
          </div>

          {viewMode === 'month' ? (
            // ── 月ビュー ──
            <div className="grid grid-cols-7">
              {buildMonthDays().map((day, idx) => {
                const dayPosts = getPostsForDay(day)
                const isCurrentMonth = isSameMonth(day, currentDate)
                const isSelected = selectedDate && isSameDay(day, selectedDate)
                const todayFlag = isToday(day)
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDate(isSameDay(day, selectedDate!) ? null : day)}
                    className={`min-h-[100px] p-2 border-b border-r border-gray-50 cursor-pointer transition-colors ${
                      !isCurrentMonth ? 'bg-gray-50/50' : 'hover:bg-indigo-50/30'
                    } ${isSelected ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-200' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`w-7 h-7 flex items-center justify-center text-sm rounded-full font-medium ${
                        todayFlag ? 'bg-indigo-600 text-white' :
                        !isCurrentMonth ? 'text-gray-300' :
                        idx % 7 === 0 ? 'text-red-400' :
                        idx % 7 === 6 ? 'text-blue-400' : 'text-gray-700'
                      }`}>
                        {format(day, 'd')}
                      </span>
                      {isCurrentMonth && (
                        <button
                          onClick={e => { e.stopPropagation(); openAddModal(day) }}
                          className="opacity-0 group-hover:opacity-100 hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-gray-300 hover:text-indigo-500 hover:bg-indigo-100 transition-all"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
                        </button>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {dayPosts.slice(0, 3).map(post => {
                        const cfg = PLATFORM_CONFIG[post.platform]
                        return (
                          <div key={post.id} className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border truncate ${cfg.bg} ${cfg.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`}></span>
                            <span className="truncate">{post.post_candidates?.title || '(無題)'}</span>
                          </div>
                        )
                      })}
                      {dayPosts.length > 3 && (
                        <div className="text-xs text-gray-400 pl-1">+{dayPosts.length - 3}件</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            // ── 週ビュー ──
            <div>
              <div className="grid grid-cols-7 divide-x divide-gray-100">
                {buildWeekDays().map((day, idx) => {
                  const dayPosts = getPostsForDay(day)
                  const isSelected = selectedDate && isSameDay(day, selectedDate)
                  const todayFlag = isToday(day)
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDate(isSameDay(day, selectedDate!) ? null : day)}
                      className={`min-h-[300px] cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                    >
                      <div className={`py-3 text-center border-b border-gray-100 ${todayFlag ? 'bg-indigo-600' : ''}`}>
                        <div className={`text-xs font-medium ${todayFlag ? 'text-indigo-200' : idx === 0 ? 'text-red-400' : idx === 6 ? 'text-blue-400' : 'text-gray-500'}`}>
                          {format(day, 'E', { locale: ja })}
                        </div>
                        <div className={`text-2xl font-bold mt-0.5 ${todayFlag ? 'text-white' : 'text-gray-800'}`}>
                          {format(day, 'd')}
                        </div>
                        {dayPosts.length > 0 && (
                          <div className={`text-xs mt-0.5 ${todayFlag ? 'text-indigo-200' : 'text-indigo-500'}`}>{dayPosts.length}件</div>
                        )}
                      </div>
                      <div className="p-2 space-y-1.5">
                        {dayPosts.map(post => {
                          const cfg = PLATFORM_CONFIG[post.platform]
                          return (
                            <div key={post.id} className={`p-2 rounded-lg border text-xs ${cfg.bg} ${cfg.color}`}>
                              <div className="flex items-center gap-1 mb-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
                                <span className="font-medium">{cfg.label}</span>
                                <span className="ml-auto text-gray-400">{format(parseISO(post.scheduled_at), 'HH:mm')}</span>
                              </div>
                              <div className="truncate text-gray-700">{post.post_candidates?.title}</div>
                            </div>
                          )
                        })}
                        <button
                          onClick={e => { e.stopPropagation(); openAddModal(day) }}
                          className="w-full py-1.5 rounded-lg border border-dashed border-gray-200 text-xs text-gray-300 hover:text-indigo-400 hover:border-indigo-200 transition-colors"
                        >
                          + 追加
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* プラットフォーム凡例 */}
        <div className="flex items-center gap-4 mt-3 px-1">
          {(Object.entries(PLATFORM_CONFIG) as [Platform, typeof PLATFORM_CONFIG[Platform]][]).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`}></span>
              {cfg.label}
            </div>
          ))}
          {loading && <span className="text-xs text-gray-400 ml-auto">読み込み中...</span>}
        </div>
      </div>

      {/* ── サイドパネル ── */}
      {selectedDate && (
        <div className="w-80 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #667eea15, #764ba215)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-500">{format(selectedDate, 'yyyy年', { locale: ja })}</div>
                  <div className="text-xl font-bold text-gray-800">{format(selectedDate, 'M月d日（E）', { locale: ja })}</div>
                </div>
                <button
                  onClick={() => openAddModal(selectedDate)}
                  className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-100 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                </button>
              </div>
              <div className="mt-1 text-sm text-gray-500">{selectedDayPosts.length}件の投稿予定</div>
            </div>

            {selectedDayPosts.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <div className="text-4xl mb-3">📅</div>
                <p className="text-sm text-gray-400">この日の投稿予定はありません</p>
                <button
                  onClick={() => openAddModal(selectedDate)}
                  className="mt-4 px-4 py-2 text-sm rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                  投稿を追加する
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {selectedDayPosts.map(post => {
                  const cfg = PLATFORM_CONFIG[post.platform]
                  const statusCfg = STATUS_CONFIG[post.status]
                  return (
                    <div key={post.id} className="px-5 py-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${statusCfg.color}`}>{statusCfg.label}</span>
                        <span className="ml-auto text-xs text-gray-400">{format(parseISO(post.scheduled_at), 'HH:mm')}</span>
                      </div>
                      <Link href={`/candidates/${post.post_candidate_id}`} className="block hover:text-indigo-600 transition-colors">
                        <p className="text-sm font-medium text-gray-800 line-clamp-2">{post.post_candidates?.title}</p>
                        {post.post_candidates?.category && (
                          <p className="text-xs text-gray-400 mt-0.5">{post.post_candidates.category}</p>
                        )}
                      </Link>
                      {post.post_text && (
                        <p className="text-xs text-gray-500 mt-2 line-clamp-3 leading-relaxed">{post.post_text}</p>
                      )}
                      {!post.post_text && (
                        <Link href={`/candidates/${post.post_candidate_id}`} className="inline-block mt-2 text-xs text-indigo-600 hover:underline">
                          ✍️ AI投稿文を生成する →
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 投稿追加モーダル ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">投稿予定を追加</h3>
              <p className="text-sm text-gray-500 mt-0.5">既存の候補から選ぶか、新しく作成できます</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* モード切替 */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setAddMode('existing')}
                  className={`flex-1 py-2 text-sm rounded-md transition-all ${addMode === 'existing' ? 'bg-white shadow text-gray-800 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                >既存の候補から
                </button>
                <button
                  onClick={() => setAddMode('new')}
                  className={`flex-1 py-2 text-sm rounded-md transition-all ${addMode === 'new' ? 'bg-white shadow text-gray-800 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                >＋ 新しく作る
                </button>
              </div>

              {addMode === 'existing' ? (
                /* 投稿候補選択 */
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">投稿候補 <span className="text-red-500">*</span></label>
                  <select
                    value={addForm.post_candidate_id}
                    onChange={e => setAddForm(f => ({ ...f, post_candidate_id: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    <option value="">-- 選択してください --</option>
                    {candidates.map(c => (
                      <option key={c.id} value={c.id}>{c.title}{c.category ? ` (${c.category})` : ''}</option>
                    ))}
                  </select>
                </div>
              ) : (
                /* 新規作成 */
                <div className="space-y-3">
                  {/* 取り込み方法 */}
                  <div className="flex rounded-lg overflow-hidden border border-gray-200 w-fit">
                    {([{ k: 'url' as const, l: '🔗 URLから' }, { k: 'pdf' as const, l: '📄 PDFから' }]).map(m => (
                      <button key={m.k} type="button" onClick={() => { setImportInput(m.k); setImportMsg('') }} className="px-3 py-1.5 text-xs font-medium transition-colors" style={importInput === m.k ? { background: '#4f46e5', color: '#fff' } : { background: '#f8fafc', color: '#64748b' }}>{m.l}</button>
                    ))}
                  </div>

                  {importInput === 'url' ? (
                    <div className="flex gap-2">
                      <input type="url" value={newForm.source_url} onChange={e => setNewForm(f => ({ ...f, source_url: e.target.value }))} placeholder="https://..." className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                      <button type="button" onClick={handleImportUrl} disabled={!newForm.source_url || urlFetching} className="px-3 py-2 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-600 border border-indigo-200 disabled:opacity-50 whitespace-nowrap">{urlFetching ? '読み取り中...' : '🔍 読み込む'}</button>
                    </div>
                  ) : (
                    <div>
                      <div className="border-2 border-dashed border-indigo-300 rounded-xl p-5 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                        <div className="text-2xl mb-1">📎</div>
                        <p className="text-xs font-medium text-gray-700">{pdfLoading ? 'PDFを解析中...' : 'クリックしてチラシPDFを選択'}</p>
                        <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleImportPdf} className="hidden" />
                      </div>
                      {!pdfjsReady && <p className="text-xs text-amber-600 mt-1">PDF読み取りエンジンを準備中...</p>}
                    </div>
                  )}

                  {importMsg && <p className="text-xs text-gray-600">{importMsg}</p>}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">タイトル <span className="text-red-500">*</span></label>
                    <input value={newForm.title} onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))} placeholder="投稿のタイトル" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">本文・メモ（任意）</label>
                    <textarea value={newForm.raw_text} onChange={e => setNewForm(f => ({ ...f, raw_text: e.target.value }))} rows={4} placeholder="URL/PDFを読み込むと自動入力されます。後から投稿候補ページでAI投稿文を生成できます。" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <p className="text-xs text-gray-400">※ 作成後、投稿候補ページで「AI投稿文を生成」できます。</p>
                </div>
              )}

              {/* プラットフォーム */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">プラットフォーム</label>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.entries(PLATFORM_CONFIG) as [Platform, typeof PLATFORM_CONFIG[Platform]][]).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setAddForm(f => ({ ...f, platform: key }))}
                      className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                        addForm.platform === key
                          ? `${cfg.bg} ${cfg.color} border-current shadow-sm`
                          : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 日付・時刻 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">投稿予定日 <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={addForm.scheduled_date}
                    onChange={e => setAddForm(f => ({ ...f, scheduled_date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">投稿時刻</label>
                  <input
                    type="time"
                    value={addForm.scheduled_time}
                    onChange={e => setAddForm(f => ({ ...f, scheduled_time: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleAddSchedule}
                disabled={saving || !canSubmit}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
              >
                {saving ? '保存中...' : '予定を追加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
