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

// LANDのInstagram実投稿分析に基づくテーマ
const THEMES = {
  subsidy: {
    // 深い緑系（農業・補助金）
    colors: ['#0a1a08','#0f2d0c','#162d10','#0d2509','#061204'],
    glow: ['rgba(74,222,128,0.22)','rgba(34,197,94,0.18)'],
    accent: '#86efac', accent2: '#4ade80',
    label: '補助金・助成金',
  },
  event: {
    // 深い青（セミナー・イベント）
    colors: ['#060c1c','#0a1530','#0d1e40','#080f25','#040810'],
    glow: ['rgba(96,165,250,0.22)','rgba(59,130,246,0.18)'],
    accent: '#93c5fd', accent2: '#60a5fa',
    label: 'イベント・セミナー',
  },
  land: {
    // 温かい黄土色（LAND・財団）
    colors: ['#1c1200','#2e1c00','#261500','#1a1000','#0e0800'],
    glow: ['rgba(252,211,77,0.25)','rgba(245,158,11,0.18)'],
    accent: '#fcd34d', accent2: '#fbbf24',
    label: 'LANDの取り組み',
  },
  business: {
    // ダーク紫（事業者紹介）
    colors: ['#0c0816','#150d28','#1a1035','#100a20','#080614'],
    glow: ['rgba(196,181,253,0.22)','rgba(167,139,250,0.18)'],
    accent: '#d8b4fe', accent2: '#c084fc',
    label: '事業者紹介',
  },
  notice: {
    // 深い赤（お知らせ）
    colors: ['#180404','#2a0606','#220505','#160404','#0c0202'],
    glow: ['rgba(252,165,165,0.22)','rgba(239,68,68,0.18)'],
    accent: '#fca5a5', accent2: '#f87171',
    label: 'お知らせ',
  },
} as const

type ThemeKey = keyof typeof THEMES

