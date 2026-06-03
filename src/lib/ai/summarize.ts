import OpenAI from 'openai'
import type { AiSummaryResult } from '@/types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function summarizeCandidate(data: {
  title: string
  source_url?: string | null
  raw_text?: string | null
}): Promise<AiSummaryResult> {
  const prompt = `あなたはスタートアップ支援施設「LAND」（公益財団法人とかち財団運営、北海道十勝・帯広）のSNS担当アシスタントです。
以下の情報をもとに、SNS投稿候補として整理してください。
本文・メモが少ない場合でも、タイトルとURLから内容を推測して可能な範囲で回答してください。

タイトル: ${data.title}
URL: ${data.source_url || 'なし'}
本文・メモ:
${data.raw_text || '（未入力）'}

以下のJSON形式で返してください。推測で断定しないこと。不明な情報はnullや空文字にすること。

{
  "summary": "200文字以内の要約",
  "category": "カテゴリ（補助金・助成金・支援制度/イベント・セミナー/LANDの取り組み/とかち財団の取り組み/事業者紹介/採択者・卒業生・支援先のその後/学生起業支援/活動レポート/お知らせ・募集/コラム・ノウハウ から選択）",
  "sub_category": "小カテゴリ（任意）",
  "region": "地域（全国/北海道/十勝/帯広 など）",
  "target_audience": "対象者",
  "event_date": "開催日（YYYY-MM-DD形式、不明ならnull）",
  "deadline": "締切日（YYYY-MM-DD形式、不明ならnull）",
  "organizer": "主催者・運営者",
  "application_url": "申込URL（不明ならnull）",
  "ai_score": 1〜10の投稿おすすめ度（整数）,
  "ai_reason": "投稿おすすめ理由（100文字以内）",
  "fact_check_points": ["補助金額", "締切日", "対象者条件" など確認が必要な項目のリスト]
}`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    })

    const content = response.choices[0].message.content
    if (!content) throw new Error('Empty response')

    const result = JSON.parse(content) as AiSummaryResult
    return result
  } catch (error) {
    console.error('AI summary error:', error)
    return {
      summary: '要約の生成に失敗しました。手動で入力してください。',
      category: '',
      sub_category: '',
      region: '',
      target_audience: '',
      event_date: null,
      deadline: null,
      organizer: '',
      application_url: null,
      ai_score: 5,
      ai_reason: '自動分析に失敗しました',
      fact_check_points: ['全項目を手動で確認してください'],
    }
  }
}
