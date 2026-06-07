import type { Priority, Importance, CandidateStatus, ReviewStatus, PostStatus, Platform } from '@/types'

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

export const PRIORITY_COLORS: Record<Priority, string> = {
  high:   'text-red-600 bg-red-50 font-medium',
  medium: 'text-amber-600 bg-amber-50 font-medium',
  low:    'text-zinc-500 bg-zinc-100',
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
  unconfirmed:    'text-zinc-500 bg-zinc-100',
  candidate:      'text-indigo-600 bg-indigo-50',
  drafting:       'text-violet-600 bg-violet-50',
  draft_created:  'text-purple-600 bg-purple-50',
  image_created:  'text-sky-600 bg-sky-50',
  review_waiting: 'text-amber-600 bg-amber-50',
  ready:          'text-green-600 bg-green-50',
  scheduled:      'text-blue-600 bg-blue-50',
  published:      'text-emerald-600 bg-emerald-50',
  skipped:        'text-zinc-400 bg-zinc-100',
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
  draft: 'bg-slate-100 text-slate-500',
  ready: 'bg-green-50 text-green-600',
  scheduled: 'bg-blue-50 text-blue-600',
  published: 'bg-emerald-50 text-emerald-600',
  skipped: 'bg-slate-100 text-slate-400',
  failed: 'bg-red-50 text-red-600',
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  x: 'X (Twitter)',
}

export const PLATFORM_COLORS: Record<Platform, string> = {
  instagram: 'bg-pink-50 text-pink-600',
  facebook: 'bg-blue-50 text-blue-600',
  x: 'bg-slate-100 text-slate-600',
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
