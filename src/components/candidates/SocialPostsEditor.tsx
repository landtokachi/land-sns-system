'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { PLATFORM_LABELS } from '@/lib/constants'
import type { PostCandidate, SocialPost, Platform } from '@/types'

const PLATFORMS: Platform[] = ['instagram', 'facebook', 'x']

interface Props {
  candidate: PostCandidate
  initialPosts: SocialPost[]
}

export function SocialPostsEditor({ candidate, initialPosts }: Props) {
  const router = useRouter()
  const [posts, setPosts] = useState<SocialPost[]>(initialPosts)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [publishing, setPublishing] = useState<string | null>(null)
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null)
  const [posting, setPosting] = useState<string | null>(null)
  const [postSuccess, setPostSuccess] = useState<string | null>(null)
  const [postError, setPostError] = useState<string | null>(null)

  function getPost(platform: Platform) {
    return posts.find((p) => p.platform === platform)
  }

  function updatePost(platform: Platform, field: string, value: string) {
    setPosts((prev) => prev.map((p) => p.platform === platform ? { ...p, [field]: value } : p))
  }

  async function handleGenerate() {
    setGenerating(true)
    const res = await fetch('/api/ai/generate-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: candidate.id, candidate }),
    })
    const data = await res.json()

    // Refresh posts from server
    const supabase = createClient()
    const { data: refreshed } = await supabase
      .from('social_posts')
      .select('*')
      .eq('post_candidate_id', candidate.id)
      .order('platform')
    if (refreshed) setPosts(refreshed)
    setGenerating(false)
  }

  async function handleDirectPost(platform: Platform) {
    const post = getPost(platform)
    if (!post) return
    setPosting(platform)
    setPostError(null)
    const endpointMap: Partial<Record<Platform, string>> = {
      facebook: '/api/social-posts/post-to-facebook',
      instagram: '/api/social-posts/post-to-instagram',
      x: '/api/social-posts/post-to-x',
    }
    const endpoint = endpointMap[platform]
    if (!endpoint) return
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ social_post_id: post.id }),
      })
      const data = await res.json()
      if (res.ok) {
        setPostSuccess(platform)
        setTimeout(() => setPostSuccess(null), 5000)
        router.refresh()
      } else {
        setPostError(data.error || '投稿に失敗しました')
      }
    } finally {
      setPosting(null)
    }
  }

  async function handlePublish(platform: Platform) {
    const post = getPost(platform)
    if (!post) return
    setPublishing(platform)
    try {
      const res = await fetch('/api/social-posts/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          social_post_id: post.id,
          external_post_url: post.external_post_url || null,
        }),
      })
      if (res.ok) {
        setPublishSuccess(platform)
        setTimeout(() => setPublishSuccess(null), 3000)
        router.refresh()
      }
    } finally {
      setPublishing(null)
    }
  }

  async function handleSave(platform: Platform) {
    setSaving(platform)
    const post = getPost(platform)
    if (!post) {
      setSaving(null)
      return
    }
    await fetch('/api/social-posts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: post.id,
        post_text: post.post_text,
        hashtags: post.hashtags,
        story_text: post.story_text,
        image_title: post.image_title,
        image_subtitle: post.image_subtitle,
        scheduled_at: post.scheduled_at,
        status: post.status,
        external_post_url: post.external_post_url,
      }),
    })
    setSaving(null)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{candidate.title}</h2>
          <p className="text-sm text-gray-500 mt-0.5">SNS投稿文の管理・編集</p>
        </div>
        <Button onClick={handleGenerate} loading={generating}>
          🤖 AI投稿文を生成
        </Button>
      </div>

      {postError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          ⚠️ {postError}
        </div>
      )}

      {PLATFORMS.map((platform) => {
        const post = getPost(platform)
        return (
          <div key={platform} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">{PLATFORM_LABELS[platform]}</h3>
                <div className="flex items-center gap-2">
                {post && post.status !== 'published' && platform === 'facebook' && (
                  <button
                    onClick={() => handleDirectPost(platform)}
                    disabled={posting === platform}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {posting === platform ? '投稿中...' : postSuccess === platform ? '✅ Facebookに投稿しました！' : '🚀 Facebookに今すぐ投稿'}
                  </button>
                )}
                {post && post.status !== 'published' && platform === 'instagram' && (
                  <button
                    onClick={() => handleDirectPost(platform)}
                    disabled={posting === platform}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {posting === platform ? '投稿中...' : postSuccess === platform ? '✅ Instagramに投稿しました！' : '📸 Instagramに今すぐ投稿'}
                  </button>
                )}
                {post && post.status !== 'published' && platform === 'x' && (
                  <button
                    onClick={() => handleDirectPost(platform)}
                    disabled={posting === platform}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-black text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    {posting === platform ? '投稿中...' : postSuccess === platform ? '✅ Xに投稿しました！' : '𝕏 Xに今すぐ投稿'}
                  </button>
                )}
                {post && post.status !== 'published' && (
                  <button
                    onClick={() => handlePublish(platform)}
                    disabled={publishing === platform}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {publishing === platform ? '処理中...' : publishSuccess === platform ? '✅ 投稿済みに変更しました' : '📤 投稿済みにする'}
                  </button>
                )}
                {post && post.status === 'published' && (
                  <span className="px-2 py-1 rounded-full text-xs bg-emerald-100 text-emerald-700">投稿済み</span>
                )}
                {post && (
                  <Button
                    onClick={() => handleSave(platform)}
                    loading={saving === platform}
                    size="sm"
                    variant="secondary"
                  >
                    保存
                  </Button>
                )}
              </div>
            </div>

            {post ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">投稿文</label>
                  <textarea
                    value={post.post_text || ''}
                    onChange={(e) => updatePost(platform, 'post_text', e.target.value)}
                    rows={platform === 'x' ? 3 : 6}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                  {platform === 'x' && (
                    <p className="text-xs text-right mt-1 text-gray-400">
                      {(post.post_text || '').length}/280
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">ハッシュタグ</label>
                    <input
                      value={post.hashtags || ''}
                      onChange={(e) => updatePost(platform, 'hashtags', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">ストーリーズ用短文</label>
                    <input
                      value={post.story_text || ''}
                      onChange={(e) => updatePost(platform, 'story_text', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">画像タイトル</label>
                    <input
                      value={post.image_title || ''}
                      onChange={(e) => updatePost(platform, 'image_title', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">画像サブタイトル</label>
                    <input
                      value={post.image_subtitle || ''}
                      onChange={(e) => updatePost(platform, 'image_subtitle', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">投稿予定日時</label>
                    <input
                      type="datetime-local"
                      value={post.scheduled_at ? post.scheduled_at.slice(0, 16) : ''}
                      onChange={(e) => updatePost(platform, 'scheduled_at', e.target.value ? new Date(e.target.value).toISOString() : '')}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">投稿後URL（手入力）</label>
                    <input
                      type="url"
                      value={post.external_post_url || ''}
                      onChange={(e) => updatePost(platform, 'external_post_url', e.target.value)}
                      placeholder="https://..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">ステータス</label>
                  <select
                    value={post.status}
                    onChange={(e) => updatePost(platform, 'status', e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="draft">下書き</option>
                    <option value="ready">投稿準備完了</option>
                    <option value="scheduled">予約予定</option>
                    <option value="published">投稿済み</option>
                    <option value="skipped">見送り</option>
                    <option value="failed">投稿失敗</option>
                  </select>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 py-4 text-center">
                まだ投稿文がありません。上の「AI投稿文を生成」ボタンで生成してください。
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
