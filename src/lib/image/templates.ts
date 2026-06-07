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
  feedback?: string       // ユーザーからのフィードバック
  design_variant?: number // 0-4 デザインバリアント
}

// ─── デザインバリアント定義（Canva風5スタイル）───────────────────────
const VARIANTS = [
  // 0: ボールド・ソリッド（力強い補助金向け）
  {
    name: 'bold',
    getBg: (accent: string, accent2: string) => ({
      base: accent,
      grad: `linear-gradient(145deg, ${accent} 0%, ${accent2} 100%)`,
    }),
  },
  // 1: ミニマル・ホワイト（清潔感・信頼感）
  {
    name: 'minimal',
    getBg: (_a: string, _b: string) => ({
      base: '#f8f9fa',
      grad: 'linear-gradient(135deg, #ffffff 0%, #f1f3f5 100%)',
    }),
  },
  // 2: ダーク・プレミアム（高級感・イベント向け）
  {
    name: 'dark',
    getBg: (accent: string, _b: string) => ({
      base: '#0f172a',
      grad: `linear-gradient(135deg, #0f172a 0%, #1e293b 100%)`,
    }),
  },
  // 3: グラデーション・ビビッド（SNS映え）
  {
    name: 'vivid',
    getBg: (accent: string, accent2: string) => ({
      base: accent,
      grad: `linear-gradient(135deg, ${accent} 0%, ${accent2} 50%, #7c3aed 100%)`,
    }),
  },
  // 4: ナチュラル・アース（地域・農業向け）
  {
    name: 'natural',
    getBg: (_a: string, _b: string) => ({
      base: '#1c2b1a',
      grad: 'linear-gradient(145deg, #1c2b1a 0%, #2d4a2a 50%, #1a3018 100%)',
    }),
  },
]

// カテゴリ別カラー
const CATEGORY_COLORS: Record<string, { accent: string; accent2: string; textColor: string }> = {
  'subsidy':  { accent: '#1e3a5f', accent2: '#2563eb', textColor: '#fbbf24' },
  'event':    { accent: '#312e81', accent2: '#4f46e5', textColor: '#a5b4fc' },
  'land':     { accent: '#78350f', accent2: '#d97706', textColor: '#fcd34d' },
  'business': { accent: '#1e1b4b', accent2: '#7c3aed', textColor: '#c4b5fd' },
  'notice':   { accent: '#0c4a6e', accent2: '#0284c7', textColor: '#7dd3fc' },
}

export function generateSvgTemplate(data: ImageTextData): string {
  const type = data.template_type in CATEGORY_COLORS ? data.template_type : 'notice'
  const colors = CATEGORY_COLORS[type]
  const variant = (data.design_variant ?? 0) % 5
  const v = VARIANTS[variant]
  const bg = v.getBg(colors.accent, colors.accent2)

  const isLight = variant === 1 // ミニマルホワイトだけテキスト黒
  const titleColor = isLight ? '#0f172a' : '#ffffff'
  const subtextColor = isLight ? '#475569' : 'rgba(255,255,255,0.85)'
  const accentLineColor = isLight ? colors.accent2 : colors.textColor

  return buildDesign(data, bg, titleColor, subtextColor, accentLineColor, variant, colors)
}

