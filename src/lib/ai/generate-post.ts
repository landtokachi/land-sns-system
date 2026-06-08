import OpenAI from 'openai'
import type { AiPostResult, PostCandidate } from '@/types'

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
    sourceName: (candidate as { source_name?: string }).source_name || '',
  }

  const isLandOwn   = info.category.includes('LAND') || info.category.includes('とかち財団') || info.category.includes('活動')
  const isSubsidy   = info.category.includes('補助金') || info.category.includes('助成')
  const isEvent     = info.category.includes('イベント') || info.category.includes('セミナー')
  const isLandscape = info.category.includes('事業者紹介') || info.category.includes('採択者')

  // 情報源テキストが十分にあるか確認
  const sourceText = info.rawText || info.summary || ''
  const hasRichSource = sourceText.length > 300

  // URLから情報元機関を自動判定
  let sourceOrg = info.organizer || info.sourceName || ''
  if (!sourceOrg && info.sourceUrl) {
    try {
      const domain = new URL(info.sourceUrl).hostname.replace('www.', '')
      if (domain.includes('chusho.meti.go.jp') || domain.includes('mirasapo') || domain.includes('jigyou-saikouchiku')) sourceOrg = '中小企業庁'
      else if (domain.includes('smrj.go.jp') || domain.includes('j-net21')) sourceOrg = '中小企業基盤整備機構'
      else if (domain.includes('pref.hokkaido')) sourceOrg = '北海道庁'
      else if (domain.includes('hkd.meti.go.jp')) sourceOrg = '北海道経済産業局'
      else if (domain.includes('hsc.or.jp')) sourceOrg = '北海道中小企業総合支援センター'
      else if (domain.includes('city.obihiro')) sourceOrg = '帯広市'
      else if (domain.includes('obihiro.or.jp')) sourceOrg = '帯広商工会議所'
      else if (domain.includes('toshinkn.or.jp')) sourceOrg = '十勝産業振興センター'
      else if (domain.includes('maff.go.jp')) sourceOrg = '農林水産省'
      else if (domain.includes('jfc.go.jp')) sourceOrg = '日本政策金融公庫'
      else if (domain.includes('tokachi-zaidan') || domain.includes('tokachi-foundation')) sourceOrg = 'とかち財団'
    } catch { /* ignore */ }
  }

  const urlForPost = info.applyUrl || info.sourceUrl || ''

  const EXAMPLE_SUBSIDY = `
【補助金投稿の参考例（このスタイルで書く）】
＼「小規模事業者持続化補助金」のご案内です📣／
経営計画に基づいて販路開拓を行う費用を支援する「小規模事業者持続化補助金」の最新公募がスタートしています！✨💰

＜概要＞
💰 【補助上限額・補助率】
通常枠：上限 50万円（補助率 2/3）
特別枠（賃金引上げ枠、インボイス枠など）：上限 200万円

📅 【募集スケジュール】
・申請受付開始：11月5日（木）
・申請締切：12月15日（火）17:00 必着
🚨ここがポイント：
商工会・商工会議所での「事業支援計画書」の発行受付は【12月4日（金）】で締め切られます。
書類の即日発行はできないため、11月中には地域の窓口へご相談を！

🏢 【こんな経費に活用できます💡】
・Webサイトやオンラインショップの構築
・チラシ・パンフレットの作成・配布
・Web広告・SNS広告の出稿
・店舗改装・看板設置
・新商品開発のパッケージデザイン費 …など

ぜひ一度、こちらのリンクから詳細をご確認ください👇
🔗 ${urlForPost}

#landtokachi #小規模事業者持続化補助金
`

  const EXAMPLE_EVENT = `
【イベント投稿の参考例（このスタイルで書く）】
＼○月○日（曜日）開催！「○○セミナー」参加者募集中📣／

📅 【開催日時】
○月○日（曜日）○○:○○〜○○:○○

📍 【会場】
LAND（帯広市大通南8丁目6番地）

✅ 【参加費】
無料（事前申込制）

👥 【対象者】
○○を検討している方

📝 【内容】
・○○について
・質疑応答

お申込みは👇のリンクから
🔗 ${urlForPost}

#landtokachi #帯広 #起業
`

  const styleExample = isSubsidy ? EXAMPLE_SUBSIDY : isEvent ? EXAMPLE_EVENT : ''

  const prompt = `あなたはスタートアップ支援施設「LAND」（公益財団法人とかち財団運営、北海道帯広）のSNS担当です。

━━━━━━━━━━━━━━━━━━━━━━
【情報の正確性ルール（最重要）】

◆ 情報源テキストにある情報 → そのまま正確に使う
◆ 情報源テキストにない「具体的な数値・条件」→ 書かない
◆ 補助金・制度の目的・背景・おすすめ理由 → 一般的な知識から豊かに書いてよい

❌ 情報源テキストにない場合は絶対に書かない（推測・補完禁止）：
- 補助金額・上限額の具体的な数字（例: 「100万円」）
- 補助率の具体的な数字（例: 「2/3」「3/4」）
- 枠の種類（例: 「通常枠」「特別枠」）←情報源にない場合
- 申請締切日の具体的な日付（例: 「5月15日」）←情報源にない場合
- 「事業計画書が必須」などの申請要件の詳細←情報源にない場合

✅ 情報源テキストがなくても書いてよい：
- 補助金・制度の目的・どんな人に役立つか
- 利用できる経費の一般的な例（「補助金でよく使われる経費として〜などが挙げられます」の形で）
- なぜ申請すべきか、どんなメリットがあるか
- 「詳細な金額・条件・申請方法は公式サイトをご確認ください」（末尾に1回）

目標：情報源テキストが少ない場合でも、読者が「これは自分に関係ある！詳しく見てみよう」と思えるような豊かな投稿文を書く。
━━━━━━━━━━━━━━━━━━━━━━

${styleExample ? `【参考スタイル（このスタイルで書くこと）】\n${styleExample}\n━━━━━━━━━━━━━━━━━━━━━━\n` : ''}

【今回の投稿情報】
タイトル: ${info.title}
カテゴリ: ${info.category || '（未設定）'}
主催・情報元: ${sourceOrg || '（情報源テキストから確認）'}
${info.audience ? `対象者: ${info.audience}` : ''}
${info.eventDate ? `開催日: ${info.eventDate}` : ''}
${info.deadline ? `申込締切: ${info.deadline}` : ''}
${urlForPost ? `URL: ${urlForPost}` : ''}
${info.region ? `地域: ${info.region}` : ''}

【情報源テキスト（★これ以外の情報は使用禁止）】
${sourceText ? sourceText.slice(0, 4500) : '（情報源テキストなし）'}

${!hasRichSource ? `
⚠️ 情報源テキストが少ないため、具体的な数字・条件が不明です。
・補助金額・補助率・締切日など具体的な数値は書かない
・代わりに、補助金の目的・活用シーン・対象者への呼びかけを豊かに書く
・最後に「補助金額・申請条件など詳細は公式サイトでご確認ください」を1回記載
・短くなってもよいが、読者が興味を持てる文章にすること
` : ''}

━━━━━━━━━━━━━━━━━━━━━━
【投稿文の作成ルール】

1. 冒頭は「＼〇〇〇／」形式で始める

2. 情報の帰属:
${isLandOwn
  ? 'この情報はLAND・とかち財団の情報なのでLANDの活動として書く。'
  : `「${sourceOrg || '〇〇'}」が発信している情報をLANDが紹介する形で書く。「LANDより」「とかち財団より」と書かない。`}

3. 【★最重要】情報源テキストに書いてある情報だけを使う
   - 金額・補助率・日程・要件は情報源テキストに書いてある場合のみ記載
   - 書いていない情報は「詳細は公式サイトをご確認ください」で代替

4. 絵文字でセクションを分ける（💰📅🏢✅📝👥 など）

5. 末尾に「ぜひ一度、こちらのリンクから詳細をご確認ください👇」
   🔗 ${urlForPost || '（URL未設定）'}

6. ハッシュタグ: #landtokachi + 補助金名やイベント名

${isSubsidy ? `
【補助金の場合 ― 情報源テキストにある情報のみ記載】
✓ 書いてよい: 補助金の目的・概要、情報源に書いてある金額・枠・締切日、対象者
✗ 書いてはいけない: 情報源に書いていない金額・補助率・必要書類・申請条件
` : ''}
${isEvent ? `
【イベントの場合 ― 情報源テキストにある情報のみ記載】
✓ 書いてよい: 開催日時・会場・参加費・内容・申込方法（すべて情報源テキストに記載のもの）
✗ 書いてはいけない: 情報源に書いていない定員数・登壇者・内容詳細
` : ''}

以下のJSON形式のみで返してください（説明文・コメント不要）:
{
  "instagram_caption": "完全な投稿文（情報源テキストの事実のみ使用）",
  "facebook_text": "Facebook投稿文（Instagramとほぼ同じ）",
  "x_text": "X投稿文（140字以内・冒頭＼〇〇〇／・URL末尾）",
  "hashtags": "ハッシュタグ（スペース区切り）",
  "story_text": "ストーリーズ用（30〜40文字）",
  "image_title": "画像タイトル（20文字以内）",
  "image_subtitle": "画像サブテキスト（30文字以内・情報源テキストにある情報のみ）",
  "image_points": ["ポイント1（15文字以内）", "ポイント2", "ポイント3"]
}`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.1, // 低温度設定：事実に基づく正確な出力を優先
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
      hashtags: '#landtokachi #LAND #十勝',
      story_text: '詳細はプロフィールリンクから',
      image_title: candidate.title?.slice(0, 20) || 'タイトル',
      image_subtitle: '',
      image_points: [],
    }
  }
}
