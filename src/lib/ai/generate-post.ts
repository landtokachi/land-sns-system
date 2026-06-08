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

  const isLandOwn  = info.category.includes('LAND') || info.category.includes('とかち財団') || info.category.includes('活動')
  const isSubsidy  = info.category.includes('補助金') || info.category.includes('助成')
  const isEvent    = info.category.includes('イベント') || info.category.includes('セミナー')
  const isLandscape = info.category.includes('事業者紹介') || info.category.includes('採択者')

  // URLから情報元機関を自動判定
  let sourceOrg = info.organizer || info.sourceName || ''
  if (!sourceOrg && info.sourceUrl) {
    try {
      const domain = new URL(info.sourceUrl).hostname.replace('www.', '')
      if (domain.includes('chusho.meti.go.jp') || domain.includes('jizokukahojokin') || domain.includes('monodukuri-hojo') || domain.includes('it-hojo') || domain.includes('mirasapo') || domain.includes('jigyou-saikouchiku')) sourceOrg = '中小企業庁'
      else if (domain.includes('smrj.go.jp') || domain.includes('j-net21')) sourceOrg = '中小企業基盤整備機構（J-Net21）'
      else if (domain.includes('pref.hokkaido')) sourceOrg = '北海道庁'
      else if (domain.includes('hkd.meti.go.jp')) sourceOrg = '北海道経済産業局'
      else if (domain.includes('hsc.or.jp')) sourceOrg = '北海道中小企業総合支援センター'
      else if (domain.includes('city.obihiro')) sourceOrg = '帯広市'
      else if (domain.includes('obihiro.or.jp')) sourceOrg = '帯広商工会議所'
      else if (domain.includes('toshinkn.or.jp')) sourceOrg = '十勝産業振興センター'
      else if (domain.includes('maff.go.jp')) sourceOrg = '農林水産省'
      else if (domain.includes('jfc.go.jp')) sourceOrg = '日本政策金融公庫'
      else if (domain.includes('tokachi-foundation') || domain.includes('tokachi-zaidan')) sourceOrg = 'とかち財団'
    } catch { /* ignore */ }
  }

  const urlForPost = info.applyUrl || info.sourceUrl || ''

  // =====================================================
  // LANDの実際の投稿スタイル参考例
  // =====================================================
  const EXAMPLE_SUBSIDY = `
【補助金投稿の参考例（このスタイルで書く）】
＼「小規模事業者持続化補助金」のご案内です📣／
経営計画に基づいて販路開拓を行う費用を支援してくれる「小規模事業者持続化補助金」の最新公募がスタートしています！✨💰

＜概要＞
💰 【補助上限額・補助率】
用途や条件に合わせて、複数の枠が用意されています！

通常枠：上限 50万円（補助率 2/3）
創業枠など（特別枠）：上限 200万円（補助率 2/3 または 3/4）
※さらに、インボイス特例の要件を満たすことで上限額が上乗せされる場合もあります！

📅 【募集期間・スケジュール】
・申請受付開始：11月5日（木）
・申請締切：12月15日（火）17:00 必着
🚨ここがポイント：
申請に必須となる商工会・商工会議所での「事業支援計画書」の発行受付は【12月4日（金）】で締め切られます。書類の即日発行はできないため、11月中には地域の窓口へご相談されることを強くおすすめします！

🏢 【こんな経費に活用できます💡】
・Webサイトやオンラインショップの構築、リニューアル
・チラシ、カタログ、パンフレットの作成・配布
・Web広告やSNS広告の出稿
・店舗の改装、看板の設置
・新商品開発のためのパッケージデザイン費用 …など

「自分の事業は対象になる？」など、詳しい公募要領は公式のまとめサイトで公開されています。
管轄の商工会・商工会議所のサポートを受けながら進められるので、初めて補助金を申請する方も安心ですよ😊

事業を次のステップへ進める大きなチャンスです。
ぜひ一度、こちらのリンクから詳細をご確認ください👇

🔗 ${urlForPost}

#landtokachi #小規模事業者持続化補助金
`

  const EXAMPLE_EVENT = `
【イベント投稿の参考例（このスタイルで書く）】
＼○月○日（曜日）開催！「○○セミナー」参加者募集中📣／
○○についてのセミナーを開催します！✨

📅 【開催日時】
○月○日（曜日）○○:○○〜○○:○○

📍 【会場】
LAND（帯広市大通南8丁目6番地）
※オンライン参加も可能です

✅ 【参加費】
無料（事前申込制）

👥 【対象者】
○○を検討している方、○○に興味のある方

📝 【内容】
・○○について
・○○の実例紹介
・質疑応答

⏰ 【申込締切】
○月○日（曜日）まで

お申込みは👇のリンクから

🔗 ${urlForPost}

#landtokachi #帯広 #起業 #セミナー
`

  // プロンプト構築
  const styleExample = isSubsidy ? EXAMPLE_SUBSIDY : isEvent ? EXAMPLE_EVENT : ''

  const extractionGuide = isSubsidy ? `
【補助金・支援制度 ― 情報源テキストから以下を全て抽出して投稿文に盛り込むこと】

1. 補助金の目的・どんな取り組みを支援するか（1〜2文で分かりやすく）
2. 補助枠の種類と金額（複数ある場合は全て列挙。例: 通常枠: ○○万円、特別枠: ○○万円）
3. 補助率（例: 2/3、3/4）
4. 申請スケジュール（受付開始日・締切日・時刻まで）
5. 重要な注意点・ポイント（例: 商工会の書類締切が別にある など）
6. 対象経費・使い道の具体例（リスト形式で5〜8個）
7. 対象者（どんな事業者が申請できるか）
8. 申請方法・窓口（商工会経由 など）

⚠️ 情報源テキストに書いてない情報は絶対に作らない。不明な場合は省略。` : isEvent ? `
【イベント・セミナー ― 情報源テキストから以下を全て抽出して投稿文に盛り込むこと】

1. イベントの目的・内容（具体的に）
2. 開催日時（日付・曜日・時刻）
3. 会場（場所名・住所 または オンライン）
4. 参加費（無料/有料・金額）
5. 定員
6. 対象者（誰向けか）
7. 内容・プログラム（箇条書きで）
8. 登壇者・スピーカー（いれば）
9. 申込方法・締切

⚠️ 情報源テキストに書いてない情報は絶対に作らない。` : isLandscape ? `
【事業者紹介（LANDSCAPE）― 情報源テキストから以下を抽出】
1. 取材対象者名・企業名
2. 事業内容・取り組みの具体的な説明
3. 特徴・強み・ユニークな点
4. 「十勝の事業創発につながる企業の取り組みを、LANDスタッフが取材し紹介する「LANDSCAPE」🙋‍♀️🙋🙋‍♂️」の一文を含める` : `
【その他コンテンツ ― 情報源テキストから以下を抽出して詳しく書く】
1. 内容の具体的な説明
2. 対象者
3. 重要な日程・金額・条件（あれば）
4. 実用的なポイント・注意点`

  const prompt = `あなたはスタートアップ支援施設「LAND」（公益財団法人とかち財団運営、北海道帯広）のSNS担当です。

${styleExample ? `以下の参考例を見て、同じスタイル・詳しさ・構成で書いてください：\n${styleExample}\n━━━━━━━━━━━━━━━━━━━━━━\n` : ''}

【今回の投稿情報】
タイトル: ${info.title}
カテゴリ: ${info.category || '（未設定）'}
情報発信元・主催機関: ${sourceOrg || '（情報源テキストから確認すること）'}
${info.audience ? `対象者: ${info.audience}` : ''}
${info.eventDate ? `開催日: ${info.eventDate}` : ''}
${info.deadline ? `申込締切: ${info.deadline}` : ''}
${urlForPost ? `情報源URL: ${urlForPost}` : ''}
${info.region ? `対象地域: ${info.region}` : ''}

【★最重要: 情報源の詳細テキスト（このテキストから正確な情報を抽出すること）】
${info.rawText ? info.rawText.slice(0, 4500) : info.summary || '（情報源テキストなし）'}

━━━━━━━━━━━━━━━━━━━━━━
${extractionGuide}

━━━━━━━━━━━━━━━━━━━━━━
【絶対に守るルール】

1. 冒頭は「＼〇〇〇／」形式の見出しから始める

2. ${isLandOwn ? 'この情報はLAND・とかち財団の情報なのでLANDの活動として書く。' : `情報の帰属: この情報は「${sourceOrg || '〇〇'}」が出している情報。「公益財団法人とかち財団より」「LANDより」とは書かない。LANDはこの情報を紹介しているだけ。`}

3. 情報の正確性: 情報源テキストにある情報だけを使う。AIが勝手に情報を作らない。

4. 詳しく書く: 上記「抽出すること」の項目を全て投稿文に含める。参考例と同じレベルの詳しさで書く。

5. 絵文字を使ってセクションを見やすく分ける（💰📅🏢🚨✅📝👥 など）

6. 投稿末尾にURLを記載（🔗 マークで）

7. 締め文は「ぜひ一度、こちらのリンクから詳細をご確認ください👇」などの形式

8. Instagramキャプションは800〜1200文字程度（詳しく・情報量を豊富に）

9. ハッシュタグ: 補助金は `#landtokachi #補助金名` 程度。イベントは `#landtokachi #帯広 #起業` など

以下のJSON形式のみで返してください:
{
  "instagram_caption": "完全な投稿文（参考例のスタイルで・詳しく・情報豊富に）",
  "facebook_text": "Facebook投稿文（Instagramとほぼ同構成）",
  "x_text": "X投稿文（140字以内・冒頭＼〇〇〇／・URL末尾）",
  "hashtags": "ハッシュタグ（スペース区切り）",
  "story_text": "ストーリーズ用（30〜40文字・金額や日程入り）",
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
      hashtags: '#landtokachi #LAND #十勝',
      story_text: '詳細はプロフィールリンクから',
      image_title: candidate.title?.slice(0, 20) || 'タイトル',
      image_subtitle: '',
      image_points: [],
    }
  }
}
