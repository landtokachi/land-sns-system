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
    sourceName: (candidate as Partial<PostCandidate> & { source_name?: string }).source_name || '',
  }

  // LANDやとかち財団が主催か外部情報かを判定
  const isLandOwn = info.category.includes('LAND') || info.category.includes('とかち財団') || info.category.includes('活動')
  const isSubsidy  = info.category.includes('補助金') || info.category.includes('助成')
  const isEvent    = info.category.includes('イベント') || info.category.includes('セミナー')
  const isLandscape = info.category.includes('事業者紹介') || info.category.includes('採択者')
  const isExternal = !isLandOwn

  // 情報源名を決定（organizer > source_name > URLから推測）
  let sourceOrg = info.organizer || info.sourceName || ''
  if (!sourceOrg && info.sourceUrl) {
    try {
      const domain = new URL(info.sourceUrl).hostname.replace('www.', '')
      if (domain.includes('chusho.meti.go.jp')) sourceOrg = '中小企業庁'
      else if (domain.includes('jizokukahojokin')) sourceOrg = '中小企業庁'
      else if (domain.includes('smrj.go.jp')) sourceOrg = '中小企業基盤整備機構'
      else if (domain.includes('mirasapo-plus')) sourceOrg = '中小企業庁'
      else if (domain.includes('monodukuri-hojo')) sourceOrg = '中小企業庁'
      else if (domain.includes('it-hojo')) sourceOrg = '中小企業庁'
      else if (domain.includes('pref.hokkaido')) sourceOrg = '北海道庁'
      else if (domain.includes('hkd.meti.go.jp')) sourceOrg = '北海道経済産業局'
      else if (domain.includes('hsc.or.jp')) sourceOrg = '北海道中小企業総合支援センター'
      else if (domain.includes('city.obihiro')) sourceOrg = '帯広市'
      else if (domain.includes('obihiro.or.jp')) sourceOrg = '帯広商工会議所'
      else if (domain.includes('tokachi')) sourceOrg = '十勝'
      else if (domain.includes('maff.go.jp')) sourceOrg = '農林水産省'
      else if (domain.includes('jfc.go.jp')) sourceOrg = '日本政策金融公庫'
    } catch { /* ignore */ }
  }

  const urlForPost = info.applyUrl || info.sourceUrl || ''

  const headlineHint = isSubsidy
    ? `補助金・支援制度名を活かした見出し\n  例: ＼「${info.title}」のご案内です📣／`
    : isEvent
    ? `イベント名・日程を活かした見出し\n  例: ＼○月○日開催！「${info.title}」参加者募集中📣／`
    : isLandscape
    ? `取材対象者名を活かした見出し\n  例: ＼「LANDSCAPE」更新！今回は、○○さんです✨／`
    : isLandOwn
    ? `LANDの活動内容を活かした見出し\n  例: ＼事業相談、ぜひお気軽にお越しください🙋‍♀️🙋🙋‍♂️／`
    : '内容を凝縮した見出し'

  const requiredDetails = isSubsidy ? `
【補助金・支援制度 ― 情報源テキストから以下を正確に抽出して記載】
・補助金・制度の正式名称（タイトルにある名称をそのまま使う）
・対象者（情報源にある表現をそのまま使う）
・補助金額・上限額（情報源に記載の金額。不明なら「詳細はウェブサイトで確認」）
・補助率（情報源に記載の補助率。不明なら省略）
・申請期間・公募期間（情報源の日付をそのまま使う）
・申込締切（情報源の日付をそのまま使う）
・主催・実施機関（${sourceOrg || '情報源に記載の機関名'}）

⚠️ 重要: 情報源テキストに書いていない情報は絶対に書かない。不明な場合は「詳細は○○ウェブサイトをご確認ください」と書く。` : isEvent ? `
【イベント・セミナー ― 情報源テキストから以下を正確に抽出して記載】
・イベント・セミナーの正式名称
・開催日時（情報源の日時をそのまま使う）
・開催場所（情報源の会場名・住所をそのまま使う）
・参加費（情報源の金額をそのまま使う）
・定員・申込締切（情報源にある場合）
・主催者（${sourceOrg || '情報源に記載の機関名'}）

⚠️ 重要: 情報源テキストに書いていない情報は絶対に書かない。` : `
【その他コンテンツ ― 情報源テキストから正確に抽出して記載】
・情報源に書いてある内容だけを使う
・不明な情報は書かない`

  const prompt = `あなたはスタートアップ支援施設「LAND」（公益財団法人とかち財団運営、北海道帯広）のSNS担当です。

${LAND_STYLE_GUIDE}

━━━━━━━━━━━━━━━━━━━━━━
【今回の投稿情報】

タイトル: ${info.title}
カテゴリ: ${info.category || '（未設定）'}
情報発信元・主催機関: ${sourceOrg || '（情報源テキストから確認すること）'}
${info.audience ? `対象者: ${info.audience}` : ''}
${info.eventDate ? `開催日: ${info.eventDate}` : ''}
${info.deadline ? `申込締切: ${info.deadline}` : ''}
${urlForPost ? `情報源URL: ${urlForPost}` : ''}
${info.region ? `対象地域: ${info.region}` : ''}

【★最重要: 情報源の詳細テキスト（このテキストに書いてある情報だけを使うこと）】
${info.rawText ? info.rawText.slice(0, 4000) : info.summary || '（情報源テキストなし）'}

━━━━━━━━━━━━━━━━━━━━━━
${requiredDetails}

━━━━━━━━━━━━━━━━━━━━━━
【絶対に守るルール】

1. 冒頭は必ず「＼〇〇〇／」形式の見出しから始める（${headlineHint}）

2. 情報源の帰属（最重要）:
${isExternal ? `   この情報は「${sourceOrg || '〇〇'}」が出している情報。
   書き出しは「${sourceOrg || '〇〇'}より、〇〇のお知らせです✨」
   「公益財団法人とかち財団より」「LANDより」とは絶対に書かない。
   LANDはこの情報を紹介しているだけ。` : `   この情報はLAND・とかち財団の情報なのでLANDの活動として書く。`}

3. 情報の正確性（最重要）:
   情報源テキストに書いてある情報だけを使う。
   金額・日付・補助率・対象者は情報源テキストから抜き出す。
   情報源に書いていない情報はAIが勝手に作らない。
   不明な場合は「詳細は○○ウェブサイトをご確認ください」と書く。

4. 本文構成:
   ① ＼見出し／
   ② 書き出し（誰の情報かを明確に）
   ③ 本文（情報源から抽出した具体的な内容）
   ④ ＜概要＞セクション（情報源に記載の情報のみ）
   ⑤ 情報源URL
   ⑥ 締め文（「詳細については、〇〇ウェブサイトをご確認くださいね🙆‍♂️💁‍♀️」）

5. ＜概要＞形式（補助金の場合）:
   ○対象: （情報源テキストから）
   ○補助金額: （情報源テキストから。不明なら省略）
   ○補助率: （情報源テキストから。不明なら省略）
   ○公募期間: （情報源テキストから。不明なら省略）
   ○申込締切: （情報源テキストから。不明なら省略）

6. ＜概要＞形式（イベントの場合）:
   📅 日時: （情報源テキストから）
   📍 場所: （情報源テキストから）
   ✅ 参加費: （情報源テキストから）
   ⏰ 締切: （情報源テキストから）

7. 絵文字: ✨📣👀🙆‍♂️💁‍♀️💪😊📅📍✅🌍⏰💰🔥 などを自然に使う
8. ですます調・親しみやすいが信頼感のある文体
9. Instagramキャプションは600〜1000文字程度

以下のJSON形式のみで返してください:
{
  "instagram_caption": "完全な投稿文（＼見出し／〜書き出し〜本文〜＜概要＞〜URL〜締め文）",
  "facebook_text": "Facebook投稿文（Instagramとほぼ同構成）",
  "x_text": "X投稿文（140字以内・冒頭＼〇〇〇／・URL末尾）",
  "hashtags": "ハッシュタグ（イベント/学生系のみ・補助金は不要）",
  "story_text": "ストーリーズ用（30〜40文字）",
  "image_title": "画像タイトル（20文字以内）",
  "image_subtitle": "画像サブテキスト（30文字以内）",
  "image_points": ["ポイント1（15文字以内）", "ポイント2", "ポイント3"]
}`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.5, // より正確に
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
