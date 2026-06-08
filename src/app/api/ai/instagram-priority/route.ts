import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const adminSupabase = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// @land.tokachi Instagramの分析に基づく優先度マッピング
const LAND_INSTAGRAM_PRIORITY: Record<string, 'high' | 'medium' | 'low'> = {
  '補助金・助成金・支援制度': 'high',  // 最多投稿カテゴリ
  'イベント・セミナー': 'high',         // 地域イベント多数
  'LANDの取り組み': 'high',            // 自施設コンテンツ
  'とかち財団の取り組み': 'high',       // 親組織の取り組み
  'お知らせ・募集': 'medium',
  '事業者紹介': 'medium',
  '採択者・卒業生・支援先のその後': 'medium',
  '活動レポート': 'medium',
  '学生起業支援': 'medium',
  'コラム・ノウハウ': 'low',
}

function extractTextFromHtml(html: string): string {
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  text = text.replace(/<[^>]+>/g, ' ')
  return text.replace(/\s+/g, ' ').trim().slice(0, 5000)
}

// POST: Instagramを分析して優先度を学習し、候補に適用
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { handle, applyToAll } = await request.json().catch(() => ({}))
    const igHandle = handle || 'land.tokachi'

    // Instagram公開ページを取得（テキスト抽出）
    let igPageText = ''
    try {
      const res = await fetch('https://www.instagram.com/' + igHandle + '/', {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LANDBot/1.0)' },
        signal: AbortSignal.timeout(8000),
      })
      if (res.ok) igPageText = extractTextFromHtml(await res.text())
    } catch { /* Instagram fetch failed - use preloaded knowledge */ }

    // OpenAIで投稿パターンを分析
    const prompt = [
      'あなたはSNS戦略アナリストです。',
      '',
      'Instagram @' + igHandle + ' の投稿パターンを分析してください。',
      'このアカウントはスタートアップ支援施設「LAND」（北海道十勝・帯広、公益財団法人とかち財団運営）のものです。',
      '',
      '【既知の情報 - @land.tokachi の投稿分析（2024年〜2026年）】',
      '- 投稿1601件、フォロワー1444人',
      '- ハイライト: KAIKON（開墾）、十勝アグリ、TokachiEGG、爆風2023、TIP告知、トカチダネ',
      '- 最近の投稿内容（頻度順）:',
      '  1位: 補助金・助成金情報（小規模事業者持続化補助金、とかちビジネスチャレンジ補助金など）',
      '  2位: 地域セミナー・イベント（副業・兼業人材活用ミニセミナー、地域フード塾など）',
      '  3位: LAND施設の利用方法・プログラム（REALIZE CAFE、4つのステージなど）',
      '  4位: 起業家向けコラム・情報（やるか、やらないか、など）',
      '  5位: 十勝・北海道の農業・食産業情報',
      '',
      igPageText ? ('【Instagram実際のページテキスト（抜粋）】\n' + igPageText) : '（Instagramページは動的レンダリングのため取得できず）',
      '',
      '以下のJSON形式で投稿優先度の分析結果を返してください:',
      '{',
      '  "insights": ["観察した投稿パターン1", "観察した投稿パターン2", "観察した投稿パターン3"],',
      '  "top_categories": ["最重要カテゴリ1", "最重要カテゴリ2", "最重要カテゴリ3"],',
      '  "priority_weights": {',
      '    "補助金・助成金・支援制度": "high",',
      '    "イベント・セミナー": "high",',
      '    "LANDの取り組み": "high",
      '    "とかち財団の取り組み": "high",',
      '    "お知らせ・募集": "medium",',
      '    "事業者紹介": "medium",',
      '    "コラム・ノウハウ": "low"',
      '  },',
      '  "recommendation": "今後の投稿戦略アドバイス（100文字以内）"',
      '}'
    ].join('\n')

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    })

    const analysis = JSON.parse(response.choices[0].message.content || '{}')
    const weights: Record<string, string> = analysis.priority_weights || LAND_INSTAGRAM_PRIORITY

    // applyToAllがtrueの場合、未確認候補の優先度を一括更新
    let updatedCount = 0
    if (applyToAll) {
      const { data: candidates } = await adminSupabase
        .from('post_candidates')
        .select('id, category, priority')
        .eq('status', 'unconfirmed')

      if (candidates && candidates.length > 0) {
        const updates = candidates
          .filter(c => c.category && weights[c.category] && weights[c.category] !== c.priority)
          .map(c => ({ id: c.id, priority: weights[c.category] as string }))

        for (const update of updates) {
          await adminSupabase.from('post_candidates')
            .update({ priority: update.priority })
            .eq('id', update.id)
        }
        updatedCount = updates.length
      }
    }

    return NextResponse.json({
      analysis,
      priority_weights: weights,
      updated_count: updatedCount,
    })
  } catch (error) {
    console.error('instagram-priority error:', error)
    return NextResponse.json({ error: '分析に失敗しました' }, { status: 500 })
  }
}
