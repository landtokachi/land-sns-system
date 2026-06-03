export interface ImageTextData {
  category?: string
  title: string
  subtitle?: string
  date?: string
  target_audience?: string
  organizer?: string
  url?: string
  template_type: string
}

const TEMPLATE_COLORS: Record<string, { bg: string; accent: string; label: string }> = {
  subsidy: { bg: '#1e3a5f', accent: '#f59e0b', label: '補助金・助成金' },
  event: { bg: '#1a4731', accent: '#10b981', label: 'イベント・セミナー' },
  land: { bg: '#1e1b4b', accent: '#8b5cf6', label: 'LANDの取り組み' },
  business: { bg: '#1c1f26', accent: '#3b82f6', label: '事業者紹介' },
  notice: { bg: '#3b1f1f', accent: '#ef4444', label: 'お知らせ' },
}

export function generateSvgTemplate(data: ImageTextData): string {
  const colors = TEMPLATE_COLORS[data.template_type] || TEMPLATE_COLORS.notice
  const categoryLabel = data.category || colors.label

  const titleLines = wrapText(data.title, 22)
  const subtitleLines = data.subtitle ? wrapText(data.subtitle, 30) : []

  const titleY = 420 - titleLines.length * 28
  const subtitleY = titleY + titleLines.length * 56 + 20

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${colors.bg}"/>
      <stop offset="100%" stop-color="${darken(colors.bg)}"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1080" height="1080" fill="url(#bgGrad)"/>

  <!-- Decorative elements -->
  <rect x="0" y="0" width="8" height="1080" fill="${colors.accent}"/>
  <rect x="0" y="0" width="1080" height="8" fill="${colors.accent}" opacity="0.3"/>
  <circle cx="900" cy="180" r="200" fill="${colors.accent}" opacity="0.05"/>
  <circle cx="180" cy="900" r="150" fill="${colors.accent}" opacity="0.05"/>

  <!-- Category badge -->
  <rect x="60" y="60" width="${categoryLabel.length * 22 + 40}" height="48" rx="8" fill="${colors.accent}"/>
  <text x="80" y="93" font-family="'Noto Sans JP', sans-serif" font-size="24" font-weight="700" fill="#ffffff">${escapeXml(categoryLabel)}</text>

  <!-- Title -->
  ${titleLines.map((line, i) => `<text x="60" y="${titleY + i * 56}" font-family="'Noto Sans JP', sans-serif" font-size="52" font-weight="700" fill="#ffffff">${escapeXml(line)}</text>`).join('\n  ')}

  <!-- Subtitle -->
  ${subtitleLines.map((line, i) => `<text x="60" y="${subtitleY + i * 40}" font-family="'Noto Sans JP', sans-serif" font-size="30" fill="${colors.accent}">${escapeXml(line)}</text>`).join('\n  ')}

  <!-- Divider -->
  <rect x="60" y="570" width="960" height="2" fill="${colors.accent}" opacity="0.5"/>

  <!-- Info section -->
  ${data.date ? `
  <text x="60" y="620" font-family="'Noto Sans JP', sans-serif" font-size="24" fill="#94a3b8">📅 締切・開催日</text>
  <text x="60" y="655" font-family="'Noto Sans JP', sans-serif" font-size="28" font-weight="600" fill="#ffffff">${escapeXml(data.date)}</text>` : ''}

  ${data.target_audience ? `
  <text x="60" y="${data.date ? '710' : '620'}" font-family="'Noto Sans JP', sans-serif" font-size="24" fill="#94a3b8">👥 対象者</text>
  <text x="60" y="${data.date ? '745' : '655'}" font-family="'Noto Sans JP', sans-serif" font-size="28" font-weight="600" fill="#ffffff">${escapeXml(data.target_audience.slice(0, 28))}</text>` : ''}

  ${data.organizer ? `
  <text x="60" y="800" font-family="'Noto Sans JP', sans-serif" font-size="24" fill="#94a3b8">🏢 主催</text>
  <text x="60" y="835" font-family="'Noto Sans JP', sans-serif" font-size="26" font-weight="500" fill="#ffffff">${escapeXml(data.organizer.slice(0, 30))}</text>` : ''}

  <!-- Footer -->
  <rect x="0" y="960" width="1080" height="120" fill="${colors.accent}" opacity="0.15"/>
  <rect x="60" y="975" width="120" height="90" rx="8" fill="${colors.accent}" opacity="0.3"/>
  <text x="100" y="1020" font-family="'Noto Sans JP', sans-serif" font-size="14" text-anchor="middle" fill="${colors.accent}">LAND</text>
  <text x="100" y="1038" font-family="'Noto Sans JP', sans-serif" font-size="10" text-anchor="middle" fill="${colors.accent}">ロゴ</text>

  <text x="210" y="1005" font-family="'Noto Sans JP', sans-serif" font-size="26" font-weight="700" fill="#ffffff">LAND</text>
  <text x="210" y="1040" font-family="'Noto Sans JP', sans-serif" font-size="18" fill="#94a3b8">スタートアップ支援スペース</text>

  <!-- QR placeholder -->
  <rect x="920" y="965" width="100" height="100" rx="8" fill="white" opacity="0.9"/>
  <text x="970" y="1005" font-family="sans-serif" font-size="12" text-anchor="middle" fill="#666">QR</text>
  <text x="970" y="1050" font-family="sans-serif" font-size="10" text-anchor="middle" fill="#666">CODE</text>
</svg>`
}

function wrapText(text: string, maxChars: number): string[] {
  const lines: string[] = []
  let current = ''
  for (const char of text) {
    current += char
    if (current.length >= maxChars) {
      lines.push(current)
      current = ''
    }
  }
  if (current) lines.push(current)
  return lines
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function darken(hex: string): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (num >> 16) - 30)
  const g = Math.max(0, ((num >> 8) & 0xff) - 30)
  const b = Math.max(0, (num & 0xff) - 30)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}
