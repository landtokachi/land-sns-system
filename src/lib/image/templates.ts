export interface ImageTextData {
  category?: string
  title: string
  subtitle?: string
  date?: string
  deadline?: string
  amount?: string
  target_audience?: string
  organizer?: string
  url?: string
  points?: string[]
  template_type: string
}

// LANDのInstagram実投稿スタイル準拠テーマ
const THEMES: Record<string, {
  // 背景パレット（写真風グラデーション）
  bg1: string; bg2: string; bg3: string; bg4: string
  // アクセントカラー
  accent: string
  // 組織名エリア背景
  orgBg: string
  // デフォルトラベル
  label: string
  // 中間グロー色
  glow1: string; glow2: string
}> = {
  subsidy: {
    // 深い緑〜黒（農業・補助金系によく使われる）
    bg1: '#0a120a', bg2: '#0d1f0d', bg3: '#152015', bg4: '#0a0f0a',
    accent: '#86efac', orgBg: 'rgba(134,239,172,0.12)',
    label: '補助金・助成金',
    glow1: 'rgba(34,197,94,0.25)', glow2: 'rgba(21,128,61,0.20)',
  },
  event: {
    // 濃い青〜インディゴ（セミナー・イベント系）
    bg1: '#060a18', bg2: '#0a1035', bg3: '#0c1540', bg4: '#06080f',
    accent: '#93c5fd', orgBg: 'rgba(147,197,253,0.12)',
    label: 'イベント・セミナー',
    glow1: 'rgba(59,130,246,0.30)', glow2: 'rgba(99,102,241,0.20)',
  },
  land: {
    // 温かみのある黄土色〜茶（LAND自体の取り組み）
    bg1: '#1a1000', bg2: '#2a1800', bg3: '#1f1400', bg4: '#100c00',
    accent: '#fcd34d', orgBg: 'rgba(252,211,77,0.12)',
    label: 'LANDの取り組み',
    glow1: 'rgba(251,191,36,0.30)', glow2: 'rgba(217,119,6,0.20)',
  },
  business: {
    // ダーク〜パープル（事業者紹介・都会的）
    bg1: '#0a080f', bg2: '#150d22', bg3: '#1a0f2e', bg4: '#0c0810',
    accent: '#d8b4fe', orgBg: 'rgba(216,180,254,0.12)',
    label: '事業者紹介',
    glow1: 'rgba(139,92,246,0.30)', glow2: 'rgba(167,139,250,0.20)',
  },
  notice: {
    // 深い赤〜ダーク（お知らせ系）
    bg1: '#150505', bg2: '#250808', bg3: '#1f0606', bg4: '#0f0303',
    accent: '#fca5a5', orgBg: 'rgba(252,165,165,0.12)',
    label: 'お知らせ',
    glow1: 'rgba(239,68,68,0.30)', glow2: 'rgba(220,38,38,0.20)',
  },
}

