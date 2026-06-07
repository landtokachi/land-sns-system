import OpenAI from 'openai'
import type { AiPostResult, PostCandidate } from '@/types'
import { LAND_STYLE_GUIDE } from './land-style-guide'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function generateSocialPosts(candidate: Partial<PostCandidate>): Promise<AiPostResult> {
  const info = {
    title: candidate.title || '',
    category: candidate.category || '',
    // raw_text を最優先に使用（詳細情報が豊富）
    rawText: candidate.raw_text || '',
    summary: candidate.ai_summary || '',
    audience: candidate.target_audience || '',
    organizer: candidate.organizer || '',
    eventDate: candidate.event_date || '',
    deadline: candidate.deadline || '',
    sourceUrl: candidate.source_url || '',
    applyUrl: candidate.application_url || '',
    region: candidate.region || '',
    factCheckPoints: candidate.fact_check_points || [],
  }

  const isSubsidy = info.category.includes('補助金') || info.category.includes('助成')
  const isEvent   = info.category.includes('イベント') || info.category.includes('セミナー')
  const isLandOwn = info.category.includes('LAND') || info.category.includes('とかち財団') || info.category.includes('活動')
  const isLandscape = info.category.includes('事業者紹介') || info.category.includes('採択者')

  const urlForPost = info.applyUrl || info.sourceUrl || ''

  // カテゴリ別・見出しヒント
  const headlineHint = isSubsidy
    ? '補助金・支援制度名を活かした見出し（例: ＼「とかちビジネスチャレンジ補助金」募集開始のお知らせです📣／）'
    : isEvent
    ? 'イベント名・日程を活かした見出し（例: ＼〇月〇日(曜日)開催！参加者絶賛募集中／）'
    : isLandscape
    ? '取材対象者名を活かした見出し（例: ＼「LANDSCAPE」更新！今回は、〇〇さんです✨／）'
    : isLandOwn
    ? 'LANDの活動内容を活かした見出し（例: ＼事業相談、ぜひお気軽にお越しください🙋‍♀️🙋🙋‍♂️／）'
    : '内容を凝縮した見出し'

  // カテゴリ別・必須記載情報
  const requiredDetails = isSubsidy ? `
【補助金・支援制度 — 必ず本文に入れる情報（raw_textから徹底的に抽出）】
- 補助金・制度の正式名称（正確に）
- 対象者（誰が申請できるか。中小企業・個人事業主・創業予定者など）
- 補助金額・上限額（「最大〇〇万円」「〇〇万円〜〇〇万円」など。必ず金額を記載）
- 補助率（「補助率1/2」「補助率2/3」など）
- 申請期間・公募期間（開始日〜終了日）
- 申込締切（必ず明記）
- 対象となる経費・事業内容
- 主催・実施機関名

【NG】金額・補助率・期間が曖昧なまま「詳細はウェブサイトで」とだけ書くのは絶対にNG。
raw_textにある数字・割合・日付は全て本文に入れること。` : isEvent ? `
【イベント・セミナー — 必ず本文に入れる情報（raw_textから徹底的に抽出）】
- イベント・セミナー名（正式名称）
- 開催日時（〇月〇日（曜日）〇〇:〇〇〜〇〇:〇〇 の形式）
- 開催場所・会場（会場名・住所 または オンライン）
- 参加費（無料 or 有料・具体的な金額）
- 定員（あれば）
- 申込方法・申込締切
- 登壇者・スピーカー名（あれば）
- 内容・テーマの具体的な説明
- 対象者

【NG】日時・場所が不明確なまま投稿しない。` : isLandscape ? `
【事業者紹介（LANDSCAPE） — 必ず本文に入れる情報】
- 取材対象者名・企業名
- 事業内容・取り組みの具体的な説明（何をしている事業者か）
- 特徴・強み・ユニークな点
- 「十勝の事業創発につながる企業の取り組みを、LANDスタッフが取材し紹介する「LANDSCAPE」🙋‍♀️🙋🙋‍♂️」の一文を含める` : `
【その他コンテンツ — 必ず本文に入れる情報】
- 内容の具体的な説明（何ができる・何が変わる・何を学べるか）
- 対象者・読んでほしい人
- 日程・締切・金額など具体的な数字があれば必ず記載`

  const prompt = `あなたはスタートアップ支援施設「LAND」（公益財団法人とかち財団運営、北海道帯広）のSNS担当です。

${LAND_STYLE_GUIDE}

━━━━━━━━━━━━━━━━━━━━━━
【今回の投稿情報】

タイトル: ${info.title}
カテゴリ: ${info.category || '（未設定）'}
${info.audience ? `対象者: ${info.audience}` : ''}
${info.organizer ? `主催/情報元: ${info.organizer}` : ''}
${info.eventDate ? `開催日: ${info.eventDate}` : ''}
${info.deadline ? `申込締切: ${info.deadline}` : ''}
${urlForPost ? `URL: ${urlForPost}` : ''}
${info.region ? `対象地域: ${info.region}` : ''}

【情報源の詳細テキスト（最重要 — ここから正確な数字・日付・条件を抽出すること）】
${info.rawText ? info.rawText.slice(0, 3000) : info.summary || '（情報源テキストなし）'}

${info.factCheckPoints.length > 0 ? `【確認済み重要事項】\n${info.factCheckPoints.map(p => `・${p}`).join('\n')}` : ''}

━━━━━━━━━━━━━━━━━━━━━━
${requiredDetails}

━━━━━━━━━━━━━━━━━━━━━━
【必ず守るルール】
1. 冒頭は必ず「＼〇〇〇／」形式の見出しから始める（${headlineHint}）
2. 外部情報の場合「〇〇より、△△のお知らせです✨」「△△のご案内です📣」という書き出し
3. 上記「必ず入れる情報」にある項目を情報源から正確に抽出して全て記載する
4. 本文中に必ずURLを記載する
5. 締め文は「詳細については、〇〇ウェブサイトをご確認くださいね🙆‍♂️💁‍♀️」の形式
6. 絵文字は✨📣👀🤔🙆‍♂️💁‍♀️💪😊📅📍✅🌍⏰💰🔥✌️ などを自然に使う（多すぎない）
7. ですます調・親しみやすいが信頼感のある文体（LANDスタイルガイドに従う）
8. 日付の重複記載NG（本文と概要セクションで同じ内容を繰り返さない）
9. 補助金・制度: ＜概要＞セクションで「○対象: 」「○補助金額: 」「○補助率: 」「○公募期間: 」の形式で整理
10. イベント: ＜概要＞セクションで「📅 日時: 」「📍 場所: 」「✅ 参加費: 」「⏰ 締切: 」で整理
11. 投稿末尾に「📌 情報源: [URL or 機関名]」を記載（ファクトチェック用）
12. Instagramキャプションは800〜1200文字（情報量を豊富に）
13. ハッシュタグ: イベント・学生向けは付ける。補助金案内は不要か最小限

以下のJSON形式のみで返してください（説明文は不要）:
{
  "instagram_caption": "Instagramキャプション全文（冒頭＼〇〇〇／〜本文〜URL〜＜概要＞〜締め文〜📌情報源）",
  "facebook_text": "Facebook投稿文全文（Instagramとほぼ同構成）",
  "x_text": "X(Twitter)投稿文。140字以内。冒頭の＼〇〇〇／形式を使い、金額・日程などを凝縮。URLは末尾に1つ。",
  "hashtags": "ハッシュタグ（スペース区切り・イベント/学生系のみ付ける）",
  "story_text": "Instagramストーリーズ用キャッチコピー（30〜40文字・金額や日程を入れると効果的）",
  "image_title": "画像タイトル（20文字以内・インパクト重視）",
  "image_subtitle": "画像サブテキスト（30文字以内・補助金額か日程など最重要情報）",
  "image_points": ["画像ポイント1（15文字以内）", "ポイント2", "ポイント3"]
}`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.6,
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
