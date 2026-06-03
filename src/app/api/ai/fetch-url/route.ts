import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function extractTextFromHtml(html: string): string {
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  text = text.replace(/<[^>]+>/g, ' ')
  text = text.replace(/\s+/g, ' ').trim()
  return text.slice(0, 8000)
}

export interface FetchUrlItem {
  title: string
  summary: string
  category: string | null
  target_audience: string | null
  organizer: string | null
  event_date: string | null
  deadline: string | null
  application_url: string | null
  region: string | null
  raw_text: string
  ai_score: number
  score_reason: string
}

export interface FetchUrlResponse {
  fetch_success: boolean
  site_name: string | null
  page_type: 'single' | 'list' | 'unknown'
  items: FetchUrlItem[]
  unclear_points: string[]
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await request.json()
  if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 })

  let pageText = ''
  let fetchSuccess = false
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LANDBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ja,en',
      },
      signal: AbortSignal.timeout(12000),
    })
    if (res.ok) {
      const html = await res.text()
      pageText = extractTextFromHtml(html)
      fetchSuccess = pageText.length > 200
    }
  } catch {
    // fetch失敗
  }

  if (!fetchSuccess) {
    return NextResponse.json({
      fetch_success: false,
      site_name: null,
      page_type: 'unknown',
      items: [],
      unclear_points: [
        'このページは自動で読み取ることができませんでした',
        'どのような種類の情報ですか？（例：補助金、イベント、ニュース）',
        '主催者・実施機関の名前を教えてください',
        '対象者（誰向けの情報か）を教えてください',
        '開催日・締切日はありますか？',
        '他に伝えたい内容があれば入力してください',
      ],
    } satisfies FetchUrlResponse)
  }

  const prompt = `あなたはスタートアップ支援施設「LAND」（公益財団法人とかち財団運営、北海道十勝・帯広）のSNS担当アシスタントです。

以下はURL「${url}」のWebページ内容です。
このページからSNS投稿に使えそうな情報を分析してください。

【重要】
- ページに複数の独立した情報（複数の補助金、複数のイベント等）がある場合は、それぞれを別のitemsとして返す（最大5件）
- 1つの情報だけのページなら items は1件
- 情報源サイトの名前（官公庁名・団体名等）も必ず抽出する

【ページ内容】
${pageText}

以下のJSON形式で返してください:
{
  "site_name": "このサイト・ページの情報元名（例: 中小企業庁、北海道経済部）",
  "page_type": "single（1つの情報）またはlist（複数の情報の一覧ページ）",
  "items": [
    {
      "title": "タイトル（40文字以内・SNS投稿候補として適切な名前）",
      "summary": "この情報の要約（200文字以内・具体的な内容・金額・条件等を含める）",
      "category": "補助金・助成金・支援制度 / イベント・セミナー / LANDの取り組み / とかち財団の取り組み / 事業者紹介 / 採択者・卒業生・支援先のその後 / 学生起業支援 / 活動レポート / お知らせ・募集 / コラム・ノウハウ から最適なもの",
      "target_audience": "対象者（例: 中小企業・個人事業主・創業予定者）",
      "organizer": "主催者・実施機関",
      "event_date": "開催日（YYYY-MM-DD、なければnull）",
      "deadline": "申込締切（YYYY-MM-DD、なければnull）",
      "application_url": "申込・詳細URL（元URLと異なる場合のみ。なければnull）",
      "region": "対象地域（全国/北海道/十勝/帯広）",
      "raw_text": "投稿文作成に使える重要情報の抜粋（400文字以内・具体的な数字・条件・特徴を含める）",
      "ai_score": SNS投稿としてのおすすめ度（1〜10の整数）,
      "score_reason": "おすすめ理由（30文字以内）"
    }
  ],
  "unclear_points": ["この情報について確認が必要な点のリスト（不明な日付・金額・対象者等）。問題なければ空配列"]
}`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    })

    const content = response.choices[0].message.content
    if (!content) throw new Error('Empty response')

    const parsed = JSON.parse(content)
    return NextResponse.json({
      fetch_success: true,
      site_name: parsed.site_name || null,
      page_type: parsed.page_type || 'single',
      items: parsed.items || [],
      unclear_points: parsed.unclear_points || [],
    } satisfies FetchUrlResponse)
  } catch (error) {
    console.error('fetch-url error:', error)
    return NextResponse.json({
      fetch_success: false,
      site_name: null,
      page_type: 'unknown',
      items: [],
      unclear_points: ['情報の取得に失敗しました。手動で内容を入力してください。'],
    } satisfies FetchUrlResponse)
  }
}
