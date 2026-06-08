import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Replicateの予測ステータスを確認するAPI
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const predictionId = searchParams.get('id')
  if (!predictionId) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const token = process.env.REPLICATE_API_TOKEN
  if (!token) return NextResponse.json({ error: 'No token' }, { status: 500 })

  try {
    const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    })
    const data = await res.json()

    return NextResponse.json({
      status: data.status,        // starting / processing / succeeded / failed
      output: data.output || null, // 完成した画像URL配列
      error: data.error || null,
    })
  } catch (e) {
    return NextResponse.json({ status: 'error', error: String(e) }, { status: 500 })
  }
}
