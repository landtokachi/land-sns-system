'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { CATEGORIES } from '@/lib/constants'
import type { PostCandidate } from '@/types'
import type { FetchUrlResponse, FetchUrlItem } from '@/app/api/ai/fetch-url/route'

interface CandidateFormProps { initial?: Partial<PostCandidate>; candidateId?: string }
type FreqOption = 'daily' | 'weekly' | 'manual' | 'none'
type InputMode = 'url' | 'pdf'
type Priority = 'high' | 'medium' | 'low'

export function CandidateForm({ initial, candidateId }: CandidateFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [urlFetching, setUrlFetching] = useState(false)
  const [fetchResult, setFetchResult] = useState<FetchUrlResponse | null>(null)
  const [selectedItem, setSelectedItem] = useState<FetchUrlItem | null>(null)
  const [applied, setApplied] = useState(false)
  const [crawlFreq, setCrawlFreq] = useState<FreqOption>('none')
  const [crawlRegistering, setCrawlRegistering] = useState(false)
  const [crawlDone, setCrawlDone] = useState(false)
  const [inputMode, setInputMode] = useState<InputMode>('url')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfResult, setPdfResult] = useState<Record<string, unknown> | null>(null)
  const [pdfApplied, setPdfApplied] = useState(false)
  const [pdfError, setPdfError] = useState('')
  const [pdfFullText, setPdfFullText] = useState('')
  const [pdfjsReady, setPdfjsReady] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const w = window as unknown as Record<string, unknown>
    if (w.pdfjsLib) { setPdfjsReady(true); return }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.onload = () => {
      const pdfjs = (window as unknown as Record<string, {GlobalWorkerOptions:{workerSrc:string}}> ).pdfjsLib
      if (pdfjs) pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      setPdfjsReady(true)
    }
    document.head.appendChild(script)
  }, [])

  const [form, setForm] = useState({
    title: initial?.title || '', source_url: initial?.source_url || '', source_name: initial?.source_name || '',
    raw_text: initial?.raw_text || '', category: initial?.category || '', sub_category: initial?.sub_category || '',
    region: initial?.region || '', target_audience: initial?.target_audience || '', event_date: initial?.event_date || '',
    deadline: initial?.deadline || '', organizer: initial?.organizer || '', application_url: initial?.application_url || '',
    priority: (initial?.priority || 'medium') as Priority, importance: initial?.importance || 'normal',
    status: initial?.status || 'unconfirmed',
    scheduled_at: initial?.scheduled_at ? initial.scheduled_at.slice(0, 10) : '',
    platforms: initial?.platforms || [],
  })

  function set(field: string, value: unknown) { setForm(prev => ({ ...prev, [field]: value })) }
  function togglePlatform(p: string) { setForm(prev => ({ ...prev, platforms: prev.platforms.includes(p as never) ? prev.platforms.filter(x => x !== p) : [...prev.platforms, p as never] })) }

  async function handleFetchUrl() {
    if (!form.source_url) return
    setUrlFetching(true); setFetchResult(null); setSelectedItem(null); setApplied(false); setCrawlDone(false)
    try {
      const res = await fetch('/api/ai/fetch-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: form.source_url }) })
      const data: FetchUrlResponse = await res.json()
      setFetchResult(data)
      if (data.items?.length === 1) setSelectedItem(data.items[0])
    } catch { setFetchResult({ fetch_success: false, site_name: null, page_type: 'unknown', items: [], unclear_points: ['取得に失敗しました'] }) }
    finally { setUrlFetching(false) }
  }

  function applyItem(item: FetchUrlItem) {
    setSelectedItem(item)
    setForm(prev => ({ ...prev, title: item.title||prev.title, source_name: fetchResult?.site_name||prev.source_name, raw_text: item.raw_text||prev.raw_text, category: item.category||prev.category, target_audience: item.target_audience||prev.target_audience, organizer: item.organizer||prev.organizer, event_date: item.event_date||prev.event_date, deadline: item.deadline||prev.deadline, application_url: item.application_url||prev.application_url, region: item.region||prev.region }))
    setApplied(true)
  }

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setPdfLoading(true); setPdfResult(null); setPdfApplied(false); setPdfError('')
    try {
      type PdfJs = { getDocument: (o:{data:ArrayBuffer})=>{promise:Promise<{numPages:number;getPage:(n:number)=>Promise<{getTextContent:()=>Promise<{items:Array<{str:string}>}>}>}>} }
      const pdfjs = (window as unknown as Record<string, PdfJs>).pdfjsLib
      if (!pdfjs) throw new Error('PDF.jsが読み込まれていません')
      const ab = await file.arrayBuffer()
      const pdf = await pdfjs.getDocument({data:ab}).promise
      let txt = ''
      for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
        const page = await pdf.getPage(i)
        const c = await page.getTextContent()
        txt += c.items.map(x => x.str).join(' ') + '\n'
      }
      if (txt.trim().length < 20) { setPdfError('テキストを読み取れませんでした（画像のみのPDFは非対応）'); return }
      setPdfFullText(txt)
      const res = await fetch('/api/ai/from-pdf', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({text:txt, filename:file.name}) })
      if (!res.ok) throw new Error('API error')
      setPdfResult(await res.json())
    } catch (err) { setPdfError('PDF分析に失敗しました: ' + String(err)) }
    finally { setPdfLoading(false) }
  }

  function applyPdfResult() {
    if (!pdfResult) return
    const isValidPriority = (v: unknown): v is Priority => v === 'high' || v === 'medium' || v === 'low'
    setForm(prev => ({ ...prev,
      title: (pdfResult.title as string)||prev.title, raw_text: (pdfFullText ? pdfFullText.slice(0,6000) : (pdfResult.summary as string))||prev.raw_text,
      category: (pdfResult.category as string)||prev.category, target_audience: (pdfResult.target_audience as string)||prev.target_audience,
      organizer: (pdfResult.organizer as string)||prev.organizer, event_date: (pdfResult.event_date as string)||prev.event_date,
      deadline: (pdfResult.deadline as string)||prev.deadline, region: (pdfResult.region as string)||prev.region,
      priority: isValidPriority(pdfResult.priority) ? pdfResult.priority : prev.priority,
    }))
    setPdfApplied(true)
  }

  async function handleRegisterCrawl() {
    if (!form.source_url || crawlFreq === 'none') return
    setCrawlRegistering(true)
    try { await fetch('/api/sources', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name: fetchResult?.site_name||form.source_name||form.source_url, url:form.source_url, category:form.category||null, crawl_frequency:crawlFreq, notes:'新規登録時に追加 ('+new Date().toLocaleDateString('ja-JP')+')' }) }); setCrawlDone(true) }
    catch { alert('巡回登録に失敗しました') }
    finally { setCrawlRegistering(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    const supabase = createClient()
    const payload = { ...form, scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null, event_date: form.event_date||null, deadline: form.deadline||null }
    if (candidateId) { await supabase.from('post_candidates').update(payload).eq('id', candidateId); router.push('/candidates/'+candidateId) }
    else {
      // 重複防止：同じタイトルの候補が既にあれば確認する
      const t = (form.title || '').trim()
      if (t) {
        const { data: dup } = await supabase.from('post_candidates').select('id').eq('title', t).limit(1)
        if (dup && dup.length > 0 && !confirm('同じタイトルの投稿候補がすでにあります。\nそれでも新しく登録しますか？（重複して保存されます）')) { setLoading(false); return }
      }
      const {data} = await supabase.from('post_candidates').insert(payload).select().single(); if (data) router.push('/candidates/'+data.id)
    }
    setLoading(false)
  }

  const freqLabels: Record<FreqOption, string> = { daily:'毎日チェック', weekly:'週1回チェック', manual:'手動のみ', none:'登録しない' }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h3 className="font-semibold text-gray-800">基本情報</h3>
        <div className="flex rounded-lg overflow-hidden border border-gray-200 w-fit">
          {([{k:'url' as InputMode,l:'🔗 URLから読み込む'},{k:'pdf' as InputMode,l:'📄 PDFからインポート'}]).map(m=>(
            <button key={m.k} type="button" onClick={()=>{setInputMode(m.k);setPdfResult(null);setPdfApplied(false);setPdfError('')}} className="px-4 py-2 text-sm font-medium transition-colors" style={inputMode===m.k?{background:'#4f46e5',color:'#fff'}:{background:'#f8fafc',color:'#64748b'}}>{m.l}</button>
          ))}
        </div>
        {inputMode==='url'&&<div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">元URL</label>
            <div className="flex gap-2">
              <input type="url" value={form.source_url} onChange={e=>{set('source_url',e.target.value);setFetchResult(null);setApplied(false);setCrawlDone(false)}} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="https://..."/>
              <Button type="button" onClick={handleFetchUrl} loading={urlFetching} disabled={!form.source_url||urlFetching} size="sm" variant="secondary">🔍 URLを読み込む</Button>
            </div>
          </div>
          {urlFetching&&<div className="flex items-center gap-3 bg-blue-50 rounded-lg p-4"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"/><p className="text-sm text-blue-700">AIがページ内容を読み取り中...</p></div>}
          {fetchResult&&!applied&&<div className="space-y-3">
            {!fetchResult.fetch_success&&<div className="bg-amber-50 border border-amber-200 rounded-lg p-4"><p className="text-sm font-semibold text-amber-700">⚠️ 自動読み取りできませんでした</p></div>}
            {fetchResult.fetch_success&&fetchResult.items.length>0&&<div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold text-indigo-800">{fetchResult.items.length>1?'📋 '+fetchResult.items.length+'件の情報が見つかりました':'✅ 内容を読み取りました'}</p>
              {fetchResult.items.map((item,i)=><div key={i} className="bg-white border border-indigo-100 rounded-lg p-3 cursor-pointer hover:border-indigo-400 transition-all" onClick={()=>applyItem(item)}><p className="text-sm font-medium text-gray-800">{item.title}</p><p className="text-xs text-indigo-600 mt-1 font-medium">→ この情報を使う</p></div>)}
            </div>}
          </div>}
          {applied&&<div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-sm text-green-700">✅ フォームに反映しました。</div>}
          {form.source_url&&fetchResult?.fetch_success&&!crawlDone&&<div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700">🔄 このサイトを定期巡回に登録しますか？</p>
            <div className="flex gap-2 flex-wrap">{(['daily','weekly','manual','none'] as FreqOption[]).map(freq=><button key={freq} type="button" onClick={()=>setCrawlFreq(freq)} className={'px-3 py-1.5 rounded-lg text-xs font-medium border '+(crawlFreq===freq?'bg-indigo-600 text-white border-indigo-600':'bg-white text-gray-600 border-gray-300')}>{freq==='daily'?'📅 毎日':freq==='weekly'?'📆 週1回':freq==='manual'?'🖱️ 手動のみ':'✕ しない'}</button>)}</div>
            {crawlFreq!=='none'&&<Button type="button" onClick={handleRegisterCrawl} loading={crawlRegistering} size="sm" variant="secondary">巡回登録（{freqLabels[crawlFreq]}）</Button>}
          </div>}
          {crawlDone&&<div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-sm text-blue-700">🔄 巡回サイトに登録しました</div>}
        </div>}
        {inputMode==='pdf'&&<div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4"><p className="text-sm font-semibold text-indigo-800 mb-1">📄 チラシ・PDFからSNS投稿候補を自動生成</p><p className="text-xs text-indigo-600">@land.tokachiの投稿傾向に基づいて優先度も自動設定します。</p></div>
          <div className="border-2 border-dashed border-indigo-300 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-colors" onClick={()=>fileInputRef.current?.click()}>
            <div className="text-4xl mb-2">📎</div><p className="text-sm font-medium text-gray-700">クリックしてPDFを選択</p>
            <p className="text-xs text-gray-400 mt-1">チラシ・募集要項・補助金案内 など</p>
            <input ref={fileInputRef} type="file" accept=".pdf" onChange={handlePdfUpload} className="hidden"/>
          </div>
          {!pdfjsReady&&<p className="text-xs text-amber-600">PDF読み取りエンジンを読み込み中...</p>}
          {pdfLoading&&<div className="flex items-center gap-3 bg-blue-50 rounded-xl p-4"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"/><p className="text-sm text-indigo-700">PDFを解析中...</p></div>}
          {pdfError&&<div className="bg-red-50 border border-red-200 rounded-xl p-4"><p className="text-sm text-red-700">⚠️ {pdfError}</p></div>}
          {pdfResult&&!pdfApplied&&<div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between"><p className="text-sm font-bold text-green-800">✅ PDF読み取り完了！</p>
              <span className={'text-xs font-bold px-2 py-0.5 rounded-full '+(pdfResult.priority==='high'?'bg-red-100 text-red-700':pdfResult.priority==='medium'?'bg-amber-100 text-amber-700':'bg-blue-100 text-blue-700')}>優先度: {pdfResult.priority==='high'?'🔴 高':pdfResult.priority==='medium'?'🟡 中':'🔵 低'}</span>
            </div>
            <div className="bg-white rounded-lg p-4 space-y-2 border border-green-100">
              <div><span className="text-xs font-semibold text-gray-500">タイトル</span><p className="text-sm font-bold text-gray-900 mt-0.5">{pdfResult.title as string}</p></div>
              <div><span className="text-xs font-semibold text-gray-500">要約</span><p className="text-sm text-gray-600 mt-0.5">{pdfResult.summary as string}</p></div>
              <div className="flex gap-4">{(pdfResult.deadline as string)&&<div><span className="text-xs font-semibold text-gray-500">締切</span><p className="text-sm font-bold text-red-600 mt-0.5">{pdfResult.deadline as string}</p></div>}</div>
            </div>
            {(pdfResult.instagram_caption as string)&&<div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
              <p className="text-xs font-bold text-purple-700 mb-1">📸 Instagram投稿文（AI生成）</p>
              <p className="text-sm text-gray-800">{pdfResult.instagram_caption as string}</p>
              {(pdfResult.hashtags as string)&&<p className="text-xs text-purple-600 mt-2">{pdfResult.hashtags as string}</p>}
            </div>}
            <Button type="button" onClick={applyPdfResult} size="sm">📋 この内容をフォームに反映する</Button>
          </div>}
          {pdfApplied&&<div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">✅ フォームに反映しました。</div>}
        </div>}
        <div><label className="block text-sm font-medium text-gray-700 mb-1">タイトル <span className="text-red-500">*</span></label><input required value={form.title} onChange={e=>set('title',e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="投稿候補のタイトルを入力"/></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">情報元名</label><input value={form.source_name} onChange={e=>set('source_name',e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="中小企業庁 など"/></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">本文・メモ</label><textarea value={form.raw_text} onChange={e=>set('raw_text',e.target.value)} rows={5} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="URLかPDFを読み込むと自動入力されます"/></div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h3 className="font-semibold text-gray-800">分類・詳細情報</h3>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label><select value={form.category} onChange={e=>set('category',e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"><option value="">選択してください</option>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">小カテゴリ</label><input value={form.sub_category} onChange={e=>set('sub_category',e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"/></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">地域</label><input value={form.region} onChange={e=>set('region',e.target.value)} placeholder="全国/北海道/十勝" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"/></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">対象者</label><input value={form.target_audience} onChange={e=>set('target_audience',e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"/></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">開催日</label><input type="date" value={form.event_date} onChange={e=>set('event_date',e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"/></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">締切日</label><input type="date" value={form.deadline} onChange={e=>set('deadline',e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"/></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">主催者</label><input value={form.organizer} onChange={e=>set('organizer',e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"/></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">申込URL</label><input type="url" value={form.application_url} onChange={e=>set('application_url',e.target.value)} placeholder="https://..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"/></div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h3 className="font-semibold text-gray-800">投稿設定</h3>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">優先度</label><select value={form.priority} onChange={e=>set('priority',e.target.value as Priority)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">重要度</label><select value={form.importance} onChange={e=>set('importance',e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"><option value="important">重要</option><option value="normal">通常</option><option value="reference">参考</option></select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label><select value={form.status} onChange={e=>set('status',e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"><option value="unconfirmed">未確認</option><option value="candidate">投稿候補</option><option value="drafting">下書き中</option><option value="draft_created">下書き済み</option><option value="image_created">画像生成済み</option><option value="review_waiting">確認待ち</option><option value="ready">準備完了</option><option value="scheduled">投稿予定</option><option value="published">投稿済み</option><option value="skipped">見送り</option></select></div>
        </div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">投稿予定日</label><input type="date" value={form.scheduled_at} onChange={e=>set('scheduled_at',e.target.value)} className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm"/></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-2">投稿媒体</label><div className="flex gap-3">{(['instagram','facebook','x'] as const).map(p=><label key={p} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.platforms.includes(p)} onChange={()=>togglePlatform(p)} className="rounded text-indigo-600"/><span className="text-sm">{p==='x'?'X (Twitter)':p.charAt(0).toUpperCase()+p.slice(1)}</span></label>)}</div></div>
      </div>
      <div className="flex gap-3">
        <Button type="submit" loading={loading} size="lg">{candidateId?'更新する':'登録する'}</Button>
        <Button type="button" variant="secondary" size="lg" onClick={()=>router.back()}>キャンセル</Button>
      </div>
    </form>
  )
}
