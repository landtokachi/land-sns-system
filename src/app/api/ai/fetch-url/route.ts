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

// ページ内の<title>の主要部分（｜より前）を取り出す
function extractTitleCore(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (!m) return ''
  return m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(/[|｜\-–—]/)[0].trim()
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

// 補助金・募集ページの「詳細ページ」リンクを最大max件、関連度順に選ぶ（同一ドメインHTMLのみ）
function pickDetailLinks(html: string, baseUrl: string, max = 2): string[] {
  const KEYWORDS = ['公募', '募集要項', '募集', '要領', '詳細', 'お知らせ', '案内', '申請', '補助', '助成', '開催', 'セミナー', 'イベント', '説明会']
  let base: URL
  try { base = new URL(baseUrl) } catch { return [] }
  const baseHost = base.hostname.replace(/^www\./, '')
  const titleCore = extractTitleCore(html)
  const seen = new Set<string>([baseUrl.split('#')[0]])
  const scored: { url: string; score: number }[] = []

  for (const { href, text } of extractAnchors(html)) {
    let u: URL
    try { u = new URL(href, base) } catch { continue }
    const clean = u.origin + u.pathname + u.search
    if (seen.has(clean)) continue
    const host = u.hostname.replace(/^www\./, '')
    if (host !== baseHost) continue                                  // 同一ドメインのみ
    if (/\.(pdf|zip|docx?|xlsx?|pptx?|jpe?g|png|gif|svg)$/i.test(u.pathname)) continue  // ファイルは現状対象外
    if (/(index|about|facility|works|charge|recruit|request|privacy|sitemap|login|tp_list|fd_list|fd_search)\.php$/i.test(u.pathname)) continue // ナビ系を除外

    const hay = text + ' ' + decodeURIComponent(u.pathname + u.search)
    let score = 0
    for (const k of KEYWORDS) if (hay.includes(k)) score += 1
    if (/(detail|tp_detail|article|news|topics)/i.test(u.pathname)) score += 1
    if (text.length >= 12) score += 1
    if (titleCore && titleCore.length >= 4 && text.includes(titleCore)) score += 5  // 同じ主題のリンクを強く優先

    if (score < 2) continue
    seen.add(clean)
    scored.push({ url: clean, score })
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, max).map((s) => s.url)
}

// URLを取得して本文テキストを返す（HTMLのみ）
async function fetchPageText(url: string, timeoutMs = 10000): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LANDBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ja,en',
      },
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) return ''
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('html')) return ''
    return extractTextFromHtml(await res.text())
  } catch {
    return ''
  }
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
  const followedUrls: string[] = []
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

      // ★リンク先追跡：詳細ページを最大2件たどって本文を補強する
      if (fetchSuccess) {
        const detailUrls = pickDetailLinks(html, url, 2)
        for (const durl of detailUrls) {
          const dtext = await fetchPageText(durl)
          if (dtext && dtext.length > 200) {
            pageText += `\n\n----- 関連詳細ページ（${durl}） -----\n${dtext}`
            followedUrls.push(durl)
          }
        }
        pageText = pageText.slice(0, 16000)
      }
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

━━━━━━━━━━━━━━━━━━━━━━
【情報抽出の絶対ルール（最重要）】
◆ 下の「ページ内容」に明記されている情報だけを抽出する。
◆ ページ内容に書かれていない金額・補助率・締切日・開催日・対象者・要件・定員は、絶対に推測・補完しない。不明な項目は必ず null（文字列の欄は空文字 "" ）にする。
◆ 「だいたいこのくらい」「一般的にはこう」という常識・経験での穴埋めは禁止。
◆ ページに複数の制度・イベントが載っている場合、別々の制度の金額や締切を混同しない。1つのitemには、そのページ内でその制度について明記された情報だけを入れる。
◆ summary と raw_text には、ページ本文に実在する記述だけを書く。存在しない数字・日付を作らない。
◆ 金額・補助率・締切日・開催日は、ページ本文の表記をそのままの数値で引用する（言い換えや概算をしない）。
◆ 本文が短く情報が乏しい場合は、無理に項目を埋めず null・空文字のままにし、unclear_points に不足項目を挙げる。
◆ 「----- 関連詳細ページ -----」以降のテキストは、メインページの主題（同じ制度・イベント）の詳細（金額・補助率・締切・対象者など）を補うための補足情報。これを使ってメインの情報を充実させてよいが、メインと無関係な別の制度・イベントを新しいitemとして増やさないこと。
━━━━━━━━━━━━━━━━━━━━━━

以下はURL「${url}」のWebページ内容です（必要に応じて関連詳細ページの内容も後ろに付加しています）。
このページからSNS投稿に使えそうな情報を分析してください。
【重要】
- ページに複数の独立した情報（複数の補助金、複数のイベント等）がある場合は、それぞれを別のitemsとして返す（最大5件）
- 1つの情報だけのページなら items は1件
- 情報源サイトの名前（官公庁名・団体名等）も必ず抽出する
【ページ内容】
${pageText}
以下のJSON形式で返してください:
{
  "site_name": "このサイト・ページの情報元名（例: 中小企業庁、北海道経済部）。判別できなければ空文字",
  "page_type": "single（1つの情報）またはlist（複数の情報の一覧ページ）",
  "items": [
    {
      "title": "タイトル（40文字以内・SNS投稿候補として適切な名前）",
      "summary": "この情報の要約（200文字以内・ページ本文に明記された内容のみ。書かれていない金額・条件は推測で補わない）",
      "category": "補助金・助成金・支援制度 / イベント・セミナー / LANDの取り組み / とかち財団の取り組み / 事業者紹介 / 採択者・卒業生・支援先のその後 / 学生起業支援 / 活動レポート / お知らせ・募集 / コラム・ノウハウ から最適なもの",
      "target_audience": "対象者（例: 中小企業・個人事業主・創業予定者。ページに明記がなければnull）",
      "organizer": "主催者・実施機関（ページに明記がなければnull）",
      "event_date": "開催日（YYYY-MM-DD、ページに明記がなければnull）",
      "deadline": "申込締切（YYYY-MM-DD、ページに明記がなければnull）",
      "application_url": "申込・詳細URL（元URLと異なる場合のみ。なければnull）",
      "region": "対象地域（全国/北海道/十勝/帯広。判別できなければnull）",
      "raw_text": "投稿文作成に使える重要情報を、ページ本文の表記のまま引用した抜粋（400文字以内・金額や締切は本文の数値をそのまま。本文に無い情報は書かない）",
      "ai_score": SNS投稿としてのおすすめ度（1〜10の整数）,
      "score_reason": "おすすめ理由（30文字以内）"
    }
  ],
  "unclear_points": ["ページから読み取れなかった重要項目（不明な日付・金額・対象者等）のリスト。問題なければ空配列"]
}`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.1,
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
