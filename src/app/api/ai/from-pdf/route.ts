import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { text, filename } = body as { text: string; filename?: string }

    if (!text || text.trim().length < 20) {
      return NextResponse.json({ error: 'PDFから十分なテキストを読み取れませんでした' }, { status: 400 })
    }

    const today = new Date().toISOString().slice(0, 10)
    const prompt = [
      'あなたはスタートアップ支援施設「LAND」（北海道十勝・帯広）のSNS担当です。本日: ' + today,
      '',
      '以下はPDFから抽出したテキスト（' + (filename || 'チラシ') + '）です。',
      'LANDのSNS投稿候補として登録するための情報を抽出してください。',
      '',
      '【LANDのInstagram投稿傾向（@land.tokachi の分析結果）】',
      '- 補助金・助成金・支援制度 → 最も投稿が多い（締切があるもの=高優先）',
      '- 地域のセミナー・イベント → 頻繁に投稿（帯広・十勝開催=高優先）',
      '- LANDの取り組み・REALIZE CAFEなど → 定期的に投稿（中〜高優先）',
      '- とかち財団の取り組み → 中〜高優先',
      '- 起業家向けコラム・ノウハウ → 中程度',
      '- 全国向けの一般情報 → 低優先',
      '',
      '【PDFテキスト】',
      text.slice(0, 6000),
      '',
      '以下のJSON形式のみで返してください:',
      '{',
      '  "title": "タイトル（40文字以内）",',
      '  "summary": "要約（300文字以内・補助金額・締切・対象者など具体情報を含む）",',
      '  "category": "補助金・助成金・支援制度 / イベント・セミナー / LANDの取り組み / とかち財団の取り組み / お知らせ・募集 / コラム・ノウハウ",',
      '  "target_audience": "対象者",',
      '  "event_date": "開催日（YYYY-MM-DD、なければnull）",',
      '  "deadline": "締切日（YYYY-MM-DD、なければnull）",',
      '  "organizer": "主催者・機関名",',
      '  "region": "対象地域（全国/北海道/十勝・帯広）",',
      '  "ai_score": 1～10の整数,',
      '  "ai_reason": "おすすめ理由（50文字以内）",',
      '  "priority": "high / medium / low（LANDのInstagram傾向に基づく）",',
      '  "instagram_caption": "Instagram投稿文（150文字以内・絵文字あり・ハッシュタグなし）",',
      '  "hashtags": "#補助金 #北海道 #帯広 #十勝 など（スペース区切り最大8個）"',
      '}'
    ].join('\n')

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    })

    const result = JSON.parse(response.choices[0].message.content || '{}')
    return NextResponse.json(result)
  } catch (error) {
    console.error('from-pdf error:', error)
    return NextResponse.json({ error: 'PDF分析に失敗しました' }, { status: 500 })
  }
}