export function generateSvgTemplate(data: ImageTextData): string {
  const key = (data.template_type as ThemeKey) in THEMES ? data.template_type as ThemeKey : 'notice'
  const t = THEMES[key]
  const catLabel = data.category || t.label
  const org = data.organizer || ''

  // タイトルを折り返し（LANDスタイル: 1行8〜9文字）
  const rawLines = wrapJa(data.title, 8)
  const n = rawLines.length
  // フォントサイズ: 行数に応じて
  const fs = n === 1 ? 120 : n === 2 ? 100 : n === 3 ? 84 : 70
  const lh = fs * 1.22

  // タイトル開始Y（中央より上寄り）
  const titleY = Math.max(200, Math.round(480 - (n * lh) / 2))

  // サブテキスト
  const subText = data.subtitle ? data.subtitle.slice(0, 30) : ''

  // 日時バッジ
  const badge1 = data.date ? `📅 ${data.date}` : (data.deadline ? `⏰ 締切: ${data.deadline}` : '')
  const badge2 = data.target_audience ? `👥 ${data.target_audience.slice(0, 16)}` : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
<defs>
  <!-- ベース背景グラデーション -->
  <linearGradient id="bg" x1="0" y1="0" x2="0.6" y2="1">
    <stop offset="0%"   stop-color="${t.colors[0]}"/>
    <stop offset="30%"  stop-color="${t.colors[1]}"/>
    <stop offset="60%"  stop-color="${t.colors[2]}"/>
    <stop offset="85%"  stop-color="${t.colors[3]}"/>
    <stop offset="100%" stop-color="${t.colors[4]}"/>
  </linearGradient>

  <!-- 右上グロー -->
  <radialGradient id="g1" cx="75%" cy="20%" r="45%">
    <stop offset="0%"   stop-color="${t.glow[0]}"/>
    <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
  </radialGradient>
  <!-- 左下グロー -->
  <radialGradient id="g2" cx="20%" cy="80%" r="40%">
    <stop offset="0%"   stop-color="${t.glow[1]}"/>
    <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
  </radialGradient>
  <!-- 中央グロー（奥行き感） -->
  <radialGradient id="g3" cx="50%" cy="50%" r="35%">
    <stop offset="0%"   stop-color="${t.accent}18"/>
    <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
  </radialGradient>

  <!-- テキスト領域の下グラデーション（読みやすさ） -->
  <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stop-color="rgba(0,0,0,0)"/>
    <stop offset="40%"  stop-color="rgba(0,0,0,0.45)"/>
    <stop offset="100%" stop-color="rgba(0,0,0,0.75)"/>
  </linearGradient>

  <!-- アクセントグラデーション（ライン・バッジ用） -->
  <linearGradient id="acc" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%"   stop-color="${t.accent}"/>
    <stop offset="100%" stop-color="${t.accent2}"/>
  </linearGradient>

  <!-- フィルター: テキストシャドウ -->
  <filter id="ts" x="-8%" y="-25%" width="116%" height="150%">
    <feDropShadow dx="0" dy="4" stdDeviation="10" flood-color="rgba(0,0,0,0.9)"/>
  </filter>
  <!-- フィルター: ソフトグロー -->
  <filter id="sg" x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur stdDeviation="40" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="sg2" x="-10%" y="-10%" width="120%" height="120%">
    <feGaussianBlur stdDeviation="15" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
</defs>

<!-- ===== BACKGROUND ===== -->
<rect width="1080" height="1080" fill="url(#bg)"/>
<rect width="1080" height="1080" fill="url(#g1)"/>
<rect width="1080" height="1080" fill="url(#g2)"/>
<rect width="1080" height="1080" fill="url(#g3)"/>

<!-- テクスチャ感（薄い円群） -->
<circle cx="820" cy="160" r="220" fill="${t.accent}" opacity="0.06" filter="url(#sg)"/>
<circle cx="180" cy="880" r="180" fill="${t.accent2}" opacity="0.07" filter="url(#sg)"/>
<circle cx="600" cy="520" r="280" fill="${t.accent}" opacity="0.04" filter="url(#sg)"/>

<!-- 幾何学装飾（円アウトライン） -->
<circle cx="960" cy="120" r="130" fill="none" stroke="${t.accent}" stroke-width="1.5" opacity="0.18"/>
<circle cx="960" cy="120" r="85"  fill="none" stroke="${t.accent}" stroke-width="0.8" opacity="0.12"/>
<circle cx="110" cy="960" r="100" fill="none" stroke="${t.accent2}" stroke-width="1.5" opacity="0.15"/>

<!-- ポリゴン装飾（右上コーナー） -->
<polygon points="1080,0 1080,340 760,0" fill="${t.accent}" opacity="0.07"/>
<polygon points="1080,0 1080,250 820,0" fill="${t.accent2}" opacity="0.05"/>

<!-- テキスト領域フェード（下部） -->
<rect width="1080" height="1080" fill="url(#fade)"/>

<!-- ===== トップバー ===== -->
<rect x="0" y="0" width="1080" height="5" fill="url(#acc)"/>

<!-- 組織名エリア -->
${org ? `
<rect x="0" y="0" width="1080" height="64" fill="rgba(0,0,0,0.38)"/>
<text x="52" y="42"
  font-family="'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"
  font-size="20" font-weight="500"
  fill="rgba(255,255,255,0.75)" letter-spacing="2"
  filter="url(#ts)">${esc(org.slice(0, 28))}</text>` : `
<rect x="0" y="0" width="1080" height="58" fill="rgba(0,0,0,0.30)"/>
<text x="52" y="38"
  font-family="Arial,sans-serif"
  font-size="22" font-weight="900" letter-spacing="5"
  fill="${t.accent}" opacity="0.9"
  filter="url(#sg2)">LAND</text>`}

<!-- カテゴリバッジ -->
<rect x="48" y="${org ? 76 : 68}" width="${catLabel.length * 18 + 36}" height="38" rx="4"
  fill="${t.accent}" opacity="0.15"
  stroke="${t.accent}" stroke-width="1" stroke-opacity="0.55"/>
<text x="${48 + catLabel.length * 9 + 18}" y="${org ? 101 : 93}"
  font-family="'Noto Sans JP',sans-serif"
  font-size="17" font-weight="700"
  fill="${t.accent}" text-anchor="middle" letter-spacing="0.5">${esc(catLabel)}</text>

<!-- ===== メインタイトル ===== -->
${rawLines.map((line, i) => `
<text x="52" y="${titleY + i * lh}"
  font-family="'Noto Sans JP','Hiragino Kaku Gothic ProN','Yu Gothic',sans-serif"
  font-size="${fs}" font-weight="900"
  fill="white" letter-spacing="3"
  filter="url(#ts)">${esc(line)}</text>`).join('')}

<!-- アクセントライン（タイトル下） -->
<rect x="52" y="${titleY + n * lh + 6}" width="72" height="5" rx="2.5" fill="url(#acc)"/>

<!-- サブテキスト -->
${subText ? `
<text x="52" y="${titleY + n * lh + 50}"
  font-family="'Noto Sans JP',sans-serif"
  font-size="30" fill="${t.accent}" opacity="0.88"
  filter="url(#ts)">${esc(subText)}</text>` : ''}

<!-- ===== 情報バッジ ===== -->
${[badge1, badge2].filter(Boolean).map((b, i) => `
<rect x="${52 + i * 490}" y="882" width="460" height="56" rx="8"
  fill="rgba(0,0,0,0.55)" stroke="${t.accent}" stroke-width="1" stroke-opacity="0.35"/>
<text x="${52 + i * 490 + 18}" y="917"
  font-family="'Noto Sans JP',sans-serif"
  font-size="24" font-weight="600" fill="${t.accent}"
  filter="url(#ts)">${esc(b.slice(0, 20))}</text>`).join('')}

<!-- ===== フッター ===== -->
<rect x="0" y="952" width="1080" height="128" fill="rgba(0,0,0,0.68)"/>
<rect x="0" y="952" width="1080" height="2.5" fill="url(#acc)" opacity="0.6"/>

<!-- LAND ロゴブロック -->
<rect x="48" y="968" width="88" height="88" rx="14"
  fill="${t.accent}" opacity="0.12"
  stroke="${t.accent}" stroke-width="1" stroke-opacity="0.30"/>
<text x="92" y="1022"
  font-family="Arial,sans-serif"
  font-size="36" font-weight="900"
  fill="${t.accent}" text-anchor="middle"
  filter="url(#sg2)">L</text>

<text x="152" y="996"
  font-family="Arial,sans-serif"
  font-size="28" font-weight="900" letter-spacing="5"
  fill="white">LAND</text>
<text x="152" y="1018"
  font-family="'Noto Sans JP',sans-serif"
  font-size="14" fill="rgba(255,255,255,0.40)"
  letter-spacing="0.5">スタートアップ支援スペース｜公益財団法人とかち財団</text>
<text x="152" y="1038"
  font-family="'Noto Sans JP',sans-serif"
  font-size="13" fill="rgba(255,255,255,0.22)">帯広市大通南8丁目6番地</text>

<!-- SNS ハンドル（右） -->
<text x="1032" y="995"
  font-family="Arial,sans-serif"
  font-size="18" fill="${t.accent}"
  text-anchor="end" opacity="0.85">@land.tokachi</text>
<text x="1032" y="1016"
  font-family="'Noto Sans JP',sans-serif"
  font-size="13" fill="rgba(255,255,255,0.30)"
  text-anchor="end">Instagram / Facebook / X</text>
</svg>`
}

/** 日本語テキスト折り返し（maxChars文字で改行） */
function wrapJa(text: string, maxChars: number): string[] {
  const lines: string[] = []
  let cur = ''
  for (const ch of text) {
    cur += ch
    if (cur.length >= maxChars) { lines.push(cur); cur = '' }
  }
  if (cur) lines.push(cur)
  return lines
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}
