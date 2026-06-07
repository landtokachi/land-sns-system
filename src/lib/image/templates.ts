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

// カテゴリ別カラー設定
const THEMES: Record<string, {
  bg1: string; bg2: string; bg3: string;
  accent: string; accent2: string;
  label: string;
}> = {
  subsidy: {
    bg1: '#0a0e1a', bg2: '#0d1f3c', bg3: '#112244',
    accent: '#f59e0b', accent2: '#fbbf24',
    label: '補助金・助成金',
  },
  event: {
    bg1: '#060d1a', bg2: '#0a1f2e', bg3: '#0e2a3a',
    accent: '#06b6d4', accent2: '#22d3ee',
    label: 'イベント・セミナー',
  },
  land: {
    bg1: '#0a0617', bg2: '#110a2e', bg3: '#150e3a',
    accent: '#8b5cf6', accent2: '#a78bfa',
    label: 'LANDの取り組み',
  },
  business: {
    bg1: '#060a18', bg2: '#0a1428', bg3: '#0e1e38',
    accent: '#3b82f6', accent2: '#60a5fa',
    label: '事業者紹介',
  },
  notice: {
    bg1: '#0f0a06', bg2: '#1f1008', bg3: '#2a160a',
    accent: '#f97316', accent2: '#fb923c',
    label: 'お知らせ',
  },
}

