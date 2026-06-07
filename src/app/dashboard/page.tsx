import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/AppLayout'
import Link from 'next/link'
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns'
import { ja } from 'date-fns/locale'
import { CANDIDATE_STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS } from '@/lib/constants'
import type { PostCandidate } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
  const soon = addDays(now, 7)

  const [
    { count: total }, { count: highPriority }, { count: draftCreated },
    { count: scheduled }, { count: published },
    { data: recent }, { data: nearDeadline }, { data: weekPosts },
    { data: allCandidates }, { data: reviewWaiting },
  ] = await Promise.all([
    supabase.from('post_candidates').select('*', { count: 'exact', head: true }),
    supabase.from('post_candidates').select('*', { count: 'exact', head: true }).eq('priority', 'high'),
    supabase.from('post_candidates').select('*', { count: 'exact', head: true }).in('status', ['draft_created','image_created','review_waiting','ready']),
    supabase.from('post_candidates').select('*', { count: 'exact', head: true }).eq('status', 'scheduled'),
    supabase.from('post_candidates').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('post_candidates').select('id,title,category,priority,status,created_at').order('created_at',{ascending:false}).limit(5),
    supabase.from('post_candidates').select('id,title,deadline,priority,status').not('deadline','is',null).lte('deadline',soon.toISOString().slice(0,10)).gte('deadline',now.toISOString().slice(0,10)).order('deadline').limit(5),
    supabase.from('social_posts').select('id,platform,status,scheduled_at,post_candidates(title)').gte('scheduled_at',weekStart.toISOString()).lte('scheduled_at',weekEnd.toISOString()).order('scheduled_at').limit(10),
    supabase.from('post_candidates').select('status'),
    supabase.from('post_candidates').select('id,title,review_status,updated_at').eq('review_status','requesting').order('updated_at',{ascending:false}).limit(5),
  ])

  const stats = [
    { label: '投稿候補数', value: total ?? 0, cls: 'stat-blue', color: '#1565c0',
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg> },
    { label: '優先度「高」', value: highPriority ?? 0, cls: 'stat-red', color: '#dc2626',
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg> },
    { label: '下書き作成済み', value: draftCreated ?? 0, cls: 'stat-purple', color: '#7c3aed',
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg> },
    { label: '投稿予定', value: scheduled ?? 0, cls: 'stat-amber', color: '#d97706',
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg> },
    { label: '投稿済み', value: published ?? 0, cls: 'stat-green', color: '#16a34a',
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
  ]

  const statusMap: Record<string,{label:string;color:string;bg:string}> = {
    unconfirmed:{label:'未確認',color:'#64748b',bg:'#f1f5f9'},
    candidate:{label:'投稿候補',color:'#1565c0',bg:'#e8f0fe'},
    drafting:{label:'下書き中',color:'#7c3aed',bg:'#ede9fe'},
    draft_created:{label:'下書き済み',color:'#4f46e5',bg:'#eef2ff'},
    image_created:{label:'画像生成済み',color:'#0369a1',bg:'#e0f2fe'},
    review_waiting:{label:'確認待ち',color:'#c2410c',bg:'#fff7ed'},
    ready:{label:'準備完了',color:'#15803d',bg:'#f0fdf4'},
    scheduled:{label:'投稿予定',color:'#0f766e',bg:'#f0fdfa'},
    published:{label:'投稿済み',color:'#16a34a',bg:'#dcfce7'},
    skipped:{label:'見送り',color:'#94a3b8',bg:'#f8fafc'},
  }
  const statusCounts = (allCandidates||[]).reduce<Record<string,number>>((acc,c)=>{ acc[c.status]=(acc[c.status]||0)+1; return acc },{})
  const statusBreakdown = Object.entries(statusCounts)
    .map(([s,count])=>({status:s,count,...(statusMap[s]||{label:s,color:'#94a3b8',bg:'#f8fafc'})}))
    .sort((a,b)=>b.count-a.count)

  const platformBadge: Record<string,{bg:string;color:string}> = {
    instagram:{bg:'#fdf2f8',color:'#be185d'},
    facebook:{bg:'#eff6ff',color:'#1d4ed8'},
    x:{bg:'#f8fafc',color:'#475569'},
  }

  return (
    <AppLayout title="ダッシュボード">
      <div className="space-y-5 max-w-7xl mx-auto">

        {/* Blue banner hero (医療ダッシュボード風) */}
        <div className="blue-banner p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-full opacity-10">
            <svg viewBox="0 0 200 200" className="w-full h-full"><circle cx="150" cy="50" r="80" fill="white"/><circle cx="50" cy="150" r="60" fill="white"/></svg>
          </div>
          <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                こんにちは、LANDスタッフさん 👋
              </h1>
              <p className="text-blue-100 mt-1 text-sm">
                {format(now, 'yyyy年M月d日（E）', {locale:ja})} ・ 今日も素敵な情報発信を
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/collect"
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                style={{background:'rgba(255,255,255,0.2)', color:'white', border:'1px solid rgba(255,255,255,0.3)'}}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3"/></svg>
                AI収集
              </Link>
              <Link href="/candidates/new"
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                style={{background:'white', color:'#1565c0'}}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                新規登録
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {stats.map(s => (
            <div key={s.label} className={`glass-card p-4 sm:p-5 ${s.cls}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{background:'white', color:s.color, boxShadow:'0 2px 8px rgba(0,0,0,0.08)'}}>
                  {s.icon}
                </div>
                <svg className="w-4 h-4" style={{color:s.color}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7"/>
                </svg>
              </div>
              <p className="text-2xl font-black" style={{color:s.color}}>{s.value}</p>
              <p className="text-xs font-medium mt-0.5" style={{color:'#64748b'}}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* 確認待ちアラート */}
        {reviewWaiting && reviewWaiting.length > 0 && (
          <div className="glass-card p-4 sm:p-5" style={{background:'#fff7ed', borderColor:'#fed7aa'}}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm flex items-center gap-2" style={{color:'#c2410c'}}>
                <span className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-xs">⏳</span>
                掲載確認待ち（{reviewWaiting.length}件）
              </h3>
              <Link href="/candidates?status=review_waiting" className="text-xs font-semibold hover:underline" style={{color:'#ea580c'}}>すべて見る →</Link>
            </div>
            <div className="space-y-2">
              {reviewWaiting.map(c => (
                <Link key={c.id} href={`/candidates/${c.id}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-white transition-colors hover:shadow-sm"
                  style={{border:'1px solid #fed7aa'}}>
                  <span className="text-sm font-medium truncate flex-1 mr-3" style={{color:'#1e293b'}}>{c.title}</span>
                  <span className="text-xs font-semibold flex-shrink-0" style={{color:'#ea580c'}}>確認依頼中 →</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ステータス内訳 */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-sm" style={{color:'#1e293b'}}>ステータス内訳</h3>
              <Link href="/candidates" className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors hover:bg-blue-50"
                style={{color:'#1565c0', border:'1px solid #bfdbfe'}}>一覧へ</Link>
            </div>
            {statusBreakdown.length > 0 ? (
              <div className="space-y-2.5">
                {statusBreakdown.map(s => (
                  <div key={s.status} className="flex items-center gap-3">
                    <span className="text-xs px-2 py-0.5 rounded-full w-24 text-right flex-shrink-0 font-medium truncate"
                      style={{background:s.bg, color:s.color}}>{s.label}</span>
                    <div className="flex-1 rounded-full h-2.5 overflow-hidden" style={{background:'#f1f5f9'}}>
                      <div className="h-full rounded-full transition-all"
                        style={{width:`${Math.max((s.count/(total||1))*100,5)}%`, background:s.color, opacity:0.7}} />
                    </div>
                    <span className="text-xs font-bold w-5 text-right flex-shrink-0" style={{color:s.color}}>{s.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-center py-6" style={{color:'#94a3b8'}}>データがありません</p>
            )}
          </div>

          {/* 今週の投稿予定 */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-sm" style={{color:'#1e293b'}}>今週の投稿予定</h3>
              <Link href="/schedule" className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors hover:bg-blue-50"
                style={{color:'#1565c0', border:'1px solid #bfdbfe'}}>カレンダーへ</Link>
            </div>
            {weekPosts && weekPosts.length > 0 ? (
              <div className="space-y-2">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(weekPosts as any[]).map(post => {
                  const pb = platformBadge[post.platform] || platformBadge.x
                  return (
                    <div key={post.id} className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-slate-50"
                      style={{border:'1px solid #f1f5f9'}}>
                      <span className="text-xs font-semibold w-14 flex-shrink-0" style={{color:'#64748b'}}>
                        {format(new Date(post.scheduled_at!), 'M/d(E)', {locale:ja})}
                      </span>
                      <span className="text-sm flex-1 truncate font-medium" style={{color:'#1e293b'}}>{post.post_candidates?.title}</span>
                      <span className="text-xs px-2.5 py-1 rounded-full flex-shrink-0 font-semibold"
                        style={{background:pb.bg, color:pb.color}}>{post.platform}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-center py-6" style={{color:'#94a3b8'}}>今週の投稿予定はありません</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* 最近の投稿候補 */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-sm" style={{color:'#1e293b'}}>最近追加された投稿候補</h3>
              <Link href="/candidates" className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors hover:bg-blue-50"
                style={{color:'#1565c0', border:'1px solid #bfdbfe'}}>一覧へ</Link>
            </div>
            <div className="space-y-2">
              {(recent as PostCandidate[]|null)?.map(c => (
                <Link key={c.id} href={`/candidates/${c.id}`}
                  className="flex items-center justify-between p-3 rounded-xl transition-colors hover:bg-slate-50"
                  style={{border:'1px solid #f1f5f9'}}>
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-medium truncate" style={{color:'#1e293b'}}>{c.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {c.category && <span className="text-xs" style={{color:'#94a3b8'}}>{c.category}</span>}
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full flex-shrink-0 font-medium ${PRIORITY_COLORS[c.priority]}`}>
                    {PRIORITY_LABELS[c.priority]}
                  </span>
                </Link>
              ))}
              {!recent?.length && <p className="text-sm text-center py-6" style={{color:'#94a3b8'}}>投稿候補がありません</p>}
            </div>
          </div>

          {/* 締切が近い */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-sm" style={{color:'#1e293b'}}>⚡ 締切が近い投稿候補</h3>
            </div>
            <div className="space-y-2">
              {(nearDeadline as PostCandidate[]|null)?.map(c => (
                <Link key={c.id} href={`/candidates/${c.id}`}
                  className="flex items-center justify-between p-3 rounded-xl transition-colors hover:bg-slate-50"
                  style={{border:'1px solid #f1f5f9'}}>
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-medium truncate" style={{color:'#1e293b'}}>{c.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${CANDIDATE_STATUS_LABELS[c.status] ? '' : ''}`}
                      style={{background:'#eff6ff', color:'#1d4ed8'}}>
                      {CANDIDATE_STATUS_LABELS[c.status]}
                    </span>
                  </div>
                  <span className="text-base font-black flex-shrink-0" style={{color:'#dc2626'}}>
                    {format(new Date(c.deadline!), 'M/d', {locale:ja})}
                  </span>
                </Link>
              ))}
              {!nearDeadline?.length && <p className="text-sm text-center py-6" style={{color:'#94a3b8'}}>締切が近い候補はありません</p>}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
