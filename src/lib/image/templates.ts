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

// カテゴリ別テーマ — LANDのSNS投稿スタイルに準拠
const THEMES: Record<string, {
  bg: string[]       // グラデーション停止点カラー
  accent: string     // アクセントカラー
  accent2: string    // サブアクセント
  labelBg: string    // カテゴリバッジ背景
  label: string      // デフォルトラベル
  shape: string      // 装飾シェイプカラー
}> = {
  subsidy: {
    bg: ['#0a0f2e', '#1a1060', '#0d1a50'],
    accent: '#fbbf24', accent2: '#f59e0b',
    labelBg: '#f59e0b', label: '補助金・助成金',
    shape: 'rgba(251,191,36,0.12)',
  },
  event: {
    bg: ['#050f1a', '#0a2540', '#062030'],
    accent: '#34d399', accent2: '#10b981',
    labelBg: '#10b981', label: 'イベント・セミナー',
    shape: 'rgba(52,211,153,0.12)',
  },
  land: {
    bg: ['#0c0620', '#1a0a50', '#120840'],
    accent: '#c084fc', accent2: '#a855f7',
    labelBg: '#9333ea', label: 'LANDの取り組み',
    shape: 'rgba(192,132,252,0.12)',
  },
  business: {
    bg: ['#060c1e', '#0e1e3c', '#0a1830'],
    accent: '#60a5fa', accent2: '#3b82f6',
    labelBg: '#2563eb', label: '事業者紹介',
    shape: 'rgba(96,165,250,0.12)',
  },
  notice: {
    bg: ['#100606', '#280e0e', '#1a0808'],
    accent: '#f87171', accent2: '#ef4444',
    labelBg: '#dc2626', label: 'お知らせ',
    shape: 'rgba(248,113,113,0.12)',
  },
}

