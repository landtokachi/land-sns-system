import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { summarizeCandidate } from '@/lib/ai/summarize'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { id, title, source_url, raw_text } = body

    const result = await summarizeCandidate({ title, source_url, raw_text })

    if (id) {
      await supabase
        .from('post_candidates')
        .update({
          ai_summary: result.summary,
          category: result.category || undefined,
          sub_category: result.sub_category || undefined,
          region: result.region || undefined,
          target_audience: result.target_audience || undefined,
          event_date: result.event_date || undefined,
          deadline: result.deadline || undefined,
          organizer: result.organizer || undefined,
          application_url: result.application_url || undefined,
          ai_score: result.ai_score,
          ai_reason: result.ai_reason,
          fact_check_points: result.fact_check_points,
          status: 'candidate',
        })
        .eq('id', id)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Summarize error:', error)
    return NextResponse.json({ error: 'Failed to summarize' }, { status: 500 })
  }
}
