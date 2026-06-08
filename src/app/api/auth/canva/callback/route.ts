import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.json({ error: `Canva auth error: ${error}` }, { status: 400 })
  }

  if (!code) {
    return NextResponse.json({ error: 'No code received' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const verifier = cookieStore.get('canva_code_verifier')?.value
  const savedState = cookieStore.get('canva_state')?.value

  if (!verifier) {
    return NextResponse.json({ error: 'No code verifier found. Please try again.' }, { status: 400 })
  }

  if (state !== savedState) {
    return NextResponse.json({ error: 'State mismatch. Please try again.' }, { status: 400 })
  }

  const clientId = process.env.CANVA_CLIENT_ID
  const clientSecret = process.env.CANVA_CLIENT_SECRET
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://land-sns-system.vercel.app'

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Canva credentials not configured' }, { status: 500 })
  }

  // トークンエンドポイントにリクエスト
  const tokenRes = await fetch('https://api.canva.com/rest/v1/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: verifier,
      redirect_uri: `${siteUrl}/api/auth/canva/callback`,
    }).toString(),
  })

  if (!tokenRes.ok) {
    const errText = await tokenRes.text()
    return NextResponse.json({ error: `Token exchange failed: ${errText}` }, { status: 500 })
  }

  const tokenData = await tokenRes.json()

  // Cookieを削除
  cookieStore.delete('canva_code_verifier')
  cookieStore.delete('canva_state')

  // トークンを表示（管理者がVercelに設定するため）
  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>Canva認証完了</title>
  <style>
    body { font-family: sans-serif; max-width: 700px; margin: 40px auto; padding: 20px; background: #f8fafc; }
    .card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; }
    h1 { color: #16a34a; }
    .token-box { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 12px; word-break: break-all; margin: 8px 0; }
    .label { font-weight: bold; color: #475569; font-size: 14px; margin-top: 16px; }
    .warning { background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; color: #92400e; font-size: 14px; margin: 16px 0; }
    .step { background: #eef2ff; border-left: 3px solid #6366f1; padding: 12px; margin: 8px 0; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>✅ Canva認証完了！</h1>
    <div class="warning">
      ⚠️ 以下のトークンをVercelの環境変数に追加してください。このページを閉じると確認できなくなります。
    </div>

    <div class="label">CANVA_ACCESS_TOKEN（有効期限: 4時間）</div>
    <div class="token-box">${tokenData.access_token}</div>

    <div class="label">CANVA_REFRESH_TOKEN（長期有効）</div>
    <div class="token-box">${tokenData.refresh_token || '（なし）'}</div>

    <div class="label">Token Type</div>
    <div class="token-box">${tokenData.token_type || 'Bearer'}</div>

    <hr style="margin: 24px 0; border-color: #e2e8f0;">

    <h3>次のステップ</h3>
    <div class="step">1. Vercelダッシュボード → Environment Variables を開く</div>
    <div class="step">2. CANVA_ACCESS_TOKEN を追加（上のトークン）</div>
    <div class="step">3. CANVA_REFRESH_TOKEN を追加（上のリフレッシュトークン）</div>
    <div class="step">4. Redeploy する</div>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