export function generateSvgTemplate(data: ImageTextData): string {
  const t = THEMES[data.template_type] || THEMES.notice
  const catLabel = data.category || t.label
  const organizerText = data.organizer || ''

  // タイトル折り返し（LANDスタイル: 1行8〜10文字）
  const titleLines = wrapTextJa(data.title, 9)
  const numLines = titleLines.length

  // フォントサイズ：行数に応じて調整（LANDは超大文字）
  const titleFontSize = numLines <= 2 ? 110 : numLines <= 3 ? 92 : numLines <= 4 ? 78 : 64
  const lineH = titleFontSize * 1.18
  const totalTitleH = numLines * lineH

  // タイトルブロックのY位置（画面中央より少し上）
  const titleBlockY = Math.max(180, 520 - totalTitleH / 2)

  // 説明文（字数制限）
  const descLines = data.subtitle ? wrapTextJa(data.subtitle, 22) : []

  // 情報バッジ（日付・金額等）
  const badges: string[] = []
  if (data.date) badges.push(`📅 ${data.date}`)
  if (data.deadline && data.deadline !== data.date) badges.push(`⏰ 締切: ${data.deadline}`)
  if (data.amount) badges.push(`💰 ${data.amount}`)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <!-- 写真風グラデーション背景 -->
    <radialGradient id="bg_r1" cx="70%" cy="25%" r="55%">
      <stop offset="0%" stop-color="${t.glow1.replace('rgba', 'rgb').replace(/,[^,)]+\)/, ')')}"/>
      <stop offset="100%" stop-color="${t.bg2}"/>
    </radialGradient>
    <radialGradient id="bg_r2" cx="20%" cy="75%" r="50%">
      <stop offset="0%" stop-color="${t.glow2.replace('rgba', 'rgb').replace(/,[^,)]+\)/, ')')}"/>
      <stop offset="100%" stop-color="${t.bg1}"/>
    </radialGradient>
    <linearGradient id="bg_base" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${t.bg1}"/>
      <stop offset="40%" stop-color="${t.bg2}"/>
      <stop offset="70%" stop-color="${t.bg3}"/>
      <stop offset="100%" stop-color="${t.bg4}"/>
    </linearGradient>
    <!-- 下部オーバーレイ（テキスト読みやすさ用） -->
    <linearGradient id="overlay" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="35%" stop-color="rgba(0,0,0,0.55)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.85)"/>
    </linearGradient>
    <!-- アクセントグラデーション -->
    <linearGradient id="accentGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${t.accent}"/>
      <stop offset="100%" stop-color="${t.accent}88"/>
    </linearGradient>
    <!-- タイトル用グロー -->
    <filter id="titleGlow" x="-5%" y="-20%" width="110%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <!-- ソフトブラー -->
    <filter id="sfBlur">
      <feGaussianBlur stdDeviation="55"/>
    </filter>
    <filter id="sfBlur2">
      <feGaussianBlur stdDeviation="30"/>
    </filter>
    <!-- テキストシャドウ -->
    <filter id="textShadow" x="-10%" y="-30%" width="120%" height="160%">
      <feDropShadow dx="0" dy="3" stdDeviation="8" flood-color="rgba(0,0,0,0.8)"/>
    </filter>
  </defs>

  <!-- ===== BACKGROUND (写真風) ===== -->
  <rect width="1080" height="1080" fill="url(#bg_base)"/>
  <!-- ランダム感のある光のグロー -->
  <ellipse cx="750" cy="200" rx="420" ry="340" fill="${t.glow1}" filter="url(#sfBlur)"/>
  <ellipse cx="200" cy="820" rx="380" ry="300" fill="${t.glow2}" filter="url(#sfBlur)"/>
  <ellipse cx="540" cy="500" rx="300" ry="300" fill="${t.bg3}" opacity="0.5" filter="url(#sfBlur2)"/>

  <!-- テクスチャ感 (細かい点群) -->
  ${generateNoise(t.accent, 15)}

  <!-- 全体オーバーレイ（テキストを読みやすくする） -->
  <rect width="1080" height="1080" fill="url(#overlay)"/>

  <!-- ===== TOP AREA: 組織名 ===== -->
  ${organizerText ? `
  <rect x="0" y="0" width="1080" height="72" fill="rgba(0,0,0,0.45)"/>
  <text x="54" y="46"
    font-family="'Noto Sans JP', 'Hiragino Kaku Gothic ProN', sans-serif"
    font-size="22" font-weight="500" fill="rgba(255,255,255,0.75)"
    letter-spacing="2">${escapeXml(organizerText.slice(0, 30))}</text>` : `
  <rect x="0" y="0" width="1080" height="60" fill="rgba(0,0,0,0.35)"/>
  <text x="54" y="40"
    font-family="Arial, sans-serif"
    font-size="20" font-weight="700" fill="${t.accent}"
    letter-spacing="4" opacity="0.8">LAND</text>`}

  <!-- カテゴリバッジ -->
  <rect x="48" y="${organizerText ? 86 : 74}" width="${catLabel.length * 17 + 32}" height="36" rx="4"
    fill="${t.accent}" opacity="0.18" stroke="${t.accent}" stroke-width="1" stroke-opacity="0.5"/>
  <text x="${48 + catLabel.length * 8.5 + 16}" y="${organizerText ? 110 : 98}"
    font-family="'Noto Sans JP', sans-serif"
    font-size="16" font-weight="700" fill="${t.accent}"
    text-anchor="middle" letter-spacing="1">${escapeXml(catLabel)}</text>

  <!-- ===== MAIN TITLE (LAND風 超大文字) ===== -->
  ${titleLines.map((line, i) => `
  <text x="54" y="${titleBlockY + i * lineH}"
    font-family="'Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif"
    font-size="${titleFontSize}"
    font-weight="900"
    fill="white"
    letter-spacing="${titleFontSize > 80 ? 4 : 2}"
    filter="url(#textShadow)">${escapeXml(line)}</text>`).join('')}

  <!-- アクセントライン（タイトル下） -->
  <rect x="54" y="${titleBlockY + totalTitleH + 8}" width="80" height="4" rx="2"
    fill="${t.accent}" opacity="0.8"/>

  <!-- ===== 説明テキスト ===== -->
  ${descLines.slice(0, 3).map((line, i) => `
  <text x="54" y="${titleBlockY + totalTitleH + 50 + i * 38}"
    font-family="'Noto Sans JP', sans-serif"
    font-size="26" fill="rgba(255,255,255,0.75)"
    filter="url(#textShadow)">${escapeXml(line)}</text>`).join('')}

  <!-- ===== BOTTOM AREA ===== -->
  <!-- 情報バッジ群 -->
  ${badges.slice(0, 3).map((badge, i) => `
  <rect x="${54 + i * 330}" y="895" width="310" height="52" rx="8"
    fill="rgba(0,0,0,0.5)" stroke="${t.accent}" stroke-width="1" stroke-opacity="0.4"/>
  <text x="${54 + i * 330 + 16}" y="927"
    font-family="'Noto Sans JP', sans-serif"
    font-size="22" font-weight="600" fill="${t.accent}">${escapeXml(badge.slice(0, 18))}</text>`).join('')}

  <!-- フッター（LAND ブランディング） -->
  <rect x="0" y="960" width="1080" height="120" fill="rgba(0,0,0,0.65)"/>
  <rect x="0" y="960" width="1080" height="2" fill="${t.accent}" opacity="0.5"/>

  <text x="54" y="1000"
    font-family="Arial, sans-serif"
    font-size="30" font-weight="900" letter-spacing="5"
    fill="white">LAND</text>
  <text x="54" y="1022"
    font-family="'Noto Sans JP', sans-serif"
    font-size="14" fill="rgba(255,255,255,0.45)"
    letter-spacing="1">スタートアップ支援スペース｜公益財団法人とかち財団</text>
  <text x="54" y="1044"
    font-family="'Noto Sans JP', sans-serif"
    font-size="13" fill="rgba(255,255,255,0.30)">帯広市大通南8丁目6番地</text>

  <text x="1028" y="998"
    font-family="Arial, sans-serif"
    font-size="18" fill="${t.accent}"
    text-anchor="end" opacity="0.9">@land.tokachi</text>
  <text x="1028" y="1020"
    font-family="'Noto Sans JP', sans-serif"
    font-size="13" fill="rgba(255,255,255,0.35)"
    text-anchor="end">Instagram / Facebook / X</text>
</svg>`
}

// ノイズテクスチャ（写真っぽい粒感）
function generateNoise(color: string, count: number): string {
  const dots: string[] = []
  // 擬似乱数で点をばらまく
  for (let i = 0; i < count; i++) {
    const x = ((i * 73 + 37) % 1080)
    const y = ((i * 137 + 59) % 1080)
    const r = 60 + (i * 31) % 120
    const op = 0.04 + (i % 5) * 0.015
    dots.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${op.toFixed(3)}" filter="url(#sfBlur2)"/>`)
  }
  return dots.join('\n  ')
}

// 日本語テキスト折り返し（文字数で折り返し）
function wrapTextJa(text: string, maxChars: number): string[] {
  const lines: string[] = []
  let current = ''
  for (const char of text) {
    current += char
    if (current.length >= maxChars) { lines.push(current); current = '' }
  }
  if (current) lines.push(current)
  return lines
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}
