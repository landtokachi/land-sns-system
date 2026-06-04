import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 監視する情報源リスト（定期的に新しい情報を収集する）
const COLLECTION_SOURCES = [
  {
    name: '中小企業庁 補助金・支援情報',
    url: 'https://www.chusho.meti.go.jp/keiei/index.html',
    category: '補助金・助成金・支援制度',
  },
  {
    name: 'J-Net21 支援情報ヘッドライン',
    url: 'https://j-net21.smrj.go.jp/support/headline/',
    category: '補助金・助成金・支援制度',
  },
  {
    name: 'Jグランツ（補助金申請システム）',
    url: 'https://jgrants.go.jp/',
    category: '補助金・助成金・支援制度',
  },
  {
    name: '北海道経済部 創業支援',
    url: 'https://www.pref.hokkaido.lg.jp/kz/csk/',
    category: '補助金・助成金・支援制度',
  },
  {
    name: 'とかち財団 公式サイト',
    url: 'https://www.tokachi-zaidan.jp/',
    category: 'とかち財団の取り組み',
  },
]

function extractTextFromHtml(html: string): string {
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  text = text.replace(/<[^>]+>/g, ' ')
  text = text.replace(/\s+/g, ' ').trim()
  return text.slice(0, 4000)
}

async function fetchPageText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LANDBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ja,en',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const html = await res.text()
    return extractTextFromHtml(html)
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sources } = await request.json().catch(() => ({ sources: null }))
  const targetSources = sources || COLLECTION_SOURCES

  const results: Array<{
    source_name: string
    url: string
    status: string
    candidates?: Array<Record<string, unknown>>
    error?: string
  }> = []

  for (const source of targetSources) {
    try {
      const pageText = await fetchPageText(source.url)
      if (!pageText) {
        results.push({ source_name: source.name, url: source.url, status: 'fetch_failed', error: 'ページを取得できませんでした' })
        continue
      }

      // AIで投稿候補になりそうな情報を抽出
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `あなたはスタートアップ支援施設「LAND」（公益財団法人とかち財団運営、北海道十勝・帯広）のSNS担当アシスタントです。

以下は「${source.name}」（${source.url}）のページ内容です。
このページから、LANDのSNS投稿に使えそうな情報を最大5件抽出してください。

【抽出基準】
- 起業家・スタートアップ・中小企業に役立つ情報
- 補助金・助成金・支援制度
- セミナー・イベント・相談会
- 経営・マーケティング・資金調達のノウハウ
- 創業・起業に関する最新情報

【ページ内容】
${pageText}

以下のJSON形式で返してください:
{
  "candidates": [
    {
      "title": "タイトル（40文字以内）",
      "summary": "要約（150文字以内）",
      "category": "${source.category || 'お知らせ・募集'}",
      "target_audience": "対象者",
      "event_date": "開催日（YYYY-MM-DD、なければnull）",
      "deadline": "締切（YYYY-MM-DD、なければnull）",
      "organizer": "主催者",
      "source_url": "${source.url}",
      "region": "対象地域",
      "ai_score": "LANDのSNS投稿としておすすめ度（1〜10）",
      "ai_reason": "おすすめ理由（50文字以内）"
    }
  ]
}

情報が見つからない場合は candidates を空配列にしてください。`
        }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      })

      const content = response.choices[0].message.content
      if (!content) continue

      const parsed = JSON.parse(content)
      const candidates = parsed.candidates || []

      results.push({
        source_name: source.name,
        url: source.url,
        status: 'success',
        candidates,
      })
    } catch (error) {
      results.push({
        source_name: source.name,
        url: source.url,
        status: 'error',
        error: String(error),
      })
    }
  }

  // 収集した候補をDBに保存（ステータス: unconfirmed）
  const allCandidates = results.flatMap((r) =>
    (r.candidates || []).map((c) => ({
      title: c.title as string,
      source_url: c.source_url as string,
      source_name: (results.find(r2 => r2.url === c.source_url)?.source_name) as string,
      raw_text: c.summary as string,
      ai_summary: c.summary as string,
      category: c.category as string,
      target_audience: c.target_audience as string | null,
      event_date: c.event_date as string | null,
      deadline: c.deadline as string | null,
      organizer: c.organizer as string | null,
      region: c.region as string | null,
      ai_score: c.ai_score as number,
      ai_reason: c.ai_reason as string,
      status: 'unconfirmed',
      priority: 'medium',
      importance: 'normal',
      platforms: ['instagram', 'facebook', 'x'],
    }))
  )

  let savedCount = 0
  if (allCandidates.length > 0) {
    // 既存タイトルを取得して重複を除外
    const titles = allCandidates.map((c) => c.title)
    const { data: existing } = await adminSupabase
      .from('post_candidates')
      .select('title')
      .in('title', titles)
    const existingTitles = new Set((existing || []).map((e: { title: string }) => e.title))
    const newCandidates = allCandidates.filter((c) => !existingTitles.has(c.title))

    if (newCandidates.length > 0) {
      const { data, error } = await adminSupabase
        .from('post_candidates')
        .insert(newCandidates)
        .select('id')
      if (!error) savedCount = data?.length || 0
    }
  }

  return NextResponse.json({
    sources_checked: targetSources.length,
    candidates_found: allCandidates.length,
    saved_count: savedCount,
    results,
  })
}

// 収集ソース一覧を取得
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json({ sources: COLLECTION_SOURCES })
}