export function generateSvgTemplate(data: ImageTextData): string {
  const theme = THEMES[data.template_type] || THEMES.notice

  const titleLines = wrapText(data.title, 18)
  const points = data.points?.slice(0, 3) || []

  // 日付文字列の整形
  const dateDisplay = data.date || data.deadline || ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <linearGradient id="bgG" x1="0" y1="0" x2="0.7" y2="1">
      <stop offset="0%" stop-color="${theme.bg1}"/>
      <stop offset="50%" stop-color="${theme.bg2}"/>
      <stop offset="100%" stop-color="${theme.bg3}"/>
    </linearGradient>
    <linearGradient id="accentG" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${theme.accent}"/>
      <stop offset="100%" stop-color="${theme.accent2}"/>
    </linearGradient>
    <linearGradient id="glowG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="${theme.accent}" stop-opacity="0"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="softglow">
      <feGaussianBlur stdDeviation="20" result="coloredBlur"/>
      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1080" height="1080" fill="url(#bgG)"/>

  <!-- Ambient glow circles -->
  <circle cx="900" cy="150" r="300" fill="${theme.accent}" opacity="0.06"/>
  <circle cx="100" cy="950" r="250" fill="${theme.accent2}" opacity="0.05"/>
  <circle cx="540" cy="540" r="400" fill="${theme.accent}" opacity="0.03"/>

  <!-- Top decorative bar -->
  <rect x="0" y="0" width="1080" height="6" fill="url(#accentG)"/>

  <!-- Geometric decoration - top right -->
  <polygon points="800,0 1080,0 1080,280" fill="${theme.accent}" opacity="0.07"/>
  <polygon points="850,0 1080,0 1080,230" fill="${theme.accent2}" opacity="0.05"/>

  <!-- Top section: LAND branding -->
  <text x="60" y="72" font-family="'Arial', sans-serif" font-size="22" font-weight="900" letter-spacing="6" fill="${theme.accent}" filter="url(#glow)">LAND</text>
  <text x="148" y="72" font-family="'Noto Sans JP', sans-serif" font-size="18" fill="rgba(255,255,255,0.3)">とかち財団</text>

  <!-- Category badge -->
  <rect x="60" y="95" width="${(data.category || theme.label).length * 18 + 48}" height="44" rx="22" fill="url(#accentG)" opacity="0.9"/>
  <text x="${60 + (data.category || theme.label).length * 9 + 24}" y="123" font-family="'Noto Sans JP', sans-serif" font-size="20" font-weight="700" fill="#ffffff" text-anchor="middle">${escapeXml(data.category || theme.label)}</text>

  <!-- Main title area - large bold text -->
  ${titleLines.map((line, i) => `
  <text x="60" y="${220 + i * 82}" font-family="'Noto Sans JP', sans-serif" font-size="${titleLines.length <= 2 ? 72 : titleLines.length <= 3 ? 62 : 54}" font-weight="900" fill="#ffffff" filter="url(#softglow)">${escapeXml(line)}</text>`).join('')}

  <!-- Accent line under title -->
  <rect x="60" y="${220 + titleLines.length * 82 - 10}" width="120" height="5" rx="2.5" fill="url(#accentG)"/>

  <!-- Subtitle / description -->
  ${data.subtitle ? (() => {
    const subLines = wrapText(data.subtitle, 26)
    const subY = 220 + titleLines.length * 82 + 30
    return subLines.map((l, i) => `<text x="60" y="${subY + i * 44}" font-family="'Noto Sans JP', sans-serif" font-size="34" fill="rgba(255,255,255,0.75)">${escapeXml(l)}</text>`).join('\n  ')
  })() : ''}

  <!-- Key info cards -->
  ${buildInfoCards(data, theme)}

  <!-- Points / highlights -->
  ${points.length > 0 ? buildPoints(points, theme, titleLines.length, data) : ''}

  <!-- Bottom footer -->
  <rect x="0" y="940" width="1080" height="140" fill="rgba(0,0,0,0.4)"/>
  <rect x="0" y="940" width="1080" height="3" fill="url(#accentG)" opacity="0.6"/>

  <!-- LAND logo text in footer -->
  <rect x="60" y="965" width="90" height="90" rx="16" fill="${theme.accent}" opacity="0.15"/>
  <rect x="61" y="966" width="88" height="88" rx="15" fill="none" stroke="${theme.accent}" stroke-width="1.5" opacity="0.4"/>
  <text x="105" y="1018" font-family="'Arial', sans-serif" font-size="28" font-weight="900" fill="${theme.accent}" text-anchor="middle" filter="url(#glow)">L</text>

  <text x="175" y="994" font-family="'Arial', sans-serif" font-size="30" font-weight="900" letter-spacing="4" fill="#ffffff">LAND</text>
  <text x="175" y="1022" font-family="'Noto Sans JP', sans-serif" font-size="16" fill="rgba(255,255,255,0.4)">スタートアップ支援スペース</text>
  <text x="175" y="1044" font-family="'Noto Sans JP', sans-serif" font-size="14" fill="rgba(255,255,255,0.25)">公益財団法人とかち財団｜帯広市</text>

  <!-- Instagram handle -->
  <text x="1020" y="994" font-family="'Arial', sans-serif" font-size="17" fill="${theme.accent}" text-anchor="end" opacity="0.8">@land.tokachi</text>
  <text x="1020" y="1016" font-family="'Arial', sans-serif" font-size="14" fill="rgba(255,255,255,0.25)" text-anchor="end">Instagram / Facebook / X</text>
</svg>`
}

function buildInfoCards(data: ImageTextData, theme: {accent:string;accent2:string}): string {
  const items: Array<{icon:string; label:string; value:string}> = []

  if (data.date) items.push({ icon: '📅', label: '開催日・期間', value: data.date })
  if (data.deadline && data.deadline !== data.date) items.push({ icon: '⏰', label: '申込締切', value: data.deadline })
  if (data.amount) items.push({ icon: '💰', label: '補助金額・補助率', value: data.amount })
  if (data.target_audience) items.push({ icon: '👥', label: '対象者', value: data.target_audience.slice(0, 20) })
  if (data.organizer) items.push({ icon: '🏢', label: '主催・実施機関', value: data.organizer.slice(0, 22) })

  if (items.length === 0) return ''

  const cardW = 460
  const cardH = 80
  const colGap = 40
  const startY = 600

  return items.slice(0, 4).map((item, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = 60 + col * (cardW + colGap)
    const y = startY + row * (cardH + 16)
    return `
  <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="12" fill="rgba(255,255,255,0.05)" stroke="${theme.accent}" stroke-width="1" stroke-opacity="0.2"/>
  <text x="${x + 20}" y="${y + 28}" font-family="sans-serif" font-size="22">${item.icon}</text>
  <text x="${x + 52}" y="${y + 30}" font-family="'Noto Sans JP', sans-serif" font-size="15" fill="rgba(255,255,255,0.4)">${escapeXml(item.label)}</text>
  <text x="${x + 20}" y="${y + 60}" font-family="'Noto Sans JP', sans-serif" font-size="22" font-weight="700" fill="#ffffff">${escapeXml(item.value)}</text>`
  }).join('\n')
}

function buildPoints(points: string[], theme: {accent:string;accent2:string}, titleLen: number, data: ImageTextData): string {
  // If info cards are shown, don't show points (space conflict)
  const hasCards = data.date || data.deadline || data.amount || data.target_audience || data.organizer
  if (hasCards) return ''

  const startY = 490 + titleLen * 40
  return points.map((pt, i) => `
  <rect x="60" y="${startY + i * 76}" width="960" height="64" rx="12" fill="rgba(255,255,255,0.05)" stroke="${theme.accent}" stroke-width="1" stroke-opacity="0.15"/>
  <rect x="60" y="${startY + i * 76}" width="5" height="64" rx="2.5" fill="${theme.accent}"/>
  <text x="84" y="${startY + i * 76 + 40}" font-family="'Noto Sans JP', sans-serif" font-size="26" font-weight="600" fill="#ffffff">${escapeXml(pt)}</text>`
  ).join('\n')
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
