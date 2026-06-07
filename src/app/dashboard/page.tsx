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
    {
      label: '投稿候補数', value: total ?? 0,
      gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      shadow: 'rgba(99,102,241,0.35)',
      icon: <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>,
    },
    {
      label: '優先度「高」', value: highPriority ?? 0,
      gradient: 'linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)',
      shadow: 'rgba(244,63,94,0.35)',
      icon: <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>,
    },
    {
      label: '下書き作成済み', value: draftCreated ?? 0,
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
      shadow: 'rgba(139,92,246,0.35)',
      icon: <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>,
    },
    {
      label: '投稿予定', value: scheduled ?? 0,
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
      shadow: 'rgba(59,130,246,0.35)',
      icon: <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>,
    },
    {
      label: '投稿済み', value: published ?? 0,
      gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
      shadow: 'rgba(16,185,129,0.35)',
      icon: <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
    },
  ]

  const statusMap: Record<string,{label:string;color:string;bg:string}> = {
    unconfirmed:{label:'未確認',color:'#7c6fa8',bg:'rgba(124,111,168,0.1)'},
    candidate:{label:'投稿候補',color:'#6366f1',bg:'rgba(99,102,241,0.1)'},
    drafting:{label:'下書き中',color:'#8b5cf6',bg:'rgba(139,92,246,0.1)'},
    draft_created:{label:'下書き済み',color:'#7c3aed',bg:'rgba(124,58,237,0.1)'},
    image_created:{label:'画像生成済み',color:'#0891b2',bg:'rgba(8,145,178,0.1)'},
    review_waiting:{label:'確認待ち',color:'#ea580c',bg:'rgba(234,88,12,0.1)'},
    ready:{label:'準備完了',color:'#16a34a',bg:'rgba(22,163,74,0.1)'},
    scheduled:{label:'投稿予定',color:'#0f766e',bg:'rgba(15,118,110,0.1)'},
    published:{label:'投稿済み',color:'#059669',bg:'rgba(5,150,105,0.1)'},
    skipped:{label:'見送り',color:'#94a3b8',bg:'rgba(148,163,184,0.1)'},
  }
  const statusCounts = (allCandidates||[]).reduce<Record<string,number>>((acc,c)=>{ acc[c.status]=(acc[c.status]||0)+1; return acc },{})
  const statusBreakdown = Object.entries(statusCounts)
    .map(([s,count])=>({status:s,count,...(statusMap[s]||{label:s,color:'#94a3b8',bg:'rgba(148,163,184,0.1)'})}))
    .sort((a,b)=>b.count-a.count)

  const platStyle: Record<string,{bg:string;color:string}> = {
    instagram:{bg:'rgba(219,39,119,0.1)',color:'#be185d'},
    facebook:{bg:'rgba(99,102,241,0.1)',color:'#4f46e5'},
    x:{bg:'rgba(124,111,168,0.1)',color:'#7c6fa8'},
  }

  return (
    <AppLayout title="ダッシュボード">
      <div className="space-y-5 max-w-7xl mx-auto">

        {/* Header area */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black" style={{color:'#1e1b4b'}}>Dashboard</h1>
            <p className="text-sm mt-0.5" style={{color:'#a5b4fc'}}>
              {format(now, 'yyyy年M月d日（E）', {locale:ja})}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/collect"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
              style={{background:'rgba(99,102,241,0.12)', color:'#6366f1', border:'1px solid rgba(99,102,241,0.2)'}}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1"/></svg>
              AI収集
            </Link>
            <Link href="/candidates/new"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{background:'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow:'0 4px 14px rgba(99,102,241,0.35)'}}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
              新規登録
            </Link>
          </div>
        </div>

        {/* Stats — FundFlow style cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {stats.map(s => (
            <div key={s.label} className="glass-card p-4 sm:p-5 relative overflow-hidden">
              {/* BG glow */}
              <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-15"
                style={{background:s.gradient}} />
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4 relative"
                style={{background:s.gradient, boxShadow:`0 6px 16px ${s.shadow}`}}>
                {s.icon}
              </div>
              <p className="text-2xl font-black" style={{color:'#1e1b4b'}}>{s.value}</p>
              <p className="text-xs font-medium mt-1" style={{color:'#a5b4fc'}}>{s.label}</p>
              {/* Arrow indicator */}
              <div className="absolute top-4 right-4 opacity-30">
                <svg className="w-4 h-4" style={{color:'#6366f1'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7"/>
                </svg>
              </div>
            </div>
          ))}
        </div>

        {/* 確認待ちアラート */}
        {reviewWaiting && reviewWaiting.length > 0 && (
          <div className="glass-card p-4 sm:p-5"
            style={{background:'rgba(251,191,36,0.08)', borderColor:'rgba(251,191,36,0.25)'}}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm flex items-center gap-2" style={{color:'#d97706'}}>
                <span>⏳</span> 掲載確認待ち（{reviewWaiting.length}件）
              </h3>
              <Link href="/candidates?status=review_waiting"
                className="text-xs font-semibold hover:underline" style={{color:'#d97706'}}>
                すべて見る →
              </Link>
            </div>
            <div className="space-y-2">
              {reviewWaiting.map(c => (
                <Link key={c.id} href={`/candidates/${c.id}`}
                  className="flex items-center justify-between p-3 rounded-xl transition-all hover:bg-white/50"
                  style={{background:'rgba(255,255,255,0.5)', border:'1px solid rgba(251,191,36,0.2)'}}>
                  <span className="text-sm font-medium truncate flex-1 mr-3" style={{color:'#1e1b4b'}}>{c.title}</span>
                  <span className="text-xs font-semibold flex-shrink-0" style={{color:'#d97706'}}>確認依頼中 →</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ステータス内訳 */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-sm" style={{color:'#1e1b4b'}}>ステータス内訳</h3>
              <Link href="/candidates"
                className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-all hover:bg-indigo-50"
                style={{color:'#6366f1', border:'1px solid rgba(99,102,241,0.2)'}}>
                一覧へ →
              </Link>
            </div>
            {statusBreakdown.length > 0 ? (
              <div className="space-y-3">
                {statusBreakdown.map(s => (
                  <div key={s.status} className="flex items-center gap-3">
                    <span className="text-xs px-2.5 py-1 rounded-full w-24 text-right flex-shrink-0 font-medium"
                      style={{background:s.bg, color:s.color}}>{s.label}</span>
                    <div className="flex-1 rounded-full h-2 overflow-hidden" style={{background:'rgba(99,102,241,0.08)'}}>
                      <div className="h-full rounded-full transition-all"
                        style={{width:`${Math.max((s.count/(total||1))*100,5)}%`, background:s.color, opacity:0.8}} />
                    </div>
                    <span className="text-xs font-bold w-5 text-right flex-shrink-0" style={{color:s.color}}>{s.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-center py-6" style={{color:'#c4b5fd'}}>データがありません</p>
            )}
          </div>

          {/* 今週の投稿予定 */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-sm" style={{color:'#1e1b4b'}}>今週の投稿予定</h3>
              <Link href="/schedule"
                className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-all hover:bg-indigo-50"
                style={{color:'#6366f1', border:'1px solid rgba(99,102,241,0.2)'}}>
                カレンダーへ →
              </Link>
            </div>
            {weekPosts && weekPosts.length > 0 ? (
              <div className="space-y-2">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(weekPosts as any[]).map(post => {
                  const ps = platStyle[post.platform] || platStyle.x
                  return (
                    <div key={post.id} className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-white/50"
                      style={{background:'rgba(255,255,255,0.4)', border:'1px solid rgba(99,102,241,0.08)'}}>
                      <span className="text-xs font-semibold w-14 flex-shrink-0" style={{color:'#c4b5fd'}}>
                        {format(new Date(post.scheduled_at!), 'M/d(E)', {locale:ja})}
                      </span>
                      <span className="text-sm flex-1 truncate font-medium" style={{color:'#1e1b4b'}}>{post.post_candidates?.title}</span>
                      <span className="text-xs px-2.5 py-1 rounded-full flex-shrink-0 font-semibold"
                        style={{background:ps.bg, color:ps.color}}>{post.platform}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-center py-6" style={{color:'#c4b5fd'}}>今週の投稿予定はありません</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* 最近の投稿候補 */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-sm" style={{color:'#1e1b4b'}}>最近追加された投稿候補</h3>
              <Link href="/candidates"
                className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-all hover:bg-indigo-50"
                style={{color:'#6366f1', border:'1px solid rgba(99,102,241,0.2)'}}>
                一覧へ →
              </Link>
            </div>
            <div className="space-y-2">
              {(recent as PostCandidate[]|null)?.map(c => (
                <Link key={c.id} href={`/candidates/${c.id}`}
                  className="flex items-center justify-between p-3 rounded-xl transition-all hover:bg-white/60"
                  style={{background:'rgba(255,255,255,0.4)', border:'1px solid rgba(99,102,241,0.07)'}}>
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-semibold truncate" style={{color:'#1e1b4b'}}>{c.title}</p>
                    {c.category && <p className="text-xs mt-0.5 truncate" style={{color:'#c4b5fd'}}>{c.category}</p>}
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full flex-shrink-0 font-medium ${PRIORITY_COLORS[c.priority]}`}>
                    {PRIORITY_LABELS[c.priority]}
                  </span>
                </Link>
              ))}
              {!recent?.length && <p className="text-sm text-center py-6" style={{color:'#c4b5fd'}}>投稿候補がありません</p>}
            </div>
          </div>

          {/* 締切が近い */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-sm" style={{color:'#1e1b4b'}}>⚡ 締切が近い投稿候補</h3>
            </div>
            <div className="space-y-2">
              {(nearDeadline as PostCandidate[]|null)?.map(c => (
                <Link key={c.id} href={`/candidates/${c.id}`}
                  className="flex items-center justify-between p-3 rounded-xl transition-all hover:bg-white/60"
                  style={{background:'rgba(255,255,255,0.4)', border:'1px solid rgba(99,102,241,0.07)'}}>
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-semibold truncate" style={{color:'#1e1b4b'}}>{c.title}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block"
                      style={{background:'rgba(99,102,241,0.1)', color:'#6366f1'}}>
                      {CANDIDATE_STATUS_LABELS[c.status]}
                    </span>
                  </div>
                  <span className="text-lg font-black flex-shrink-0" style={{color:'#f43f5e'}}>
                    {format(new Date(c.deadline!), 'M/d', {locale:ja})}
                  </span>
                </Link>
              ))}
              {!nearDeadline?.length && <p className="text-sm text-center py-6" style={{color:'#c4b5fd'}}>締切が近い候補はありません</p>}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
