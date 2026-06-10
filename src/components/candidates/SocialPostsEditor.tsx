'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { PLATFORM_LABELS } from '@/lib/constants'
import type { PostCandidate, SocialPost, Platform } from '@/types'

// Meta Business Suite の asset_id（FacebookページID）
const META_ASSET_ID = '1218633431650094'
const META_COMPOSER_URL = `https://business.facebook.com/latest/composer/?asset_id=${META_ASSET_ID}`

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
  const [copied, setCopied] = useState(false)
  const [planCopied, setPlanCopied] = useState(false)

  function getPost(platform: Platform) {
    return posts.find((p) => p.platform === platform)
  }

  async function copyText(text: string, setFlag: (b: boolean) => void) {
    try {
      await navigator.clipboard.writeText(text)
      setFlag(true)
      setTimeout(() => setFlag(false), 3000)
    } catch { /* clipboard不可 */ }
  }

  function updatePost(platform: Platform, field: string, value: string) {
    setPosts((prev) => prev.map((p) => p.platform === platform ? { ...p, [field]: value } : p))
  }

  // Instagram の文章を Facebook にも同期
  function updateMetaText(value: string) {
    setPosts((prev) => prev.map((p) =>
      (p.platform === 'instagram' || p.platform === 'facebook') ? { ...p, post_text: value } : p
    ))
  }

  async function handleGenerate() {
    setGenerating(true)
    await fetch('/api/ai/generate-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: candidate.id, candidate }),
    })
    const supabase = createClient()
    const { data: refreshed } = await supabase
      .from('social_posts')
      .select('*')
      .eq('post_candidate_id', candidate.id)
      .order('platform')
    if (refreshed) setPosts(refreshed)
    setGenerating(false)
  }

  // Meta Business Suite で開く（テキストをクリップボードにコピーしてから開く）
  async function handleOpenMeta() {
    const igPost = getPost('instagram')
    const text = igPost?.post_text || ''
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch { /* clipboard不可の場合はスルー */ }
    window.open(META_COMPOSER_URL, '_blank')
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
    if (!post) { setSaving(null); return }
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

  // Instagram と Facebook を同時に保存
  async function handleSaveMeta() {
    setSaving('instagram')
    const igPost = getPost('instagram')
    const fbPost = getPost('facebook')
    if (igPost) {
      await fetch('/api/social-posts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: igPost.id, post_text: igPost.post_text, hashtags: igPost.hashtags, story_text: igPost.story_text, image_title: igPost.image_title, image_subtitle: igPost.image_subtitle, scheduled_at: igPost.scheduled_at, status: igPost.status }),
      })
    }
    if (fbPost) {
      await fetch('/api/social-posts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: fbPost.id, post_text: fbPost.post_text, hashtags: fbPost.hashtags, story_text: fbPost.story_text, image_title: fbPost.image_title, image_subtitle: fbPost.image_subtitle, scheduled_at: fbPost.scheduled_at, status: fbPost.status }),
      })
    }
    setSaving(null)
    router.refresh()
  }

  const igPost = getPost('instagram')
  const xPost = getPost('x')
  const sourceUrl = candidate.source_url || (candidate as { application_url?: string }).application_url

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{candidate.title}</h2>
          <p className="text-sm text-gray-500 mt-0.5">SNS投稿文の管理・編集</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* 元URL確認ボタン */}
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
            >
              🔍 元の情報を確認
            </a>
          )}
          <Button onClick={handleGenerate} loading={generating}>
            🤖 AI投稿文を生成
          </Button>
        </div>
      </div>

      {/* AI生成情報の注意書き */}
      {igPost && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
          <span className="text-amber-500 text-base mt-0.5">⚠️</span>
          <div>
            <p className="text-xs font-semibold text-amber-800">AIが生成した情報です。必ず元の情報源で内容を確認してください。</p>
            <p className="text-xs text-amber-600 mt-0.5">
              金額・日程・対象条件などの重要情報に誤りがある場合があります。
              {sourceUrl && (
                <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="underline ml-1">元サイトを確認 →</a>
              )}
            </p>
          </div>
        </div>
      )}

      {postError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">⚠️ {postError}</div>
      )}

      {/* ═══ Instagram & Facebook（共通） ═══ */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-800">📸 Instagram & Facebook</h3>
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">共通文章</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Meta Business Suite ボタン */}
            {igPost && igPost.post_text && (
              <button
                onClick={handleOpenMeta}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/></svg>
                {copied ? '✅ テキストをコピーしました！' : 'Meta Business Suiteで投稿'}
              </button>
            )}
            {igPost && igPost.status !== 'published' && (
              <button
                onClick={() => handlePublish('instagram')}
                disabled={publishing === 'instagram'}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {publishSuccess === 'instagram' ? '✅ 投稿済みに変更' : '📤 投稿済みにする'}
              </button>
            )}
            {igPost && igPost.status === 'published' && (
              <span className="px-2 py-1 rounded-full text-xs bg-emerald-100 text-emerald-700">投稿済み</span>
            )}
            {igPost && (
              <Button onClick={handleSaveMeta} loading={saving === 'instagram'} size="sm" variant="secondary">保存</Button>
            )}
          </div>
        </div>

        {igPost ? (
          <div className="space-y-3">
            {/* 投稿文（Instagram/Facebook共通） */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                投稿文
                <span className="ml-2 text-gray-400 font-normal">（Instagram・Facebook 両方に使われます）</span>
              </label>
              <textarea
                value={igPost.post_text || ''}
                onChange={(e) => updateMetaText(e.target.value)}
                rows={8}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
              <p className="text-xs text-right mt-1 text-gray-400">{(igPost.post_text || '').length}文字</p>
            </div>

            {/* Meta Business Suite 使い方説明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-700">
              <p className="font-semibold mb-1">📋 Meta Business Suiteでの投稿方法</p>
              <p>①「Meta Business Suiteで投稿」ボタンを押す → テキストが自動コピーされてMeta Business Suiteが開きます</p>
              <p>②テキストエリアに貼り付け（Cmd+V）→ 画像を追加 → 日時を指定 → 「公開する」</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ハッシュタグ</label>
                <input
                  value={igPost.hashtags || ''}
                  onChange={(e) => { updatePost('instagram', 'hashtags', e.target.value); updatePost('facebook', 'hashtags', e.target.value) }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ストーリーズ用短文</label>
                <input
                  value={igPost.story_text || ''}
                  onChange={(e) => updatePost('instagram', 'story_text', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">画像タイトル</label>
                <input
                  value={igPost.image_title || ''}
                  onChange={(e) => updatePost('instagram', 'image_title', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">画像サブタイトル</label>
                <input
                  value={igPost.image_subtitle || ''}
                  onChange={(e) => updatePost('instagram', 'image_subtitle', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* 🎨 Canvaで画像を作る導線 */}
              <div className="mt-1 rounded-xl p-3" style={{ background: 'linear-gradient(135deg,#eff6ff,#ecfeff)', border: '1px solid #bae6fd' }}>
                <p className="text-sm font-semibold text-gray-800 mb-0.5">🎨 画像をCanvaで作る</p>
                <p className="text-xs text-gray-500 mb-2">下の構成案をコピー → Canvaのブランドテンプレに貼り付けると、ブランドに沿った画像をすぐ作れます。</p>
                <pre className="bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-700 whitespace-pre-wrap font-sans mb-2">{[
                  `【画像タイトル】${igPost.image_title || candidate.title}`,
                  igPost.image_subtitle ? `【サブテキスト】${igPost.image_subtitle}` : '',
                  candidate.deadline ? `【締切】${candidate.deadline}` : '',
                  igPost.hashtags ? `【ハッシュタグ】${igPost.hashtags}` : '',
                ].filter(Boolean).join('\n')}</pre>
                <div className="flex gap-2">
                  <button type="button"
                    onClick={() => copyText([
                      `【画像タイトル】${igPost.image_title || candidate.title}`,
                      igPost.image_subtitle ? `【サブテキスト】${igPost.image_subtitle}` : '',
                      candidate.deadline ? `【締切】${candidate.deadline}` : '',
                      igPost.hashtags ? `【ハッシュタグ】${igPost.hashtags}` : '',
                    ].filter(Boolean).join('\n'), setPlanCopied)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-sky-700 border border-sky-200 hover:bg-sky-50 transition-colors">
                    {planCopied ? '✅ コピーしました' : '📋 構成案をコピー'}
                  </button>
                  <a href="https://www.canva.com/create/instagram-posts/" target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg,#2563eb,#0891b2)' }}>
                    🎨 Canvaを開く
                  </a>
                </div>
              </div>
            </div>

            {/* 投稿予定日（カレンダー連携） */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  投稿予定日時
                  <span className="ml-1 text-indigo-500 font-normal">（設定するとカレンダーに表示）</span>
                </label>
                <input
                  type="datetime-local"
                  value={igPost.scheduled_at ? igPost.scheduled_at.slice(0, 16) : ''}
                  onChange={(e) => {
                    const val = e.target.value ? new Date(e.target.value).toISOString() : ''
                    updatePost('instagram', 'scheduled_at', val)
                    updatePost('facebook', 'scheduled_at', val)
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ステータス</label>
                <select
                  value={igPost.status}
                  onChange={(e) => { updatePost('instagram', 'status', e.target.value); updatePost('facebook', 'status', e.target.value) }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
          </div>
        ) : (
          <p className="text-sm text-gray-400 py-4 text-center">まだ投稿文がありません。「AI投稿文を生成」ボタンで生成してください。</p>
        )}
      </div>

      {/* ═══ X（Twitter）═══ */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold text-gray-800">𝕏 X（Twitter）</h3>
          <div className="flex items-center gap-2">
            {xPost && xPost.status !== 'published' && (
              <>
                <button
                  onClick={() => handleDirectPost('x')}
                  disabled={posting === 'x'}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-black text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {posting === 'x' ? '投稿中...' : postSuccess === 'x' ? '✅ 投稿しました！' : '𝕏 Xに今すぐ投稿'}
                </button>
                <button
                  onClick={() => handlePublish('x')}
                  disabled={publishing === 'x'}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {publishSuccess === 'x' ? '✅ 投稿済みに変更' : '📤 投稿済みにする'}
                </button>
              </>
            )}
            {xPost && xPost.status === 'published' && (
              <span className="px-2 py-1 rounded-full text-xs bg-emerald-100 text-emerald-700">投稿済み</span>
            )}
            {xPost && (
              <Button onClick={() => handleSave('x')} loading={saving === 'x'} size="sm" variant="secondary">保存</Button>
            )}
          </div>
        </div>

        {xPost ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">投稿文</label>
              <textarea
                value={xPost.post_text || ''}
                onChange={(e) => updatePost('x', 'post_text', e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
              <p className="text-xs text-right mt-1" style={{ color: (xPost.post_text || '').length > 280 ? '#dc2626' : '#94a3b8' }}>
                {(xPost.post_text || '').length}/280
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  投稿予定日時<span className="ml-1 text-indigo-500 font-normal">（カレンダー連携）</span>
                </label>
                <input
                  type="datetime-local"
                  value={xPost.scheduled_at ? xPost.scheduled_at.slice(0, 16) : ''}
                  onChange={(e) => updatePost('x', 'scheduled_at', e.target.value ? new Date(e.target.value).toISOString() : '')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ステータス</label>
                <select
                  value={xPost.status}
                  onChange={(e) => updatePost('x', 'status', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
          </div>
        ) : (
          <p className="text-sm text-gray-400 py-4 text-center">まだ投稿文がありません。「AI投稿文を生成」ボタンで生成してください。</p>
        )}
      </div>
    </div>
  )
}
