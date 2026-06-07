import type { Priority, Importance, CandidateStatus, ReviewStatus, PostStatus, Platform } from '@/types'

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

export const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'bg-red-500/20 text-red-400 border border-red-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  low: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
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
  unconfirmed: 'bg-slate-500/20 text-slate-400',
  candidate: 'bg-blue-500/20 text-blue-400',
  drafting: 'bg-purple-500/20 text-purple-400',
  draft_created: 'bg-indigo-500/20 text-indigo-400',
  image_created: 'bg-cyan-500/20 text-cyan-400',
  review_waiting: 'bg-orange-500/20 text-orange-400',
  ready: 'bg-green-500/20 text-green-400',
  scheduled: 'bg-teal-500/20 text-teal-400',
  published: 'bg-emerald-500/20 text-emerald-400',
  skipped: 'bg-slate-600/20 text-slate-500',
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
  draft: 'bg-slate-500/20 text-slate-400',
  ready: 'bg-green-500/20 text-green-400',
  scheduled: 'bg-blue-500/20 text-blue-400',
  published: 'bg-emerald-500/20 text-emerald-400',
  skipped: 'bg-slate-600/20 text-slate-500',
  failed: 'bg-red-500/20 text-red-400',
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  x: 'X (Twitter)',
}

export const PLATFORM_COLORS: Record<Platform, string> = {
  instagram: 'bg-pink-500/20 text-pink-400',
  facebook: 'bg-blue-500/20 text-blue-400',
  x: 'bg-slate-500/20 text-slate-400',
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
