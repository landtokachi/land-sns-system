import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/AppLayout'
import Link from 'next/link'
import { format, differenceInDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import { CATEGORIES } from '@/lib/constants'
import type { PostCandidate } from '@/types'
import { InstagramLearner } from '@/components/candidates/InstagramLearner'

const P = {
  high:   { label:'高', color:'#dc2626', bg:'#fef2f2', border:'#fecaca', dot:'#ef4444' },
  medium: { label:'中', color:'#d97706', bg:'#fffbeb', border:'#fde68a', dot:'#f59e0b' },
  low:    { label:'低', color:'#4f46e5', bg:'#eef2ff', border:'#c7d2fe', dot:'#6366f1' },
}
const SS: Record<string,{label:string;color:string;bg:string}> = {
  unconfirmed:{label:'未確認',color:'#64748b',bg:'#f1f5f9'},
  candidate:{label:'投稿候補',color:'#4f46e5',bg:'#eef2ff'},
  drafting:{label:'下書き中',color:'#7c3aed',bg:'#f5f3ff'},
  draft_created:{label:'下書き済み',color:'#6d28d9',bg:'#ede9fe'},
  image_created:{label:'画像生成済み',color:'#0369a1',bg:'#e0f2fe'},
  review_waiting:{label:'確認待ち',color:'#b45309',bg:'#fffbeb'},
  ready:{label:'準備完了',color:'#065f46',bg:'#ecfdf5'},
  scheduled:{label:'投稿予定',color:'#0c4a6e',bg:'#f0f9ff'},
  published:{label:'投稿済み',color:'#064e3b',bg:'#d1fae5'},
  skipped:{label:'見送り',color:'#6b7280',bg:'#f9fafb'},
}
const NA: Record<string,{text:string;color:string}> = {
  unconfirmed:{text:'→ 投稿文を作成する',color:'#6366f1'},
  candidate:{text:'→ AI投稿文を生成する',color:'#6366f1'},
  drafting:{text:'→ 投稿文を完成させる',color:'#7c3aed'},
  draft_created:{text:'→ 画像を生成する',color:'#0369a1'},
  image_created:{text:'→ 掲載確認を依頼する',color:'#065f46'},
  review_waiting:{text:'⏳ 確認依頼中',color:'#b45309'},
  ready:{text:'→ 投稿予定を設定する',color:'#065f46'},
  scheduled:{text:'✓ 投稿予約済み',color:'#0369a1'},
  published:{text:'✓ 投稿完了',color:'#064e3b'},
  skipped:{text:'— 見送り',color:'#9ca3af'},
}
const CI: Record<string,string> = {
  '補助金・助成金・支援制度':'💰','イベント・セミナー':'📅','LANDの取り組み':'🏢',
  'とかち財団の取り組み':'🌱','事業者紹介':'👤','採択者・卒業生・支援先のその後':'🎓',
  '学生起業支援':'🎒','活動レポート':'📝','お知らせ・募集':'📣','コラム・ノウハウ':'💡',
}
const KC = [
  {key:'inbox',label:'📥 未確認',statuses:['unconfirmed'],hc:'#64748b',hb:'#f1f5f9',bc:'#cbd5e1',col:true},
  {key:'working',label:'✍️ 作業中',statuses:['candidate','drafting'],hc:'#7c3aed',hb:'#f5f3ff',bc:'#ddd6fe',col:false},
  {key:'finishing',label:'🎨 仕上げ中',statuses:['draft_created','image_created','review_waiting'],hc:'#0369a1',hb:'#e0f2fe',bc:'#bae6fd',col:false},
  {key:'done',label:'✅ 準備完了',statuses:['ready','scheduled'],hc:'#065f46',hb:'#ecfdf5',bc:'#a7f3d0',col:false},
]
function urg(c: PostCandidate, now: Date): number {
  const base = c.priority==='high'?30:c.priority==='medium'?20:10
  if (!c.deadline) return base
  const d = differenceInDays(new Date(c.deadline), now)
  return d<0?base*5:d<=3?base*4:d<=7?base*3:d<=14?base*2:d<=30?base*1.5:base
}

export default async function CandidatesPage({searchParams}:{searchParams:Promise<{status?:string;priority?:string;category?:string;q?:string;view?:string}>}) {
  const params = await searchParams
  const view = params.view || 'category'
  const supabase = await createClient()
  const now = new Date()
  let query = supabase.from('post_candidates').select('*').order('priority',{ascending:false}).order('created_at',{ascending:false})
  if (!params.status) query = query.not('status','in','("published","skipped")')
  if (params.status) query = query.eq('status',params.status)
  if (params.priority) query = query.eq('priority',params.priority)
  if (params.category) query = query.eq('category',params.category)
  if (params.q) query = query.ilike('title','%'+params.q+'%')
  const {data:candidates} = await query
  const list = (candidates as PostCandidate[]|null) ?? []
  const total = list.length
  const highCount = list.filter(c=>c.priority==='high').length
  const reviewCount = list.filter(c=>c.review_status==='requesting').length
  const isFiltered = !!(params.priority||params.status||params.q||params.category)
  const top5 = [...list].filter(c=>c.status!=='unconfirmed').map(c=>({...c,u:urg(c,now)})).sort((a,b)=>b.u-a.u).slice(0,5)
  const allU = list.filter(c=>c.status!=='unconfirmed').map(c=>urg(c,now))
  const buckets = {crit:allU.filter(u=>u>=90).length,hi:allU.filter(u=>u>=60&&u<90).length,med:allU.filter(u=>u>=30&&u<60).length}
  const byCat = CATEGORIES.reduce<Record<string,PostCandidate[]>>((a,cat)=>{const items=list.filter(c=>c.category===cat);if(items.length)a[cat]=items;return a},{})
  const uncat = list.filter(c=>!c.category); if(uncat.length) byCat['未分類']=uncat
  const byPri = (['high','medium','low'] as const).reduce<Record<string,PostCandidate[]>>((a,p)=>{const items=list.filter(c=>c.priority===p);if(items.length)a[p]=items;return a},{})
  const kanban = KC.map(col=>({...col,items:list.filter(c=>col.statuses.includes(c.status))}))
  return (
    <AppLayout title="投稿候補一覧"><div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div><h2 className="text-lg font-bold text-slate-900">投稿候補一覧</h2>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-sm text-slate-500">{total}件</span>
            {highCount>0&&<span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca'}}>🔴 高優先 {highCount}件</span>}
            {reviewCount>0&&<span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{background:'#fffbeb',color:'#b45309',border:'1px solid #fde68a'}}>⏳ 確認待ち {reviewCount}件</span>}
          </div>
        </div>
        <Link href="/candidates/new" className="btn-glow inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>新規登録
        </Link>
      </div>
      {!isFiltered&&<InstagramLearner />}
      {!isFiltered&&view!=='kanban'&&top5.length>0&&(
        <div className="rounded-2xl overflow-hidden" style={{border:'1px solid #fde68a',background:'linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%)'}}>
          <div className="px-5 py-3 flex items-center justify-between" style={{borderBottom:'1px solid #fde68a'}}>
            <div className="flex items-center gap-2"><span>🎯</span><span className="text-sm font-bold text-amber-900">今やるべきこと Top 5</span><span className="text-xs text-amber-600">— 締切・優先度から自動算出</span></div>
            <div className="flex items-center gap-1.5 text-xs">
              {buckets.crit>0&&<span className="px-2 py-0.5 rounded-full font-bold" style={{background:'#fef2f2',color:'#dc2626'}}>🔥 超緊急 {buckets.crit}</span>}
              {buckets.hi>0&&<span className="px-2 py-0.5 rounded-full font-bold" style={{background:'#fff7ed',color:'#c2410c'}}>⚠️ 緊急 {buckets.hi}</span>}
              {buckets.med>0&&<span className="px-2 py-0.5 rounded-full font-bold" style={{background:'#fffbeb',color:'#b45309'}}>📋 {buckets.med}</span>}
            </div>
          </div>
          <div className="p-4 space-y-2">{top5.map((c,i)=>{
            const dd=c.deadline?differenceInDays(new Date(c.deadline),now):null
            const mxU=top5[0].u; const bw=Math.round((c.u/mxU)*100)
            const uc=c.u>=90?'#dc2626':c.u>=60?'#ea580c':c.u>=30?'#d97706':'#4f46e5'
            const pp=P[c.priority]
            return(<Link key={c.id} href={'/candidates/'+c.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-amber-100 transition-colors group" style={{background:'rgba(255,255,255,0.6)'}}>
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0" style={{background:i===0?'#fbbf24':i===1?'#9ca3af':i===2?'#d97706':'#e5e7eb',color:i<3?'#fff':'#6b7280'}}>{i+1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold truncate text-slate-800">{c.title}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded font-bold shrink-0" style={{background:pp.bg,color:pp.color}}>{pp.label}</span>
                  {dd!==null&&<span className="text-xs font-bold shrink-0" style={{color:dd<=7?'#dc2626':dd<=14?'#ea580c':'#6b7280'}}>{dd<0?'⚠️期限切れ':dd<=7?'🔥'+dd+'日後':'📅'+format(new Date(c.deadline!),'M/d',{locale:ja})}</span>}
                </div>
                <div className="h-2 rounded-full bg-amber-100 overflow-hidden"><div className="h-full rounded-full" style={{width:bw+'%',background:uc,opacity:0.85}}/></div>
              </div>
              <span className="text-xs font-black shrink-0" style={{color:uc}}>{c.u}pts</span>
            </Link>)
          })}</div>
        </div>
      )}
      <div className="flex rounded-lg overflow-hidden" style={{border:'1px solid #e2e8f0',width:'fit-content'}}>
        {[{k:'category',l:'📂 カテゴリー別'},{k:'priority',l:'🎯 優先度別'},{k:'kanban',l:'🗂️ カンバン'}].map(v=>(
          <Link key={v.k} href={'/candidates?'+new URLSearchParams({...params,view:v.k}).toString()} className="px-3 py-2 text-xs font-medium transition-colors" style={view===v.k?{background:'#4f46e5',color:'#fff'}:{background:'#fff',color:'#64748b'}}>{v.l}</Link>
        ))}
      </div>
      {view!=='kanban'&&(<form className="glass-card p-3 flex flex-wrap gap-2">
        <input name="q" defaultValue={params.q} placeholder="🔍 タイトルで検索" className="px-3 py-2 text-sm flex-1 min-w-[160px]"/>
        <input type="hidden" name="view" value={view}/>
        <select name="priority" defaultValue={params.priority} className="px-3 py-2 text-sm"><option value="">全優先度</option><option value="high">🔴 高</option><option value="medium">🟡 中</option><option value="low">🔵 低</option></select>
        <select name="status" defaultValue={params.status} className="px-3 py-2 text-sm"><option value="">全ステータス</option>{Object.entries(SS).map(([v,s])=><option key={v} value={v}>{(s as any).label}</option>)}</select>
        <select name="category" defaultValue={params.category} className="px-3 py-2 text-sm hidden sm:block"><option value="">全カテゴリ</option>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select>
        <button type="submit" className="btn-glow px-4 py-2 rounded-lg text-sm font-semibold">絞り込む</button>
        <Link href={'/candidates?view='+view} className="px-3 py-2 text-sm text-slate-400 hover:text-slate-600">リセット</Link>
      </form>)}
      {view==='kanban'&&(<div><p className="text-xs text-slate-400 mb-3">ステータス別整理。クリックして詳細・編集。</p>
        <div className="flex gap-4 overflow-x-auto pb-4" style={{minHeight:'60vh'}}>
          {kanban.map(col=>{const vis=col.col?col.items.slice(0,6):col.items;const hid=col.items.length-vis.length;return(
            <div key={col.key} className="flex-shrink-0 w-72 flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 rounded-t-lg" style={{background:col.hb,borderBottom:'2px solid '+col.bc}}><span className="text-xs font-bold" style={{color:col.hc}}>{col.label}</span><span className="text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{background:col.bc,color:col.hc}}>{col.items.length}</span></div>
              <div className="flex-1 rounded-b-lg p-2 space-y-2" style={{background:'#f8fafc',border:'1px solid '+col.bc,borderTop:'none'}}>
                {col.items.length===0&&<p className="text-xs text-slate-400 text-center py-8">なし</p>}
                {vis.map(c=><KC_ key={c.id} c={c} now={now}/>)}
                {hid>0&&<Link href={'/candidates?status='+col.statuses[0]+'&view=kanban'} className="block text-center text-xs py-2 rounded-lg" style={{color:col.hc,background:col.hb}}>他 {hid}件を見る →</Link>}
              </div>
            </div>
          )})}
        </div>
      </div>)}
      {!isFiltered&&view==='category'&&(<div className="space-y-6">{Object.entries(byCat).map(([cat,items])=>{
        const ic=CI[cat]||'📌'; const hic=items.filter(c=>c.priority==='high').length
        const done=items.filter(c=>['draft_created','image_created','review_waiting','ready','scheduled'].includes(c.status)).length
        const prog=items.length?Math.round((done/items.length)*100):0
        const urgent=items.filter(c=>c.deadline&&differenceInDays(new Date(c.deadline),now)<=7).length
        return(<div key={cat}>
          <div className="flex items-center gap-2.5 mb-3">
            <span className="text-lg">{ic}</span><h3 className="text-sm font-bold text-slate-800">{cat}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">{items.length}件</span>
            {hic>0&&<span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca'}}>🔴 高優先 {hic}件</span>}
            {urgent>0&&<span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{background:'#fff7ed',color:'#c2410c',border:'1px solid #fed7aa'}}>🔥 締切近 {urgent}件</span>}
            <div className="flex items-center gap-1.5 flex-1"><div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden max-w-[80px]"><div className="h-full rounded-full bg-indigo-400" style={{width:prog+'%'}}/></div><span className="text-xs text-slate-400">{prog}%</span></div>
            <Link href={'/candidates?category='+encodeURIComponent(cat)+'&view='+view} className="text-xs text-indigo-500 hover:underline flex-shrink-0">すべて見る →</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{items.map(c=><CC key={c.id} c={c} now={now} u={urg(c,now)}/>)}</div>
        </div>)
      })}</div>)}
      {!isFiltered&&view==='priority'&&(<div className="space-y-8">{Object.entries(byPri).map(([pri,items])=>{
        const pp=P[pri as keyof typeof P]
        return(<div key={pri}><div className="flex items-center gap-2.5 mb-3">
          <span className="w-2.5 h-2.5 rounded-full" style={{background:pp.dot}}/><h3 className="text-sm font-bold" style={{color:pp.color}}>優先度「{pp.label}」</h3>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{background:pp.bg,color:pp.color,border:'1px solid '+pp.border}}>{items.length}件</span>
          <div className="flex-1 h-px" style={{background:pp.border}}/>
        </div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{items.map(c=><CC key={c.id} c={c} now={now} u={urg(c,now)}/>)}</div></div>)
      })}</div>)}
      {isFiltered&&view!=='kanban'&&(<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map(c=><CC key={c.id} c={c} now={now} u={urg(c,now)}/>)}
        {!list.length&&<div className="col-span-3 glass-card p-12 text-center text-slate-400 text-sm">該当する投稿候補がありません</div>}
      </div>)}
    </div></AppLayout>
  )
}
function KC_({c,now}:{c:PostCandidate;now:Date}) {
  const pp=P[c.priority]; const dd=c.deadline?differenceInDays(new Date(c.deadline),now):null; const urg_=dd!==null&&dd<=7
  return(<Link href={'/candidates/'+c.id} className="block p-3 rounded-lg bg-white hover:shadow-md transition-all" style={{border:'1px solid '+(urg_?'#fca5a5':'#e2e8f0'),borderLeft:'3px solid '+pp.dot}}>
    <div className="flex items-center justify-between gap-1 mb-1.5">
      <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{background:pp.bg,color:pp.color}}>{pp.label}</span>
      {dd!==null&&<span className="text-xs font-bold" style={{color:urg_?'#dc2626':'#94a3b8'}}>{urg_?'🔥':'📅'} {format(new Date(c.deadline!),'M/d',{locale:ja})}</span>}
    </div>
    <p className="text-xs font-semibold text-slate-800 line-clamp-2 mb-1.5">{c.title}</p>
    {c.category&&<p className="text-xs text-slate-400 truncate">{CI[c.category]||'📌'} {c.category}</p>}
  </Link>)
}
function CC({c,now,u}:{c:PostCandidate;now:Date;u:number}) {
  const pp=P[c.priority]; const ss=SS[c.status]||{label:c.status,color:'#64748b',bg:'#f1f5f9'}; const na_=NA[c.status]||{text:'',color:'#6366f1'}
  const dd=c.deadline?differenceInDays(new Date(c.deadline),now):null; const urg_=dd!==null&&dd<=7
  const bc=c.priority==='high'?'#ef4444':c.priority==='medium'?'#f59e0b':'#6366f1'
  const uc=u>=90?'#dc2626':u>=60?'#ea580c':u>=30?'#f59e0b':'#6366f1'; const uw=Math.min(100,Math.round((u/120)*100))
  return(<Link href={'/candidates/'+c.id} className="glass-card block p-4 hover:shadow-md transition-all relative overflow-hidden" style={{borderLeft:'3px solid '+bc}}>
    {urg_&&<div className="absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-8 translate-x-8 opacity-10" style={{background:'#ef4444'}}/>}
    <div className="flex items-center justify-between gap-2 mb-2">
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{background:ss.bg,color:ss.color}}>{ss.label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{background:pp.bg,color:pp.color}}>{pp.label}</span>
        {dd!==null&&<span className="text-xs font-bold" style={{color:urg_?'#dc2626':'#94a3b8'}}>{urg_?'🔥':''}{format(new Date(c.deadline!),'M/d',{locale:ja})}{urg_&&<span>({dd}日後)</span>}</span>}
      </div>
    </div>
    <p className="text-sm font-bold text-slate-900 line-clamp-2 mb-2">{c.title}</p>
    {c.source_name&&<p className="text-xs text-slate-400 mb-2 truncate">📌 {c.source_name}</p>}
    <div className="mb-2"><div className="flex items-center justify-between mb-0.5"><span className="text-xs text-slate-400">緊急度</span><span className="text-xs font-bold" style={{color:uc}}>{u}pts</span></div><div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full" style={{width:uw+'%',background:uc,opacity:0.8}}/></div></div>
    <p className="text-xs font-medium" style={{color:na_.color}}>{c.review_status==='requesting'?'⏳ 掲載確認待ち':na_.text}</p>
  </Link>)
}
