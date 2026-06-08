import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'

// PKCE: code_verifier と code_challenge を生成
function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url')
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

export async function GET() {
  const clientId = process.env.CANVA_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'CANVA_CLIENT_ID not set' }, { status: 500 })
  }

  const { verifier, challenge } = generatePKCE()
  const state = crypto.randomBytes(16).toString('hex')

  // code_verifier と state をCookieに保存（10分間有効）
  const cookieStore = await cookies()
  cookieStore.set('canva_code_verifier', verifier, {
    httpOnly: true,
    secure: true,
    maxAge: 600,
    path: '/',
  })
  cookieStore.set('canva_state', state, {
    httpOnly: true,
    secure: true,
    maxAge: 600,
    path: '/',
  })

  const scopes = [
    'asset:read',
    'asset:write',
    'design:content:read',
    'design:content:write',
    'design:meta:read',
    'profile:read',
  ].join(' ')

  const params = new URLSearchParams({
    code_challenge_method: 's256',
    response_type: 'code',
    client_id: clientId,
    scope: scopes,
    code_challenge: challenge,
    state,
    redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://land-sns-system.vercel.app'}/api/auth/canva/callback`,
  })

  const authUrl = `https://www.canva.com/api/oauth/authorize?${params.toString()}`
  return NextResponse.redirect(authUrl)
}