function buildDesign(
  data: ImageTextData,
  bg: { base: string; grad: string },
  titleColor: string,
  subtextColor: string,
  accentColor: string,
  variant: number,
  colors: { accent: string; accent2: string; textColor: string }
): string {
  const lines = wrapJa(data.title, 9)
  const n = lines.length
  const fs = n === 1 ? 112 : n === 2 ? 96 : n === 3 ? 82 : 70
  const lh = fs * 1.22
  const titleY = Math.round(520 - (n * lh) / 2 + fs * 0.18)

  const catLabel = data.category || ''
  const organizer = data.organizer || ''
  const dateStr = data.date || data.deadline || ''

  // バリアント別デコレーション
  const deco = getDecoration(variant, colors.accent, colors.accent2, colors.textColor, bg.base)

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
<defs>
  <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${bg.base}"/>
    <stop offset="100%" stop-color="${colors.accent2}${variant === 1 ? '00' : 'cc'}"/>
  </linearGradient>
  <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="${accentColor}"/>
    <stop offset="100%" stop-color="${accentColor}66"/>
  </linearGradient>
  <filter id="ts" x="-8%" y="-20%" width="116%" height="140%">
    <feDropShadow dx="0" dy="3" stdDeviation="${variant === 1 ? 4 : 10}"
      flood-color="${variant === 1 ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.95)'}"/>
    ${variant !== 1 ? `<feDropShadow dx="0" dy="0" stdDeviation="20" flood-color="rgba(0,0,0,0.6)"/>` : ''}
  </filter>
  <filter id="gs" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur stdDeviation="40"/>
  </filter>
  <filter id="gs2" x="-10%" y="-10%" width="120%" height="120%">
    <feGaussianBlur stdDeviation="15"/>
  </filter>
</defs>

<!-- 背景 -->
<rect width="1080" height="1080" fill="${bg.base}"/>
<rect width="1080" height="1080" fill="url(#bgGrad)"/>

<!-- デコレーション -->
${deco}

<!-- タイトル -->
${lines.map((line, i) => `<text
  x="540" y="${titleY + i * lh}"
  font-family="'Noto Sans JP','Hiragino Kaku Gothic ProN','Yu Gothic Bold',sans-serif"
  font-size="${fs}" font-weight="900"
  fill="${titleColor}" text-anchor="middle" letter-spacing="3"
  filter="url(#ts)">${esc(line)}</text>`).join('\n')}

<!-- アクセントライン -->
<rect x="${540 - 60}" y="${titleY + n * lh + 16}"
  width="120" height="5" rx="2.5" fill="url(#accent)"/>

<!-- 日付・概要 -->
${dateStr ? `<text x="540" y="${titleY + n * lh + 70}"
  font-family="'Noto Sans JP',sans-serif" font-size="28" font-weight="600"
  fill="${subtextColor}" text-anchor="middle" filter="url(#ts)">${esc(dateStr)}</text>` : ''}

${catLabel ? `
<!-- カテゴリバッジ -->
<rect x="${540 - catLabel.length * 10 - 20}" y="${titleY - fs - 28}"
  width="${catLabel.length * 20 + 40}" height="40" rx="20"
  fill="${accentColor}" opacity="0.25"/>
<text x="540" y="${titleY - fs - 2}"
  font-family="'Noto Sans JP',sans-serif" font-size="18" font-weight="700"
  fill="${accentColor}" text-anchor="middle" opacity="0.90">${esc(catLabel)}</text>` : ''}

<!-- 主催者 -->
${organizer ? `<text x="540" y="${titleY + n * lh + (dateStr ? 110 : 65)}"
  font-family="'Noto Sans JP',sans-serif" font-size="22"
  fill="${subtextColor}" text-anchor="middle" opacity="0.75"
  filter="url(#ts)">${esc(organizer.slice(0, 24))}</text>` : ''}

<!-- LAND ブランディング -->
<text x="48" y="58"
  font-family="Arial,sans-serif" font-size="22" font-weight="900" letter-spacing="5"
  fill="${variant === 1 ? colors.accent2 : titleColor}" opacity="${variant === 1 ? 0.9 : 0.65}">LAND</text>

<!-- @land.tokachi -->
<text x="1032" y="1052"
  font-family="Arial,sans-serif" font-size="17"
  fill="${variant === 1 ? colors.accent2 : titleColor}" text-anchor="end"
  opacity="${variant === 1 ? 0.7 : 0.55}">@land.tokachi</text>
</svg>`
}

// バリアント別デコレーション
function getDecoration(
  variant: number,
  accent: string,
  accent2: string,
  textColor: string,
  base: string
): string {
  switch (variant) {
    case 0: // ボールド・ソリッド: 大きな円＋左上三角
      return `
      <circle cx="880" cy="180" r="280" fill="${accent2}" opacity="0.22" filter="url(#gs)"/>
      <circle cx="150" cy="900" r="220" fill="${textColor}" opacity="0.08" filter="url(#gs)"/>
      <polygon points="0,0 400,0 0,400" fill="${textColor}" opacity="0.06"/>
      <rect x="0" y="0" width="8" height="1080" fill="${textColor}" opacity="0.5"/>
      <rect x="0" y="0" width="1080" height="6" fill="${textColor}" opacity="0.4"/>`

    case 1: // ミニマル・ホワイト: 薄い幾何学線
      return `
      <circle cx="900" cy="540" r="380" fill="none" stroke="${accent2}" stroke-width="1.5" opacity="0.12"/>
      <circle cx="900" cy="540" r="300" fill="none" stroke="${accent2}" stroke-width="1" opacity="0.08"/>
      <rect x="60" y="60" width="960" height="960" rx="40" fill="none" stroke="${accent}" stroke-width="2" opacity="0.10"/>
      <rect x="0" y="0" width="1080" height="8" fill="${accent2}" opacity="0.90"/>
      <rect x="0" y="1072" width="1080" height="8" fill="${accent2}" opacity="0.40"/>`

    case 2: // ダーク・プレミアム: ゴールドライン＋星
      return `
      <circle cx="800" cy="200" r="260" fill="${textColor}" opacity="0.06" filter="url(#gs)"/>
      <circle cx="200" cy="850" r="200" fill="${accent2}" opacity="0.08" filter="url(#gs)"/>
      ${Array.from({length: 20}, (_, i) => {
        const x = [100,200,350,500,650,800,950,150,300,450,600,750,900,80,250,400,550,700,850,1000][i]
        const y = [80,200,50,150,80,120,60,400,320,250,300,350,280,600,550,500,580,530,480,550][i]
        return `<circle cx="${x}" cy="${y}" r="${2 + i % 2}" fill="${textColor}" opacity="${0.3 + (i % 3) * 0.15}"/>`
      }).join('')}
      <rect x="0" y="0" width="1080" height="5" fill="${textColor}" opacity="0.6"/>
      <rect x="0" y="1075" width="1080" height="5" fill="${textColor}" opacity="0.3"/>`

    case 3: // グラデーション・ビビッド: 大きなグロー円
      return `
      <circle cx="600" cy="400" r="350" fill="${textColor}" opacity="0.12" filter="url(#gs)"/>
      <circle cx="400" cy="650" r="280" fill="${accent2}" opacity="0.15" filter="url(#gs)"/>
      <circle cx="880" cy="200" r="180" fill="white" opacity="0.06" filter="url(#gs)"/>
      <polygon points="1080,0 1080,450 650,0" fill="white" opacity="0.05"/>
      <polygon points="0,1080 0,700 350,1080" fill="white" opacity="0.04"/>`

    case 4: // ナチュラル・アース: 有機的な形
      return `
      <ellipse cx="700" cy="250" rx="350" ry="280" fill="${textColor}" opacity="0.12" filter="url(#gs)"/>
      <ellipse cx="300" cy="820" rx="300" ry="240" fill="${accent2}" opacity="0.10" filter="url(#gs)"/>
      <path d="M0,900 Q200,800 400,850 Q600,900 800,830 Q950,780 1080,820 L1080,1080 L0,1080 Z"
        fill="${textColor}" opacity="0.15"/>
      <path d="M0,950 Q250,880 500,920 Q750,960 1080,900 L1080,1080 L0,1080 Z"
        fill="${accent2}" opacity="0.12"/>`

    default:
      return ''
  }
}

function wrapJa(text: string, max: number): string[] {
  const out: string[] = []
  let cur = ''
  for (const ch of text) {
    cur += ch
    if (cur.length >= max) { out.push(cur); cur = '' }
  }
  if (cur) out.push(cur)
  return out
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}
