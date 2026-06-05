import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// OAuth 1.0a署名生成
function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&')
  const baseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`
  return crypto.createHmac('sha1', signingKey).update(baseString).digest('base64')
}

function buildOAuthHeader(
  method: string,
  url: string,
  apiKey: string,
  apiSecret: string,
  accessToken: string,
  accessTokenSecret: string
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: '1.0',
  }
  oauthParams.oauth_signature = generateOAuthSignature(
    method, url, oauthParams, apiSecret, accessTokenSecret
  )
  const headerStr = Object.keys(oauthParams)
    .map((key) => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ')
  return `OAuth ${headerStr}`
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { social_post_id } = await request.json()

  const { data: post } = await supabase
    .from('social_posts')
    .select('*')
    .eq('id', social_post_id)
    .single()

  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

  const apiKey = process.env.X_API_KEY
  const apiSecret = process.env.X_API_SECRET
  const accessToken = process.env.X_ACCESS_TOKEN
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET

  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    return NextResponse.json({ error: 'X (Twitter) credentials not configured' }, { status: 500 })
  }

  // 投稿文（280文字以内に収める）
  const text = [post.post_text, post.hashtags]
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 280)

  const tweetUrl = 'https://api.twitter.com/2/tweets'
  const oauthHeader = buildOAuthHeader('POST', tweetUrl, apiKey, apiSecret, accessToken, accessTokenSecret)

  try {
    const res = await fetch(tweetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: oauthHeader,
      },
      body: JSON.stringify({ text }),
    })

    const data = await res.json()

    if (!res.ok || data.errors) {
      console.error('X API error:', data)
      return NextResponse.json({ error: data.errors?.[0]?.message || data.detail || 'X post failed' }, { status: 500 })
    }

    const tweetId = data.data?.id
    const postUrl = `https://twitter.com/i/web/status/${tweetId}`

    await supabase.from('social_posts').update({
      status: 'published',
      published_at: new Date().toISOString(),
      external_post_url: postUrl,
    }).eq('id', social_post_id)

    await supabase.from('post_candidates').update({ status: 'published' }).eq('id', post.post_candidate_id)

    return NextResponse.json({ success: true, tweet_id: tweetId, url: postUrl })
  } catch (error) {
    console.error('X post error:', error)
    return NextResponse.json({ error: 'Failed to post to X' }, { status: 500 })
  }
}
