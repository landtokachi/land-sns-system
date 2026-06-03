export type Priority = 'high' | 'medium' | 'low'
export type Importance = 'important' | 'normal' | 'reference'
export type CandidateStatus =
  | 'unconfirmed'
  | 'candidate'
  | 'drafting'
  | 'draft_created'
  | 'image_created'
  | 'review_waiting'
  | 'ready'
  | 'scheduled'
  | 'published'
  | 'skipped'

export type ReviewStatus =
  | 'not_required'
  | 'not_started'
  | 'requesting'
  | 'revision_requested'
  | 'confirmed'
  | 'rejected'
  | 'skipped'

export type Platform = 'instagram' | 'facebook' | 'x'
export type PostStatus = 'draft' | 'ready' | 'scheduled' | 'published' | 'skipped' | 'failed'

export interface Profile {
  id: string
  auth_user_id: string
  name: string | null
  email: string | null
  role: string
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  parent_id: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface PostCandidate {
  id: string
  title: string
  source_url: string | null
  source_name: string | null
  raw_text: string | null
  category: string | null
  sub_category: string | null
  region: string | null
  target_audience: string | null
  event_date: string | null
  deadline: string | null
  organizer: string | null
  application_url: string | null
  priority: Priority
  importance: Importance
  status: CandidateStatus
  review_status: ReviewStatus
  scheduled_at: string | null
  platforms: Platform[]
  ai_summary: string | null
  ai_score: number | null
  ai_reason: string | null
  fact_check_points: string[]
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface SocialPost {
  id: string
  post_candidate_id: string
  platform: Platform
  post_text: string | null
  hashtags: string | null
  story_text: string | null
  image_title: string | null
  image_subtitle: string | null
  image_url: string | null
  scheduled_at: string | null
  published_at: string | null
  status: PostStatus
  external_post_id: string | null
  external_post_url: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface GeneratedImage {
  id: string
  post_candidate_id: string
  template_type: string
  image_size: string
  image_url: string | null
  image_text_json: Record<string, string>
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  post_candidate_id: string
  user_id: string | null
  comment: string
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface AiSummaryResult {
  summary: string
  category: string
  sub_category: string
  region: string
  target_audience: string
  event_date: string | null
  deadline: string | null
  organizer: string
  application_url: string | null
  ai_score: number
  ai_reason: string
  fact_check_points: string[]
}

export interface AiPostResult {
  instagram_caption: string
  facebook_text: string
  x_text: string
  hashtags: string
  story_text: string
  image_title: string
  image_subtitle: string
  image_points: string[]
}

export interface DashboardStats {
  total_candidates: number
  high_priority: number
  draft_created: number
  scheduled: number
  published: number
}
