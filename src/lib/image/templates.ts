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

/**
 * SNS投稿用画像テンプレート
 * - タイトルを大きく・中央に
 * - 美しい背景グラデーションのみ
 * - 余計な情報は載せない
 * - @land.tokachi のみ小さく
 */

const THEMES = {
  subsidy: {
    // 深いグリーン〜ティール（補助金）
    stops: [
      { offset: '0%',   color: '#064e3b' },
      { offset: '35%',  color: '#065f46' },
      { offset: '65%',  color: '#0f4c3a' },
      { offset: '100%', color: '#022c22' },
    ],
    glow1: { cx: '75%', cy: '15%', color: '#34d399', opacity: 0.30 },
    glow2: { cx: '20%', cy: '85%', color: '#059669', opacity: 0.22 },
    glow3: { cx: '50%', cy: '50%', color: '#10b981', opacity: 0.10 },
    accent: '#6ee7b7',
    label: '補助金・助成金',
  },
  event: {
    // 深いブルー〜インディゴ（イベント）
    stops: [
      { offset: '0%',   color: '#0c1445' },
      { offset: '30%',  color: '#1e1b75' },
      { offset: '65%',  color: '#1a1060' },
      { offset: '100%', color: '#060920' },
    ],
    glow1: { cx: '70%', cy: '20%', color: '#818cf8', opacity: 0.35 },
    glow2: { cx: '25%', cy: '80%', color: '#6366f1', opacity: 0.25 },
    glow3: { cx: '55%', cy: '45%', color: '#a5b4fc', opacity: 0.12 },
    accent: '#c7d2fe',
    label: 'イベント・セミナー',
  },
  land: {
    // ゴールド〜ダークブラウン（LAND）
    stops: [
      { offset: '0%',   color: '#451a03' },
      { offset: '30%',  color: '#7c2d12' },
      { offset: '65%',  color: '#92400e' },
      { offset: '100%', color: '#1c0a00' },
    ],
    glow1: { cx: '72%', cy: '18%', color: '#fbbf24', opacity: 0.32 },
    glow2: { cx: '22%', cy: '82%', color: '#f59e0b', opacity: 0.24 },
    glow3: { cx: '50%', cy: '50%', color: '#fcd34d', opacity: 0.10 },
    accent: '#fde68a',
    label: 'LANDの取り組み',
  },
  business: {
    // ディープパープル（事業者紹介）
    stops: [
      { offset: '0%',   color: '#2e1065' },
      { offset: '30%',  color: '#4c1d95' },
      { offset: '65%',  color: '#3b0764' },
      { offset: '100%', color: '#0f0520' },
    ],
    glow1: { cx: '68%', cy: '20%', color: '#c4b5fd', opacity: 0.35 },
    glow2: { cx: '25%', cy: '78%', color: '#a78bfa', opacity: 0.25 },
    glow3: { cx: '50%', cy: '50%', color: '#ddd6fe', opacity: 0.10 },
    accent: '#ede9fe',
    label: '事業者紹介',
  },
  notice: {
    // ディープブルー〜シアン（お知らせ）
    stops: [
      { offset: '0%',   color: '#0c4a6e' },
      { offset: '30%',  color: '#075985' },
      { offset: '65%',  color: '#0369a1' },
      { offset: '100%', color: '#042f4b' },
    ],
    glow1: { cx: '70%', cy: '18%', color: '#38bdf8', opacity: 0.35 },
    glow2: { cx: '22%', cy: '82%', color: '#0ea5e9', opacity: 0.25 },
    glow3: { cx: '50%', cy: '50%', color: '#7dd3fc', opacity: 0.10 },
    accent: '#bae6fd',
    label: 'お知らせ',
  },
} as const

type TKey = keyof typeof THEMES