export function generateSvgTemplate(data: ImageTextData): string {
  const t = THEMES[data.template_type] || THEMES.notice
  const catLabel = data.category || t.label

  // タイトルを折り返し（1行あたり最大13文字）
  const titleLines = wrapText(data.title, 13)
  const fontSize = titleLines.length === 1 ? 88 : titleLines.length === 2 ? 76 : 64

  // 情報ブロック
  const infoItems: Array<{icon: string; text: string}> = []
  if (data.date) infoItems.push({ icon: '📅', text: data.date })
  if (data.deadline && data.deadline !== data.date) infoItems.push({ icon: '⏰', text: `締切: ${data.deadline}` })
  if (data.amount) infoItems.push({ icon: '💰', text: data.amount })
  if (data.target_audience) infoItems.push({ icon: '👥', text: data.target_audience.slice(0, 18) })
  if (data.organizer) infoItems.push({ icon: '🏢', text: data.organizer.slice(0, 20) })
  const displayItems = infoItems.slice(0, 4)

  const titleStartY = 300 - (titleLines.length - 1) * (fontSize / 2)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="${t.bg[0]}"/>
      <stop offset="55%" stop-color="${t.bg[1]}"/>
      <stop offset="100%" stop-color="${t.bg[2]}"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${t.accent}"/>
      <stop offset="100%" stop-color="${t.accent2}"/>
    </linearGradient>
    <linearGradient id="titleGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="${t.accent}"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="softBlur">
      <feGaussianBlur stdDeviation="40"/>
    </filter>
    <clipPath id="roundRect">
      <rect width="1080" height="1080" rx="0"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="1080" height="1080" fill="url(#bg)"/>

  <!-- Large ambient glow circles (LAND style decorations) -->
  <circle cx="860" cy="200" r="320" fill="${t.accent}" opacity="0.07" filter="url(#softBlur)"/>
  <circle cx="150" cy="880" r="280" fill="${t.accent2}" opacity="0.08" filter="url(#softBlur)"/>
  <circle cx="540" cy="540" r="500" fill="${t.shape.replace('0.12', '0.04')}" filter="url(#softBlur)"/>

  <!-- Geometric decorations -->
  <polygon points="1080,0 1080,400 700,0" fill="${t.accent}" opacity="0.06"/>
  <polygon points="0,1080 0,750 280,1080" fill="${t.accent2}" opacity="0.05"/>

  <!-- Top accent bar -->
  <rect x="0" y="0" width="1080" height="6" fill="url(#accent)" rx="0"/>

  <!-- Left accent bar -->
  <rect x="0" y="0" width="5" height="1080" fill="url(#accent)" opacity="0.6"/>

  <!-- Decorative circle outline top-right -->
  <circle cx="980" cy="120" r="90" fill="none" stroke="${t.accent}" stroke-width="1.5" opacity="0.2"/>
  <circle cx="980" cy="120" r="60" fill="none" stroke="${t.accent}" stroke-width="1" opacity="0.15"/>

  <!-- Circle outline bottom-left -->
  <circle cx="100" cy="960" r="70" fill="none" stroke="${t.accent2}" stroke-width="1.5" opacity="0.15"/>

  <!-- LAND branding top-left -->
  <text x="56" y="72" font-family="Arial, sans-serif" font-size="26" font-weight="900" letter-spacing="8" fill="${t.accent}" filter="url(#glow)" opacity="0.9">LAND</text>
  <text x="56" y="98" font-family="'Noto Sans JP', sans-serif" font-size="16" fill="rgba(255,255,255,0.3)" letter-spacing="1">公益財団法人とかち財団</text>

  <!-- Category badge -->
  <rect x="56" y="118" width="${catLabel.length * 20 + 40}" height="42" rx="21" fill="${t.labelBg}"/>
  <text x="${56 + catLabel.length * 10 + 20}" y="145" font-family="'Noto Sans JP', sans-serif" font-size="19" font-weight="700" fill="white" text-anchor="middle">${escapeXml(catLabel)}</text>

  <!-- MAIN TITLE — Large & bold, gradient -->
  ${titleLines.map((line, i) => `
  <text x="56" y="${titleStartY + i * (fontSize + 12)}"
    font-family="'Noto Sans JP', 'Yu Gothic', sans-serif"
    font-size="${fontSize}"
    font-weight="900"
    fill="url(#titleGrad)"
    filter="url(#glow)"
    letter-spacing="2">${escapeXml(line)}</text>`).join('')}

  <!-- Subtitle -->
  ${data.subtitle ? `
  <text x="56" y="${titleStartY + titleLines.length * (fontSize + 12) + 20}"
    font-family="'Noto Sans JP', sans-serif"
    font-size="34"
    fill="${t.accent}"
    opacity="0.9">${escapeXml(data.subtitle.slice(0, 24))}</text>` : ''}

  <!-- Divider line -->
  <rect x="56" y="660" width="968" height="2" fill="url(#accent)" opacity="0.4" rx="1"/>

  <!-- Info blocks (2 columns) -->
  ${displayItems.map((item, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = 56 + col * 500
    const y = 680 + row * 90
    return `
  <rect x="${x}" y="${y}" width="470" height="74" rx="12"
    fill="${t.shape}" stroke="${t.accent}" stroke-width="1" stroke-opacity="0.2"/>
  <text x="${x + 20}" y="${y + 27}" font-family="sans-serif" font-size="24">${item.icon}</text>
  <text x="${x + 52}" y="${y + 30}" font-family="'Noto Sans JP', sans-serif" font-size="14" fill="${t.accent}" opacity="0.7">${item.text.includes('締切') ? '申込締切' : item.text.includes('💰') ? '補助金額' : item.text.includes('👥') ? '対象者' : item.text.includes('🏢') ? '主催機関' : '開催日時'}</text>
  <text x="${x + 20}" y="${y + 58}" font-family="'Noto Sans JP', sans-serif" font-size="24" font-weight="700" fill="white">${escapeXml(item.text.replace(/^[^\s]+ /, ''))}</text>`
  }).join('')}

  <!-- Bottom footer bar -->
  <rect x="0" y="940" width="1080" height="140" fill="rgba(0,0,0,0.5)"/>
  <rect x="0" y="940" width="1080" height="2" fill="url(#accent)" opacity="0.5"/>

  <!-- Footer left: LAND logo block -->
  <rect x="52" y="958" width="84" height="84" rx="14"
    fill="${t.accent}" opacity="0.15" stroke="${t.accent}" stroke-width="1" stroke-opacity="0.3"/>
  <text x="94" y="1010" font-family="Arial, sans-serif" font-size="32" font-weight="900"
    fill="${t.accent}" text-anchor="middle" filter="url(#glow)">L</text>

  <text x="154" y="988" font-family="Arial, sans-serif" font-size="28" font-weight="900" letter-spacing="4" fill="white">LAND</text>
  <text x="154" y="1012" font-family="'Noto Sans JP', sans-serif" font-size="15" fill="rgba(255,255,255,0.4)">スタートアップ支援スペース</text>
  <text x="154" y="1032" font-family="'Noto Sans JP', sans-serif" font-size="13" fill="rgba(255,255,255,0.25)">帯広市|公益財団法人とかち財団</text>

  <!-- Footer right: SNS handle -->
  <text x="1028" y="990" font-family="Arial, sans-serif" font-size="18" fill="${t.accent}" text-anchor="end" opacity="0.8">@land.tokachi</text>
  <text x="1028" y="1014" font-family="'Noto Sans JP', sans-serif" font-size="13" fill="rgba(255,255,255,0.25)" text-anchor="end">Instagram / Facebook / X</text>
  <text x="1028" y="1034" font-family="'Noto Sans JP', sans-serif" font-size="12" fill="rgba(255,255,255,0.18)" text-anchor="end">land-sns-system.vercel.app</text>
</svg>`
}

function wrapText(text: string, maxChars: number): string[] {
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
