'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { Comment } from '@/types'

export function CommentSection({ candidateId }: { candidateId: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadComments()
  }, [candidateId])

  async function loadComments() {
    const supabase = createClient()
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(name, email)')
      .eq('post_candidate_id', candidateId)
      .order('created_at', { ascending: false })
    if (data) setComments(data)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user!.id)
      .single()

    await supabase.from('comments').insert({
      post_candidate_id: candidateId,
      user_id: profile?.id,
      comment: text.trim(),
    })
    setText('')
    await loadComments()
    setLoading(false)
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('comments').delete().eq('id', id)
    setComments((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="コメントを入力..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
        <Button type="submit" loading={loading} size="sm">送信</Button>
      </form>

      <div className="space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-600">
                {comment.profiles?.name || comment.profiles?.email || '不明'}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {format(new Date(comment.created_at), 'MM/dd HH:mm', { locale: ja })}
                </span>
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  削除
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.comment}</p>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">コメントはまだありません</p>
        )}
      </div>
    </div>
  )
}
