import type { Priority, Importance, CandidateStatus, ReviewStatus, PostStatus, Platform } from '@/types'

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

export const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-gray-100 text-gray-600',
}

export const IMPORTANCE_LABELS: Record<Importance, string> = {
  important: '重要',
  normal: '通常',
  reference: '参考',
}

export const CANDIDATE_STATUS_LABELS: Record<CandidateStatus, string> = {
  unconfirmed: '未確認',
  candidate: '投稿候補',
  drafting: '下書き作成中',
  draft_created: '下書き作成済み',
  image_created: '画像生成済み',
  review_waiting: '掲載確認待ち',
  ready: '投稿準備完了',
  scheduled: '投稿予定',
  published: '投稿済み',
  skipped: '見送り',
}

export const CANDIDATE_STATUS_COLORS: Record<CandidateStatus, string> = {
  unconfirmed: 'bg-gray-100 text-gray-600',
  candidate: 'bg-blue-100 text-blue-800',
  drafting: 'bg-purple-100 text-purple-800',
  draft_created: 'bg-indigo-100 text-indigo-800',
  image_created: 'bg-cyan-100 text-cyan-800',
  review_waiting: 'bg-orange-100 text-orange-800',
  ready: 'bg-green-100 text-green-800',
  scheduled: 'bg-teal-100 text-teal-800',
  published: 'bg-emerald-100 text-emerald-800',
  skipped: 'bg-gray-100 text-gray-400',
}

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  not_required: '確認不要',
  not_started: '確認前',
  requesting: '確認依頼中',
  revision_requested: '修正依頼あり',
  confirmed: '確認済み',
  rejected: '掲載不可',
  skipped: '見送り',
}

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  draft: '下書き',
  ready: '投稿準備完了',
  scheduled: '予約予定',
  published: '投稿済み',
  skipped: '見送り',
  failed: '投稿失敗',
}

export const POST_STATUS_COLORS: Record<PostStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  ready: 'bg-green-100 text-green-800',
  scheduled: 'bg-blue-100 text-blue-800',
  published: 'bg-emerald-100 text-emerald-800',
  skipped: 'bg-gray-100 text-gray-400',
  failed: 'bg-red-100 text-red-800',
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  x: 'X (Twitter)',
}

export const PLATFORM_COLORS: Record<Platform, string> = {
  instagram: 'bg-pink-100 text-pink-800',
  facebook: 'bg-blue-100 text-blue-800',
  x: 'bg-gray-100 text-gray-800',
}

export const TEMPLATE_TYPES = [
  { value: 'subsidy', label: '補助金・助成金' },
  { value: 'event', label: 'イベント・セミナー' },
  { value: 'land', label: 'LANDの取り組み' },
  { value: 'business', label: '事業者紹介' },
  { value: 'notice', label: 'お知らせ' },
]

export const CATEGORIES = [
  '補助金・助成金・支援制度',
  'イベント・セミナー',
  'LANDの取り組み',
  'とかち財団の取り組み',
  '事業者紹介',
  '採択者・卒業生・支援先のその後',
  '学生起業支援',
  '活動レポート',
  'お知らせ・募集',
  'コラム・ノウハウ',
]
