import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

export const maxDuration = 60

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
  return text.slice(0, 6000)
}

// ページのHTMLを取得（HTMLのみ）
async function fetchPageHtml(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LANDBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ja,en',
      },
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) return null
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('html')) return null
    return await res.text()
  } catch {
    return null
  }
}

// ページ内のリンク（href + リンク文）を抽出
function extractAnchors(html: string): { href: string; text: string }[] {
  const out: { href: string; text: string }[] = []
  const re = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const href = m[1]
    const text = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    if (href) out.push({ href, text })
  }
  return out
}

// 補助金・募集の「詳細ページ」リンクを最大max件、関連度順に選ぶ（同一ドメインHTMLのみ）
function pickDetailLinks(html: string, baseUrl: string, max = 2): string[] {
  const KEYWORDS = ['公募', '募集要項', '募集', '要領', '詳細', 'お知らせ', '案内', '申請', '補助', '助成', '開催', 'セミナー', 'イベント', '説明会', '相談会']
  let base: URL
  try { base = new URL(baseUrl) } catch { return [] }
  const baseHost = base.hostname.replace(/^www\./, '')
  const seen = new Set<string>([baseUrl.split('#')[0]])
  const scored: { url: string; score: number }[] = []
  for (const { href, text } of extractAnchors(html)) {
    let u: URL
    try { u = new URL(href, base) } catch { continue }
    const clean = u.origin + u.pathname + u.search
    if (seen.has(clean)) continue
    const host = u.hostname.replace(/^www\./, '')
    if (host !== baseHost) continue                                  // 同一ドメインのみ
    if (/\.(pdf|zip|docx?|xlsx?|pptx?|jpe?g|png|gif|svg)$/i.test(u.pathname)) continue  // ファイルは対象外
    if (/(index|about|facility|works|charge|recruit|request|privacy|sitemap|login|tp_list|fd_list|fd_search)\.php$/i.test(u.pathname)) continue // ナビ系を除外
    const hay = text + ' ' + decodeURIComponent(u.pathname + u.search)
    let score = 0
    for (const k of KEYWORDS) if (hay.includes(k)) score += 1
    if (/(detail|tp_detail|article|news|topics|jirei|shien|hojo)/i.test(u.pathname)) score += 1
    if (text.length >= 10) score += 1
    if (score < 3) continue   // 一覧ページはリンクが多いのでノイズ抑制のため閾値高め
    seen.add(clean)
    scored.push({ url: clean, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, max).map((s) => s.url)
}

type SourceDef = { name: string; url: string; category?: string }
type CollectResult = {
  source_name: string
  url: string
  status: string
  candidates?: Array<Record<string, unknown>>
  error?: string
}

// 1つの情報源を処理（取得→リンク先追跡→AI抽出）。例外は投げずに結果オブジェクトを返す
async function processSource(source: SourceDef): Promise<CollectResult> {
  try {
    const html = await fetchPageHtml(source.url, 8000)
    if (!html) {
      return { source_name: source.name, url: source.url, status: 'fetch_failed', error: 'ページを取得できませんでした' }
    }
    let pageText = extractTextFromHtml(html)
    if (!pageText || pageText.length < 100) {
      return { source_name: source.name, url: source.url, status: 'fetch_failed', error: '本文が取得できませんでした' }
    }

    // ★リンク先追跡：詳細ページを最大1件たどって本文を補強（巡回は件数が多いので軽めに）
    const detailUrls = pickDetailLinks(html, source.url, 1)
    const detailTexts = await Promise.all(detailUrls.map(async (durl) => {
      const dhtml = await fetchPageHtml(durl, 4000)
      if (!dhtml) return ''
      const dtext = extractTextFromHtml(dhtml)
      return (dtext && dtext.length > 200) ? `\n\n----- 関連詳細ページ（${durl}） -----\n${dtext}` : ''
    }))
    pageText = (pageText + detailTexts.join('')).slice(0, 12000)

    // AIで投稿候補になりそうな情報を抽出
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `あなたはスタートアップ支援施設「LAND」（公益財団法人とかち財団運営、北海道十勝・帯広）のSNS担当アシスタントです。

本日の日付: ${today}

以下は「${source.name}」（${source.url}）のページ内容です（必要に応じて関連詳細ページの内容も後ろに付加しています）。
このページから、LANDのSNS投稿に使えそうな【最新の情報】を最大5件抽出してください。
━━━━━━━━━━━━━━━━━━━━━━
【情報抽出の絶対ルール（最重要）】
◆ 下の「ページ内容」に明記されている情報だけを抽出する。
◆ 書かれていない金額・補助率・締切日・開催日・対象者・要件・定員は、絶対に推測・補完しない。不明な項目は必ず null（文字列の欄は空文字 "" ）にする。
◆ 常識や経験での穴埋めは禁止。別々の制度の金額・締切を混同しない。
◆ summary と raw_text には、ページ本文に実在する記述だけを書く。存在しない数字・日付を作らない。
◆ 金額・補助率・締切日・開催日は、ページ本文の表記をそのままの数値で引用する。
◆ 「----- 関連詳細ページ -----」以降のテキストは、各情報の詳細（金額・補助率・締切・対象者など）を補うための補足。該当する情報の詳細を充実させるために使い、別の情報と混同しないこと。
◆ 補助金などで複数の枠・ステージ・コース・対象区分がある場合は、各区分ごとに「名称・補助率・上限額・対象者・締切」を区別して raw_text に残す（1つにまとめて薄くしない）。
━━━━━━━━━━━━━━━━━━━━━━

【抽出基準】
- 起業家・スタートアップ・中小企業に役立つ情報
- 補助金・助成金・支援制度（現在募集中・今後公募予定のもの）
- セミナー・イベント・相談会（今後開催されるもの）
- 経営・マーケティング・資金調達のノウハウ
- 創業・起業に関する最新情報

【重要: 以下の情報は抽出しないこと】
- 締切日・開催日が本日（${today}）より前に終了した過去の情報
- 年度が古い情報（例: 令和5年度=2023年度、令和4年度=2022年度など今より2年以上前）
- すでに受付終了・募集終了と明記されているもの
- 過去のイベント報告・実績報告（「〇〇を開催しました」という過去形の記事）
- 現在は利用できないサービス・制度

【ページ内容】
${pageText}

以下のJSON形式で返してください:
{
  "candidates": [
    {
      "title": "タイトル（40文字以内）",
      "summary": "要約（200文字以内。ページ本文に明記された内容のみ。書かれていない金額・締切・対象者は推測で補わず省略。本文に金額・締切がある場合はその数値をそのまま含める）",
      "raw_text": "投稿文作成に使う重要情報を、ページ本文の表記のまま引用した抜粋（1500文字以内）。複数の枠・ステージ・コースがある場合は各区分の名称・補助率・上限額・対象者・締切を漏れなく書き出す（1つにまとめない）。金額・締切は本文の数値をそのまま。本文に無い情報は書かない",
      "category": "${source.category || 'お知らせ・募集'}",
      "target_audience": "対象者",
      "event_date": "開催日（YYYY-MM-DD、なければnull）",
      "deadline": "締切（YYYY-MM-DD、なければnull）",
      "organizer": "主催者",
      "source_url": "${source.url}",
      "region": "対象地域（全国/北海道/十勝/帯広）",
      "ai_score": 現在有効・最新の情報としてのおすすめ度（1〜10の整数）,
      "ai_reason": "おすすめ理由（50文字以内）"
    }
  ]
}

最新の有効な情報が見つからない場合は candidates を空配列にしてください。
古い情報・終了した情報は絶対に含めないでください。`
      }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    })

    const content = response.choices[0].message.content
    if (!content) {
      return { source_name: source.name, url: source.url, status: 'success', candidates: [] }
    }
    const parsed = JSON.parse(content)
    return {
      source_name: source.name,
      url: source.url,
      status: 'success',
      candidates: parsed.candidates || [],
    }
  } catch (error) {
    return { source_name: source.name, url: source.url, status: 'error', error: String(error) }
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sources } = await request.json().catch(() => ({ sources: null }))
  const targetSources: SourceDef[] = sources || COLLECTION_SOURCES

  // ★同時実行数を絞りつつ時間制限内で処理（サイト数が多くてもタイムアウトしないように）
  // 時間内に処理しきれなかったサイトは status:'skipped' として返す（再実行で続きを取得）
  const CONCURRENCY = 5
  const TIME_BUDGET_MS = 40000
  const startedAt = Date.now()
  const results: CollectResult[] = []
  let cursor = 0
  async function worker() {
    while (cursor < targetSources.length) {
      const i = cursor++
      const src = targetSources[i]
      if (Date.now() - startedAt > TIME_BUDGET_MS) {
        results.push({ source_name: src.name, url: src.url, status: 'skipped', error: '時間制限のためスキップ（もう一度「情報収集を開始」を押すと続きを収集します）' })
        continue
      }
      results.push(await processSource(src))
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targetSources.length) }, () => worker()))

  // 収集した候補をDBに保存（ステータス: unconfirmed）
  const allCandidates = results.flatMap((r) =>
    (r.candidates || []).map((c) => ({
      title: c.title as string,
      source_url: c.source_url as string,
      source_name: (results.find(r2 => r2.url === c.source_url)?.source_name) as string,
      raw_text: ((c.raw_text as string) && String(c.raw_text).trim().length > 0 ? (c.raw_text as string) : (c.summary as string)),
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
    // 締切日が過去のものを除外（念のため二重チェック）
    const todayStr = new Date().toISOString().slice(0, 10)
    const validCandidates = allCandidates.filter((c) => {
      if (c.deadline && c.deadline < todayStr) return false   // 締切済み
      if (c.event_date && c.event_date < todayStr) return false // 開催済み
      return true
    })

    // 既存タイトルを取得して重複を除外
    const titles = validCandidates.map((c) => c.title)
    if (titles.length === 0) return NextResponse.json({
      sources_checked: targetSources.length,
      candidates_found: allCandidates.length,
      saved_count: 0,
      results,
    })

    const { data: existing } = await adminSupabase
      .from('post_candidates')
      .select('title')
      .in('title', titles)
    const existingTitles = new Set((existing || []).map((e: { title: string }) => e.title))
    const newCandidates = validCandidates.filter((c) => !existingTitles.has(c.title))

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
