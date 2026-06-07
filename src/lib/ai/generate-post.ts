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

  const headlineHint = isSubsidy
    ? '補助金名や支援制度名を活かした見出し（例: ＼事業承継に関する補助金事業のご案内です📣／）'
    : isEvent
    ? 'イベント名・日程を活かした見出し（例: ＼明後日〇月〇日(土)開催！参加者絶賛募集中／）'
    : isLandscape
    ? '取材対象者名を活かした見出し（例: ＼「LANDSCAPE」更新！今回は、〇〇さんです✨／）'
    : isLandOwn
    ? 'LANDの活動内容を活かした見出し（例: ＼事業相談、ぜひお気軽にお越しください🙋‍♀️🙋🙋‍♂️／）'
    : '内容を凝縮した見出し'

  // カテゴリ別の「本文に必ず含める情報」の指示
  const detailRequirements = isSubsidy ? `
【補助金・支援制度の場合に必ず本文に含める情報（情報がある場合）】
- 補助金・制度の正式名称
- 対象者（例: 中小企業・個人事業主・創業予定者 など）
- 補助金額・上限額（例: 最大〇〇万円、上限〇〇万円 など）
- 補助率（例: 補助率2/3、補助率3/4 など）
- 申請・公募期間（例: 〇月〇日〜〇月〇日 など）
- 申込締切（必ず明記）
- 主催・実施機関
- 対象経費・用途（あれば）
- ＜概要＞セクションを本文下部に設け、上記を箇条書きで整理する

【NG】「詳細はウェブサイトで」だけで済ませない。わかる情報はすべて本文に入れる。` : isEvent ? `
【イベント・セミナーの場合に必ず本文に含める情報（情報がある場合）】
- イベント・セミナー名（正式名称）
- 開催日時（〇月〇日（曜日）〇〇:〇〇〜 の形式）
- 開催場所・会場（オンライン or 現地、住所）
- 参加費（無料 or 有料・金額）
- 定員（あれば）
- 申込方法・申込締切
- 登壇者・スピーカー（あれば）
- 内容・テーマの概要（1〜2文）
- 対象者
- ＜概要＞セクションを本文下部に設け、上記を箇条書きで整理する

【NG】日時・場所・参加費が抜けるのはNG。必ず具体的に記載。` : isLandscape ? `
【事業者紹介（LANDSCAPE）の場合に必ず本文に含める情報】
- 取材対象者名・企業名
- 事業内容・取り組みの概要（2〜3文）
- LANDとの関わり・LANDDスペース利用など（あれば）
- 「十勝の事業創発につながる企業の取り組みを、LANDスタッフが取材し紹介する「LANDSCAPE」🙋‍♀️🙋🙋‍♂️」の一文を本文に含める` : `
【その他コンテンツの場合に必ず本文に含める情報（情報がある場合）】
- 内容の具体的な説明（何ができる・何が変わる・何を学べる）
- 対象者・読んでほしい人
- 日程・締切・金額など具体的な数字があれば必ず記載`

  const prompt = `あなたはスタートアップ支援施設「LAND」（公益財団法人とかち財団運営、北海道帯広）のSNS担当です。

以下のスタイルガイドと実際の投稿サンプルを熟読し、同じスタイル・トーン・構成で投稿文を作成してください。

${LAND_STYLE_GUIDE}
━━━━━━━━━━━━━━━━━━━━━━

【今回の投稿情報】
タイトル: ${info.title}
${info.category ? `カテゴリ: ${info.category}` : ''}
${info.summary ? `内容・要約（重要: この情報を最大限活用すること）:\n${info.summary}` : ''}
${info.audience ? `対象者: ${info.audience}` : ''}
${organizerText ? `主催/情報元: ${organizerText}` : ''}
${info.eventDate ? `開催日: ${info.eventDate}` : ''}
${info.deadline ? `申込締切: ${info.deadline}` : ''}
${urlForPost ? `URL: ${urlForPost}` : ''}
${info.region ? `対象地域: ${info.region}` : ''}

${detailRequirements}

━━━━━━━━━━━━━━━━━━━━━━
【必ず守るルール】
1. 冒頭は必ず「＼〇〇〇／」形式の見出しから始める（${headlineHint}）
2. 外部情報の場合「〜のお知らせです」「〜のご案内です」という書き出し（LAND主催と誤解させない）
3. 上記「必ず含める情報」にある項目を漏れなく本文に入れる（情報がある限り全て記載）
4. 本文の末尾近くに必ずURLを記載する（Instagramでも本文中にURLを貼る）
5. 締め文は「詳細については、〇〇ウェブサイトをご確認くださいね🙆‍♂️💁‍♀️」の形式
6. 絵文字は✨📣👀🤔🙆‍♂️💁‍♀️💪😊📅📍✅🌍⏰💰 などを自然に使う
7. ですます調・親しみやすいが信頼感のある文体
8. 補助金・支援制度の場合: ＜概要＞セクションを本文末尾近くに「○対象: 」「○補助金額: 」「○補助率: 」「○公募期間: 」の形式で必ず追加
9. イベント・セミナーの場合: ＜概要＞セクションを「📅 日時: 」「📍 場所: 」「✅ 参加費: 」「⏰ 締切: 」の形式で必ず追加
10. Instagramキャプションは800〜1200文字程度（情報量を豊富に）
11. ハッシュタグ: イベント・学生向け系には付ける。補助金案内・支援制度系にはつけないかごく少数

以下のJSON形式のみで返してください:
{
  "instagram_caption": "Instagramキャプション全文。冒頭＼〇〇〇／から始まり、本文（具体的な数字・金額・日程を豊富に）、＜概要＞セクション、URL、締め文まで完全な投稿文。改行あり。800〜1200文字程度。",
  "facebook_text": "Facebook投稿文全文。Instagramとほぼ同じ構成でOK。改行あり。URLそのまま記載。",
  "x_text": "X(Twitter)投稿文。140字以内。冒頭の＼〇〇〇／形式を使い、金額・日程などを凝縮。URLは末尾に1つ。",
  "hashtags": "${isEvent || !isSubsidy ? '#LAND #十勝 #帯広 #起業 #創業 など内容に合わせて5〜8個 スペース区切り' : '補助金・支援制度の場合は空文字列または最小限'}",
  "story_text": "Instagramストーリーズ用キャッチコピー（30〜40文字・インパクト重視・金額や日付を入れると効果的）",
  "image_title": "画像メインタイトル（20文字以内・インパクト重視）",
  "image_subtitle": "画像サブテキスト（30文字以内・補助金額や日程など最重要情報）",
  "image_points": ["画像に載せるポイント1（15文字以内）", "ポイント2（15文字以内）", "ポイント3（15文字以内）"]
}`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.65,
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