export function generateSvgTemplate(data: ImageTextData): string {
  const key: TKey = (data.template_type in THEMES ? data.template_type : 'notice') as TKey
  const t = THEMES[key]

  // ── タイトルを折り返す（8文字 / 行）──
  const lines = wrapJa(data.title, 8)
  const n = lines.length

  // ── フォントサイズ（行数に応じて最適化）──
  const fs = n === 1 ? 120 : n === 2 ? 104 : n === 3 ? 88 : 74
  const lh = fs * 1.25

  // タイトルブロック全体の高さ
  const totalH = n * lh
  // 中央配置（少し上寄り）
  const startY = Math.round(540 - totalH / 2 + fs * 0.15)

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
<defs>

  <!-- ── 背景グラデーション ── -->
  <linearGradient id="bg" x1="0.1" y1="0" x2="0.9" y2="1">
    ${t.stops.map(s => `<stop offset="${s.offset}" stop-color="${s.color}"/>`).join('\n    ')}
  </linearGradient>

  <!-- ── グロー（光の玉） ── -->
  <radialGradient id="glow1" cx="${t.glow1.cx}" cy="${t.glow1.cy}" r="42%">
    <stop offset="0%"   stop-color="${t.glow1.color}" stop-opacity="${t.glow1.opacity}"/>
    <stop offset="100%" stop-color="${t.glow1.color}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="glow2" cx="${t.glow2.cx}" cy="${t.glow2.cy}" r="38%">
    <stop offset="0%"   stop-color="${t.glow2.color}" stop-opacity="${t.glow2.opacity}"/>
    <stop offset="100%" stop-color="${t.glow2.color}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="glow3" cx="${t.glow3.cx}" cy="${t.glow3.cy}" r="32%">
    <stop offset="0%"   stop-color="${t.glow3.color}" stop-opacity="${t.glow3.opacity}"/>
    <stop offset="100%" stop-color="${t.glow3.color}" stop-opacity="0"/>
  </radialGradient>

  <!-- ── テキストシャドウ ── -->
  <filter id="shadow" x="-10%" y="-20%" width="120%" height="140%">
    <feDropShadow dx="0" dy="4" stdDeviation="12" flood-color="rgba(0,0,0,0.85)"/>
  </filter>

  <!-- ── グロー blur ── -->
  <filter id="gBlur">
    <feGaussianBlur stdDeviation="55"/>
  </filter>
  <filter id="gBlurSoft">
    <feGaussianBlur stdDeviation="20"/>
  </filter>

  <!-- ── アクセントグラデーション（下線用） ── -->
  <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%"   stop-color="${t.accent}" stop-opacity="1"/>
    <stop offset="100%" stop-color="${t.accent}" stop-opacity="0"/>
  </linearGradient>

</defs>

<!-- ===========================
     BACKGROUND
     =========================== -->

<!-- ベース -->
<rect width="1080" height="1080" fill="url(#bg)"/>

<!-- グロー球体 -->
<rect width="1080" height="1080" fill="url(#glow1)"/>
<rect width="1080" height="1080" fill="url(#glow2)"/>
<rect width="1080" height="1080" fill="url(#glow3)"/>

<!-- 円形の光（大） -->
<circle cx="810" cy="185" r="300" fill="${t.glow1.color}" opacity="0.07" filter="url(#gBlur)"/>
<circle cx="220" cy="880" r="260" fill="${t.glow2.color}" opacity="0.08" filter="url(#gBlur)"/>

<!-- 幾何学的ライン装飾 -->
<circle cx="960" cy="110" r="140" fill="none" stroke="${t.accent}" stroke-width="1.5" opacity="0.20"/>
<circle cx="960" cy="110" r="90"  fill="none" stroke="${t.accent}" stroke-width="0.8" opacity="0.13"/>
<circle cx="120" cy="970" r="110" fill="none" stroke="${t.accent}" stroke-width="1.2" opacity="0.15"/>

<!-- 右上コーナー三角装飾 -->
<polygon points="1080,0 1080,380 720,0" fill="${t.accent}" opacity="0.06"/>

<!-- 左下コーナー装飾 -->
<polygon points="0,1080 0,750 300,1080" fill="${t.glow2.color}" opacity="0.05"/>

<!-- ===========================
     TITLE エリア
     =========================== -->

<!-- タイトル白テキスト（超大文字） -->
${lines.map((line, i) => `
<text
  x="540"
  y="${startY + i * lh}"
  font-family="'Noto Sans JP','Hiragino Kaku Gothic ProN','Yu Gothic Bold',sans-serif"
  font-size="${fs}"
  font-weight="900"
  fill="white"
  text-anchor="middle"
  letter-spacing="4"
  filter="url(#shadow)"
>${esc(line)}</text>`).join('')}

<!-- アクセントライン（タイトル直下） -->
<rect
  x="${Math.round(540 - 50)}"
  y="${startY + n * lh + 8}"
  width="100" height="4" rx="2"
  fill="${t.accent}" opacity="0.8"/>

<!-- ===========================
     BRANDING（最小限）
     =========================== -->

<!-- 左上: LAND -->
<text
  x="44" y="56"
  font-family="Arial,sans-serif"
  font-size="22" font-weight="900" letter-spacing="5"
  fill="${t.accent}" opacity="0.6">LAND</text>

<!-- 右下: @land.tokachi -->
<text
  x="1036" y="1054"
  font-family="Arial,sans-serif"
  font-size="18"
  fill="${t.accent}"
  text-anchor="end"
  opacity="0.5">@land.tokachi</text>

</svg>`
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
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}
