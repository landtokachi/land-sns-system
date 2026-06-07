import OpenAI from 'openai'
import type { AiPostResult, PostCandidate } from '@/types'
import { LAND_STYLE_GUIDE } from './land-style-guide'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function generateSocialPosts(candidate: Partial<PostCandidate>): Promise<AiPostResult> {
  const info = {
    title: candidate.title || '',
    category: candidate.category || '',
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

  const isSubsidy  = info.category.includes('補助金') || info.category.includes('助成')
  const isEvent    = info.category.includes('イベント') || info.category.includes('セミナー')
  const isLandOwn  = info.category.includes('LAND') || info.category.includes('とかち財団') || info.category.includes('活動')
  const isLandscape = info.category.includes('事業者紹介') || info.category.includes('採択者')

  // LANDが主催か外部情報か判定
  const isExternal = !isLandOwn
  const organizerName = info.organizer || '関係機関'
  const urlForPost = info.applyUrl || info.sourceUrl || ''

  const headlineHint = isSubsidy
    ? '補助金・支援制度名を活かした見出し\n  例: ＼「〇〇補助金」募集開始のお知らせです📣／\n  例: ＼〇〇万円補助！「△△補助金」のご案内です⚡️／'
    : isEvent
    ? 'イベント名・日程を活かした見出し\n  例: ＼〇月〇日(曜日)開催！「△△セミナー」参加者募集中📣／'
    : isLandscape
    ? '取材対象者名を活かした見出し\n  例: ＼「LANDSCAPE」更新！今回は、〇〇さんです✨／'
    : isLandOwn
    ? 'LANDの活動内容を活かした見出し\n  例: ＼事業相談、ぜひお気軽にお越しください🙋‍♀️🙋🙋‍♂️／'
    : '内容を凝縮した見出し'

  const requiredDetails = isSubsidy ? `
【補助金・支援制度 — raw_textから以下を全て抽出して本文に書くこと】
・補助金・制度の正式名称
・対象者（中小企業・個人事業主・創業予定者など、具体的に）
・補助金額・上限額（「最大〇〇万円」など必ず金額を明記）
・補助率（「補助率2/3」「補助率1/2」など）
・対象となる経費・取り組み内容
・公募期間・申請期間（開始日〜終了日）
・申込締切日
・申請方法・窓口

【NG】「詳細はウェブサイトで」を本文の代わりに使わない。数字・金額・日付が書いてあるなら全て本文に入れる。` : isEvent ? `
【イベント・セミナー — raw_textから以下を全て抽出して本文に書くこと】
・イベント・セミナーの正式名称
・開催日時（〇月〇日（曜日）〇〇:〇〇〜〇〇:〇〇）
・開催場所・会場名（住所 or オンライン）
・参加費（無料 or 有料・金額）
・定員
・申込方法・申込締切
・登壇者・スピーカー名
・内容・テーマの具体的な説明（何を学べるか）
・対象者

【NG】日時・場所・参加費を「ウェブサイトで確認」とだけ書かない。必ず本文に記載。` : isLandscape ? `
【事業者紹介（LANDSCAPE） — 本文に書くこと】
・取材対象者名・企業名
・事業内容・取り組みの具体的な説明
・特徴・強み・ユニークな点
・「十勝の事業創発につながる企業の取り組みを、LANDスタッフが取材し紹介する「LANDSCAPE」🙋‍♀️🙋🙋‍♂️」の一文を含める` : `
【その他コンテンツ — raw_textから以下を全て抽出して本文に書くこと】
・内容の具体的な説明（何ができる・何が変わる・何を学べるか）
・対象者・読んでほしい人
・日程・締切・金額など具体的な数字`

  const prompt = `あなたはスタートアップ支援施設「LAND」（公益財団法人とかち財団運営、北海道帯広）のSNS担当です。

${LAND_STYLE_GUIDE}

━━━━━━━━━━━━━━━━━━━━━━
【今回の投稿情報】

タイトル: ${info.title}
カテゴリ: ${info.category || '（未設定）'}
情報発信元（主催・実施機関）: ${organizerName}
${info.audience ? `対象者: ${info.audience}` : ''}
${info.eventDate ? `開催日: ${info.eventDate}` : ''}
${info.deadline ? `申込締切: ${info.deadline}` : ''}
${urlForPost ? `URL: ${urlForPost}` : ''}
${info.region ? `対象地域: ${info.region}` : ''}

【情報源の詳細テキスト（★最重要 — ここから数字・日付・条件を全て抽出すること）】
${info.rawText ? info.rawText.slice(0, 3500) : info.summary || '（情報源テキストなし）'}

${info.factCheckPoints.length > 0 ? `【確認済み重要事項】\n${info.factCheckPoints.map(p => `・${p}`).join('\n')}` : ''}

━━━━━━━━━━━━━━━━━━━━━━
${requiredDetails}

━━━━━━━━━━━━━━━━━━━━━━
【絶対に守るルール】

1. 冒頭は必ず「＼〇〇〇／」形式の見出しから始める
   ${headlineHint}

2. ${isExternal
    ? `【外部情報の必須ルール】この情報は「${organizerName}」が出している情報であり、LANDやとかち財団が主催・実施しているものではない。
   必ず「${organizerName}より、〇〇のお知らせです✨」または「${organizerName}からのご案内です📣」という書き出しにする。
   「LANDより」「とかち財団より」と読まれるような書き方を絶対にしない。`
    : `この情報はLAND・とかち財団が主催・実施する情報なので、LANDの活動として書く。`
   }

3. raw_textの詳細情報（金額・補助率・日時・場所・対象者・条件）を全て本文に入れること。
   「詳細はウェブサイトをご確認ください」は締め文の最後の1行だけに使い、情報の代わりに使わない。

4. 本文構成:
   ① 見出し（＼〇〇〇／）
   ② 書き出し（誰が出している情報かを明確に）
   ③ 本文（具体的な内容・金額・日時・対象者などを詳しく記述）
   ④ ＜概要＞セクション（箇条書きで重要情報を整理）
   ⑤ URL
   ⑥ 締め文（「詳細については、〇〇ウェブサイトをご確認くださいね🙆‍♂️💁‍♀️」）
   ※締め文で情報源表記は不要

5. 絵文字は✨📣👀🙆‍♂️💁‍♀️💪😊📅📍✅🌍⏰💰🔥✌️ などを自然に使う

6. ですます調・親しみやすいが信頼感のある文体（LANDスタイルガイドに従う）

7. 補助金・制度の＜概要＞形式:
   ○対象: 〇〇
   ○補助金額: 最大〇〇万円
   ○補助率: 〇分の〇
   ○公募期間: 〇月〇日〜〇月〇日
   ○申込締切: 〇月〇日

8. イベントの＜概要＞形式:
   📅 日時: 〇月〇日（曜日）〇〇:〇〇〜
   📍 場所: 〇〇
   ✅ 参加費: 無料 / 〇〇円
   ⏰ 締切: 〇月〇日

9. Instagramキャプションは800〜1200文字
10. ハッシュタグ: イベント・学生向けは付ける。補助金案内は不要か最小限

以下のJSON形式のみで返してください:
{
  "instagram_caption": "Instagramキャプション全文（＼見出し／〜書き出し〜本文（詳細な情報）〜＜概要＞〜URL〜締め文）",
  "facebook_text": "Facebook投稿文全文（Instagramとほぼ同構成）",
  "x_text": "X投稿文。140字以内。冒頭＼〇〇〇／形式・金額や日程を凝縮・URL末尾に1つ。",
  "hashtags": "ハッシュタグ（スペース区切り・イベント/学生系のみ）",
  "story_text": "ストーリーズ用キャッチコピー（30〜40文字・金額や日程入り）",
  "image_title": "画像タイトル（20文字以内）",
  "image_subtitle": "画像サブテキスト（30文字以内・補助金額か日程など）",
  "image_points": ["ポイント1（15文字以内）", "ポイント2", "ポイント3"]
}`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.55,
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
