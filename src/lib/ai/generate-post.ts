import OpenAI from 'openai'
import type { AiPostResult, PostCandidate } from '@/types'
import { LAND_STYLE_GUIDE } from './land-style-guide'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function generateSocialPosts(candidate: Partial<PostCandidate>): Promise<AiPostResult> {
  const info = {
    title: candidate.title || '',
    category: candidate.category || '',
    summary: candidate.ai_summary || candidate.raw_text || '',
    audience: candidate.target_audience || '',
    organizer: candidate.organizer || '',
    eventDate: candidate.event_date || '',
    deadline: candidate.deadline || '',
    sourceUrl: candidate.source_url || '',
    applyUrl: candidate.application_url || '',
    region: candidate.region || '',
  }

  const isSubsidy = info.category.includes('補助金') || info.category.includes('助成')
  const isEvent = info.category.includes('イベント') || info.category.includes('セミナー')
  const isLandscape = info.category.includes('事業者紹介') || info.category.includes('採択者')
  const isLandOwn = info.category.includes('LAND') || info.category.includes('とかち財団') || info.category.includes('活動')

  const urlForPost = info.applyUrl || info.sourceUrl || ''
  const organizerText = info.organizer ? `${info.organizer}` : ''

  // カテゴリ別の冒頭見出し例
  const headlineHint = isSubsidy
    ? '補助金名や支援制度名を活かした見出し（例: ＼事業承継に関する補助金事業のご案内です📣／）'
    : isEvent
    ? 'イベント名・日程を活かした見出し（例: ＼明後日〇月〇日(土)開催！参加者絶賛募集中／）'
    : isLandscape
    ? '取材対象者名を活かした見出し（例: ＼「LANDSCAPE」更新！今回は、〇〇さんです✨／）'
    : isLandOwn
    ? 'LANDの活動内容を活かした見出し（例: ＼事業相談、ぜひお気軽にお越しください🙋‍♀️🙋🙋‍♂️／）'
    : '内容を凝縮した見出し'

  const prompt = `あなたはスタートアップ支援施設「LAND」（公益財団法人とかち財団運営、北海道帯広）のSNS担当です。

以下のスタイルガイドと実際の投稿サンプルを熟読し、同じスタイル・トーン・構成で投稿文を作成してください。

${LAND_STYLE_GUIDE}
━━━━━━━━━━━━━━━━━━━━━━

【今回の投稿情報】
タイトル: ${info.title}
${info.category ? `カテゴリ: ${info.category}` : ''}
${info.summary ? `内容・要約: ${info.summary}` : ''}
${info.audience ? `対象者: ${info.audience}` : ''}
${organizerText ? `主催/情報元: ${organizerText}` : ''}
${info.eventDate ? `開催日: ${info.eventDate}` : ''}
${info.deadline ? `申込締切: ${info.deadline}` : ''}
${urlForPost ? `URL: ${urlForPost}` : ''}
${info.region ? `対象地域: ${info.region}` : ''}

【必ず守るルール】
1. 冒頭は必ず「＼〇〇〇／」形式の見出しから始める（${headlineHint}）
2. 外部情報の場合「〜のお知らせです」「〜のご案内です」という書き出し（LAND主催と誤解させない）
3. 本文中に具体的な数字・金額・対象者・日程・締切を含める（情報があれば全て記載）
4. 本文の末尾近くに必ずURLを記載する（Instagramでも本文中にURLを貼る）
5. 締め文は「詳細については、〇〇ウェブサイトをご確認くださいね🙆‍♂️💁‍♀️」の形式
6. 絵文字は✨📣👀🤔🙆‍♂️💁‍♀️💪😊📅📍✅🌍 などを自然に使う（多すぎない）
7. ですます調・親しみやすいが信頼感のある文体
8. ハッシュタグ: イベント・学生向け系には付ける。補助金案内・支援制度系にはつけないかごく少数

以下のJSON形式のみで返してください:
{
  "instagram_caption": "Instagramキャプション全文。冒頭＼〇〇〇／から始まり、本文、URL、締め文まで完全な投稿文。改行あり。サンプルと同等の長さ・密度で。",
  "facebook_text": "Facebook投稿文全文。Instagramとほぼ同じ構成でOK。改行あり。URLそのまま記載。",
  "x_text": "X(Twitter)投稿文。140字以内。冒頭の＼〇〇〇／形式を使い、要点を凝縮。URLは末尾に1つ。",
  "hashtags": "${isEvent || !isSubsidy ? '#LAND #十勝 #帯広 #起業 #創業 など内容に合わせて5〜8個 スペース区切り' : '補助金・支援制度の場合は空文字列でもOK'}",
  "story_text": "Instagramストーリーズ用キャッチコピー（30〜40文字・インパクト重視）",
  "image_title": "画像メインタイトル（20文字以内）",
  "image_subtitle": "画像サブテキスト（30文字以内）",
  "image_points": ["重要ポイント1（12文字以内）", "ポイント2", "ポイント3"]
}`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    })

    const content = response.choices[0].message.content
    if (!content) throw new Error('Empty response')

    return JSON.parse(content) as AiPostResult
  } catch (error) {
    console.error('AI post generation error:', error)
    return {
      instagram_caption: '投稿文の生成に失敗しました。手動で入力してください。',
      facebook_text: '投稿文の生成に失敗しました。手動で入力してください。',
      x_text: '投稿文の生成に失敗しました。',
      hashtags: '#LAND #起業 #十勝',
      story_text: '詳細はプロフィールリンクから',
      image_title: candidate.title?.slice(0, 20) || 'タイトル',
      image_subtitle: '',
      image_points: [],
    }
  }
}
