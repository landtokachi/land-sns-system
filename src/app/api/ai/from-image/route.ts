import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

export const maxDuration = 60

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// 画像（チラシ写真など）をgpt-4oのビジョンで直接読み取り、投稿候補情報を抽出する
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { image, filename } = body as { image: string; filename?: string }
    if (!image || !image.startsWith('data:image')) {
      return NextResponse.json({ error: '画像データが不正です' }, { status: 400 })
    }

    const today = new Date().toISOString().slice(0, 10)
    const prompt = [
      'あなたはスタートアップ支援施設「LAND」（北海道十勝・帯広）のSNS担当です。本日: ' + today,
      '添付の画像（チラシ・ポスターの写真。ファイル名: ' + (filename || '画像') + '）を読み取り、LANDのSNS投稿候補として登録する情報を抽出してください。',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━',
      '【絶対ルール（最重要）】',
      '◆ 画像に実際に書かれている情報だけを抽出する。読み取れない・書かれていない金額・日付・対象者・要件は推測や創作をせず、不明はnull（文字列欄は空文字）にする。',
      '◆ 金額・締切日・開催日・会場・電話・URLは、画像の表記をそのまま正確に書き写す（数字や日付を変えない）。',
      '◆ 複数の日程・回・枠がある場合は、raw_textに全て漏れなく書き出す（1つにまとめて省略しない）。',
      '━━━━━━━━━━━━━━━━━━━━━━',
      '',
      '【LANDのInstagram投稿傾向】補助金・助成金（締切あり=高優先）／地域セミナー・イベント（帯広・十勝=高優先）／LAND・とかち財団の取り組み（中〜高）／コラム・ノウハウ（中）／全国一般（低）',
      '',
      '以下のJSON形式のみで返してください:',
      '{',
      '  "title": "タイトル（40文字以内）",',
      '  "summary": "要約（300文字以内・具体情報を含む）",',
      '  "raw_text": "画像から読み取れる重要情報を漏れなく詳しく書き出した本文（1500文字以内）。日程一覧・会場・参加費・申込締切・対象/参加要件・主催/共催・申込方法/URL・問い合わせ先など、画像にあるものは全て含める。画像にない情報は書かない",',
      '  "category": "補助金・助成金・支援制度 / イベント・セミナー / LANDの取り組み / とかち財団の取り組み / お知らせ・募集 / コラム・ノウハウ",',
      '  "target_audience": "対象者（画像になければnull）",',
      '  "event_date": "開催日（YYYY-MM-DD、複数あれば最初の回。なければnull）",',
      '  "deadline": "申込締切（YYYY-MM-DD、なければnull）",',
      '  "organizer": "主催者・機関名（なければnull）",',
      '  "region": "対象地域（全国/北海道/十勝・帯広。判別できなければnull）",',
      '  "application_url": "申込・詳細URL（画像内にあれば。なければnull）",',
      '  "ai_score": 1〜10の整数,',
      '  "ai_reason": "おすすめ理由（50文字以内）",',
      '  "priority": "high / medium / low"',
      '}'
    ].join('\n')

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: image, detail: 'high' } },
        ],
      }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    })

    const result = JSON.parse(response.choices[0].message.content || '{}')
    return NextResponse.json(result)
  } catch (error) {
    console.error('from-image error:', error)
    return NextResponse.json({ error: '画像の解析に失敗しました' }, { status: 500 })
  }
}
