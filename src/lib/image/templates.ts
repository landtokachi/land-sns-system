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
 * カテゴリに合ったSVGイラスト背景 + 大きなタイトル文字
 */
export function generateSvgTemplate(data: ImageTextData): string {
  const type = data.template_type
  const bg = getBg(type, data)
  const title = data.title
  const lines = wrapJa(title, 9)
  const n = lines.length
  const fs = n <= 2 ? 108 : n === 3 ? 90 : 76
  const lh = fs * 1.22
  const titleY = Math.round(540 - (n * lh) / 2 + fs * 0.18)

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
<defs>
  ${bg.defs}
  <filter id="ts"><feDropShadow dx="0" dy="3" stdDeviation="10" flood-color="rgba(0,0,0,0.95)"/><feDropShadow dx="0" dy="0" stdDeviation="20" flood-color="rgba(0,0,0,0.6)"/></filter>
  <filter id="gs"><feGaussianBlur stdDeviation="45"/></filter>
  <filter id="gs2"><feGaussianBlur stdDeviation="18"/></filter>
  <linearGradient id="ov" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stop-color="rgba(0,0,0,0.05)"/>
    <stop offset="35%"  stop-color="rgba(0,0,0,0.32)"/>
    <stop offset="65%"  stop-color="rgba(0,0,0,0.60)"/>
    <stop offset="100%" stop-color="rgba(0,0,0,0.78)"/>
  </linearGradient>
  <linearGradient id="tbg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stop-color="rgba(0,0,0,0)"/>
    <stop offset="25%"  stop-color="rgba(0,0,0,0.50)"/>
    <stop offset="50%"  stop-color="rgba(0,0,0,0.68)"/>
    <stop offset="75%"  stop-color="rgba(0,0,0,0.50)"/>
    <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
  </linearGradient>
  <linearGradient id="botfade" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stop-color="rgba(0,0,0,0)"/>
    <stop offset="100%" stop-color="rgba(0,0,0,0.70)"/>
  </linearGradient>
  <linearGradient id="acc" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="${bg.accent}"/>
    <stop offset="100%" stop-color="${bg.accent}88"/>
  </linearGradient>
</defs>

<!-- 背景 -->
${bg.bg}

<!-- 全体ベール -->
<rect width="1080" height="1080" fill="url(#ov)"/>

<!-- テキスト帯（タイトル背後を暗く） -->
<rect x="0" y="${titleY - fs * 0.9}" width="1080" height="${n * lh + fs * 1.2}" fill="url(#tbg)"/>

<!-- 下部フェード（ブランディング用） -->
<rect x="0" y="820" width="1080" height="260" fill="url(#botfade)"/>

<!-- タイトル -->
${lines.map((line, i) => `<text x="540" y="${titleY + i * lh}"
  font-family="'Noto Sans JP','Hiragino Kaku Gothic ProN','Yu Gothic Bold',sans-serif"
  font-size="${fs}" font-weight="900" fill="white"
  text-anchor="middle" letter-spacing="3"
  filter="url(#ts)">${esc(line)}</text>`).join('\n')}

<!-- アクセントライン -->
<rect x="${540 - 52}" y="${titleY + n * lh + 14}" width="104" height="5" rx="2.5" fill="url(#acc)"/>

<!-- LAND（左上） -->
<text x="46" y="58" font-family="Arial,sans-serif" font-size="21" font-weight="900"
  letter-spacing="5" fill="white" opacity="0.65" filter="url(#ts)">LAND</text>

<!-- @land.tokachi（右下） -->
<text x="1034" y="1052" font-family="Arial,sans-serif" font-size="17"
  fill="white" text-anchor="end" opacity="0.55" filter="url(#ts)">@land.tokachi</text>
</svg>`
}

// ─── カテゴリ別背景 ─────────────────────────────────────────────────
function getBg(type: string, _data: ImageTextData) {
  switch (type) {
    case 'subsidy': return subsidyBg()
    case 'event':   return eventBg()
    case 'land':    return landBg()
    case 'business': return businessBg()
    default:        return noticeBg()
  }
}

// ── 補助金: コイン・書類・ビジネス ──────────────────────────────────
function subsidyBg() {
  return {
    accent: '#fbbf24',
    defs: `
    <radialGradient id="c1" cx="72%" cy="22%" r="48%">
      <stop offset="0%" stop-color="#15803d" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#052e16" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="c2" cx="20%" cy="78%" r="42%">
      <stop offset="0%" stop-color="#166534" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#052e16" stop-opacity="0"/>
    </radialGradient>`,
    bg: `
    <!-- ベース深緑 -->
    <rect width="1080" height="1080" fill="#052e16"/>
    <rect width="1080" height="1080" fill="url(#c1)"/>
    <rect width="1080" height="1080" fill="url(#c2)"/>

    <!-- コイン（右上エリア） -->
    ${coins(720, 160, 120, '#fbbf24')}
    ${coins(860, 240, 90, '#f59e0b')}
    ${coins(780, 300, 70, '#fcd34d')}

    <!-- 紙幣/書類のシルエット -->
    ${document(580, 140, 240, 170)}
    ${document(620, 340, 200, 140)}

    <!-- 上昇グラフ -->
    ${chart(60, 120, '#4ade80')}

    <!-- 建物シルエット -->
    ${buildings(0, 700)}

    <!-- グロー -->
    <circle cx="800" cy="200" r="200" fill="#fbbf24" opacity="0.08" filter="url(#gs)"/>
    <circle cx="150" cy="850" r="160" fill="#16a34a" opacity="0.10" filter="url(#gs)"/>`,
  }
}

// ── イベント: 人々・ステージ・光 ────────────────────────────────────
function eventBg() {
  return {
    accent: '#818cf8',
    defs: `
    <radialGradient id="e1" cx="50%" cy="0%" r="55%">
      <stop offset="0%" stop-color="#312e81" stop-opacity="1"/>
      <stop offset="100%" stop-color="#0f0a1e" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="e2" cx="50%" cy="100%" r="50%">
      <stop offset="0%" stop-color="#1e1b4b" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#0f0a1e" stop-opacity="0"/>
    </radialGradient>`,
    bg: `
    <!-- ベース -->
    <rect width="1080" height="1080" fill="#0f0a1e"/>
    <rect width="1080" height="1080" fill="url(#e1)"/>
    <rect width="1080" height="1080" fill="url(#e2)"/>

    <!-- ステージ照明（スポットライト） -->
    ${spotlight(200, 0, '#a78bfa', 0.18)}
    ${spotlight(540, 0, '#818cf8', 0.22)}
    ${spotlight(880, 0, '#c4b5fd', 0.16)}
    ${spotlight(340, 0, '#6366f1', 0.12)}
    ${spotlight(720, 0, '#8b5cf6', 0.14)}

    <!-- 聴衆シルエット（下部） -->
    ${audience(0, 840)}

    <!-- 星/光の粒 -->
    ${stars()}

    <!-- グロー -->
    <circle cx="540" cy="100" r="250" fill="#6366f1" opacity="0.12" filter="url(#gs)"/>
    <circle cx="540" cy="900" r="200" fill="#4338ca" opacity="0.15" filter="url(#gs)"/>`,
  }
}

// ── LAND: 北海道の大地・自然・コミュニティ ─────────────────────────
function landBg() {
  return {
    accent: '#fcd34d',
    defs: `
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0c1445"/>
      <stop offset="40%" stop-color="#1e3a6e"/>
      <stop offset="70%" stop-color="#7c3d10"/>
      <stop offset="100%" stop-color="#451a03"/>
    </linearGradient>`,
    bg: `
    <!-- 空グラデーション -->
    <rect width="1080" height="1080" fill="url(#sky)"/>

    <!-- 地平線の光 -->
    <ellipse cx="540" cy="580" rx="600" ry="120" fill="#f97316" opacity="0.25" filter="url(#gs)"/>
    <ellipse cx="540" cy="560" rx="400" ry="80" fill="#fbbf24" opacity="0.20" filter="url(#gs)"/>

    <!-- 十勝の大地シルエット -->
    ${hokkaido(0, 600)}

    <!-- 星空 -->
    ${stars()}

    <!-- 月 -->
    <circle cx="820" cy="140" r="70" fill="#fef9c3" opacity="0.85"/>
    <circle cx="840" cy="128" r="70" fill="#1e3a6e" opacity="0.85"/>

    <!-- 山のシルエット -->
    ${mountains(0, 620)}

    <!-- グロー -->
    <circle cx="540" cy="560" rx="400" ry="80" fill="#f59e0b" opacity="0.15" filter="url(#gs)"/>`,
  }
}

// ── 事業者紹介: 人・ビジネス・プロフェッショナル ─────────────────
function businessBg() {
  return {
    accent: '#c4b5fd',
    defs: `
    <radialGradient id="b1" cx="40%" cy="30%" r="55%">
      <stop offset="0%" stop-color="#2e1065"/>
      <stop offset="100%" stop-color="#0c0514" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="b2" cx="70%" cy="70%" r="45%">
      <stop offset="0%" stop-color="#4c1d95"/>
      <stop offset="100%" stop-color="#0c0514" stop-opacity="0"/>
    </radialGradient>`,
    bg: `
    <!-- ベース -->
    <rect width="1080" height="1080" fill="#0c0514"/>
    <rect width="1080" height="1080" fill="url(#b1)"/>
    <rect width="1080" height="1080" fill="url(#b2)"/>

    <!-- 人物シルエット（後ろ姿・プレゼン） -->
    ${personSilhouette(540, 650, 200, '#a78bfa', 0.30)}
    ${personSilhouette(300, 700, 140, '#8b5cf6', 0.18)}
    ${personSilhouette(780, 720, 160, '#7c3aed', 0.20)}

    <!-- ネットワーク/接続ライン -->
    ${network()}

    <!-- 都市の光（下部） -->
    ${cityLights(0, 800)}

    <!-- グロー -->
    <circle cx="540" cy="600" r="280" fill="#8b5cf6" opacity="0.10" filter="url(#gs)"/>
    <circle cx="200" cy="200" r="180" fill="#7c3aed" opacity="0.12" filter="url(#gs)"/>`,
  }
}

// ── お知らせ: 動的・情報・デジタル ─────────────────────────────────
function noticeBg() {
  return {
    accent: '#38bdf8',
    defs: `
    <radialGradient id="n1" cx="60%" cy="25%" r="50%">
      <stop offset="0%" stop-color="#075985"/>
      <stop offset="100%" stop-color="#020617" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="n2" cx="30%" cy="75%" r="45%">
      <stop offset="0%" stop-color="#0c4a6e"/>
      <stop offset="100%" stop-color="#020617" stop-opacity="0"/>
    </radialGradient>`,
    bg: `
    <!-- ベース -->
    <rect width="1080" height="1080" fill="#020617"/>
    <rect width="1080" height="1080" fill="url(#n1)"/>
    <rect width="1080" height="1080" fill="url(#n2)"/>

    <!-- デジタルグリッド -->
    ${grid()}

    <!-- 情報パーティクル -->
    ${particles()}

    <!-- グロー -->
    <circle cx="700" cy="200" r="220" fill="#0ea5e9" opacity="0.12" filter="url(#gs)"/>
    <circle cx="300" cy="800" r="180" fill="#0284c7" opacity="0.10" filter="url(#gs)"/>`,
  }
}

// ─── SVG 描画ヘルパー ────────────────────────────────────────────────

function coins(cx: number, cy: number, r: number, color: string): string {
  return `
  <ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 0.28}" fill="${color}" opacity="0.80"/>
  <ellipse cx="${cx}" cy="${cy - r * 0.18}" rx="${r}" ry="${r * 0.28}" fill="${color}" opacity="0.72"/>
  <ellipse cx="${cx}" cy="${cy - r * 0.36}" rx="${r}" ry="${r * 0.28}" fill="${color}" opacity="0.64"/>
  <ellipse cx="${cx}" cy="${cy - r * 0.54}" rx="${r}" ry="${r * 0.28}" fill="${color}" opacity="0.56"/>
  <text x="${cx}" y="${cy - r * 0.36}" font-size="${r * 0.5}" text-anchor="middle"
    dominant-baseline="middle" font-weight="900" fill="rgba(0,0,0,0.5)">¥</text>`
}

function document(x: number, y: number, w: number, h: number): string {
  return `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8"
    fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
  <rect x="${x + 16}" y="${y + 18}" width="${w * 0.65}" height="8" rx="4" fill="rgba(255,255,255,0.20)"/>
  <rect x="${x + 16}" y="${y + 36}" width="${w * 0.80}" height="6" rx="3" fill="rgba(255,255,255,0.13)"/>
  <rect x="${x + 16}" y="${y + 50}" width="${w * 0.70}" height="6" rx="3" fill="rgba(255,255,255,0.13)"/>
  <rect x="${x + 16}" y="${y + 64}" width="${w * 0.55}" height="6" rx="3" fill="rgba(255,255,255,0.10)"/>
  <rect x="${x + 16}" y="${y + 78}" width="${w * 0.75}" height="6" rx="3" fill="rgba(255,255,255,0.10)"/>
  <rect x="${x + 16}" y="${y + 92}" width="${w * 0.40}" height="6" rx="3" fill="rgba(255,255,255,0.10)"/>`
}

function chart(x: number, y: number, color: string): string {
  const pts = [[0,200],[80,180],[160,140],[240,160],[320,100],[400,80],[480,50],[560,30]]
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x + p[0]},${y + p[1]}`).join(' ')
  const fill = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x + p[0]},${y + p[1]}`).join(' ')
    + ` L${x + 560},${y + 260} L${x},${y + 260} Z`
  return `
  <path d="${fill}" fill="${color}" opacity="0.08"/>
  <path d="${path}" fill="none" stroke="${color}" stroke-width="3" opacity="0.55"/>
  ${pts.map(p => `<circle cx="${x + p[0]}" cy="${y + p[1]}" r="5" fill="${color}" opacity="0.70"/>`).join('')}`
}

function buildings(x: number, y: number): string {
  const blds = [
    { w: 80, h: 220, lx: 80 },{ w: 60, h: 160, lx: 170 },
    { w: 100, h: 300, lx: 240 },{ w: 70, h: 180, lx: 350 },
    { w: 50, h: 140, lx: 430 },{ w: 90, h: 260, lx: 490 },
    { w: 65, h: 200, lx: 590 },{ w: 110, h: 340, lx: 670 },
    { w: 55, h: 150, lx: 790 },{ w: 80, h: 220, lx: 860 },
    { w: 70, h: 190, lx: 950 },
  ]
  return blds.map(b =>
    `<rect x="${x + b.lx}" y="${y - b.h}" width="${b.w}" height="${b.h}"
      fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`
  ).join('')
}

function spotlight(cx: number, cy: number, color: string, op: number): string {
  return `<path d="M${cx - 15},${cy} L${cx + 15},${cy} L${cx + 200},1080 L${cx - 200},1080 Z"
    fill="${color}" opacity="${op}"/>`
}

function audience(x: number, y: number): string {
  const heads = []
  for (let i = 0; i < 25; i++) {
    const hx = x + 30 + i * 42 + (i % 2) * 20
    const hy = y + (i % 3) * 18
    const hr = 16 + (i % 3) * 4
    heads.push(`<ellipse cx="${hx}" cy="${hy}" rx="${hr}" ry="${hr * 1.1}"
      fill="rgba(255,255,255,0.12)"/>`)
    heads.push(`<rect x="${hx - hr * 0.8}" y="${hy + hr * 0.8}" width="${hr * 1.6}" height="${hr * 2}"
      rx="${hr * 0.5}" fill="rgba(255,255,255,0.08)"/>`)
  }
  return heads.join('')
}

function stars(): string {
  const pts = []
  const positions = [
    [100,80],[200,40],[350,100],[450,60],[600,30],[700,90],[800,50],[950,80],[1020,30],
    [150,200],[400,180],[650,160],[900,200],[80,300],[300,280],[750,260],[1000,300],
    [220,150],[500,120],[770,140],[1050,170],[50,400],[450,380],[850,360],
  ]
  for (const [px, py] of positions) {
    const r = 1.5 + Math.random() * 2
    pts.push(`<circle cx="${px}" cy="${py}" r="${r}" fill="white" opacity="${0.4 + Math.random() * 0.5}"/>`)
  }
  return pts.join('')
}

function hokkaido(x: number, y: number): string {
  // 十勝の大地を象徴する丘のシルエット
  return `
  <path d="M${x},${y + 480} Q${x + 150},${y + 300} ${x + 280},${y + 360}
    Q${x + 400},${y + 250} ${x + 540},${y + 280}
    Q${x + 680},${y + 200} ${x + 820},${y + 260}
    Q${x + 950},${y + 200} ${x + 1080},${y + 240}
    L${x + 1080},${y + 480} Z"
    fill="rgba(0,0,0,0.55)"/>
  <path d="M${x},${y + 480} Q${x + 160},${y + 380} ${x + 320},${y + 410}
    Q${x + 480},${y + 340} ${x + 600},${y + 360}
    Q${x + 750},${y + 310} ${x + 900},${y + 340}
    Q${x + 1000},${y + 310} ${x + 1080},${y + 320}
    L${x + 1080},${y + 480} Z"
    fill="rgba(5,46,22,0.7)"/>
  <!-- 木々のシルエット -->
  ${Array.from({length: 12}, (_, i) => {
    const tx = 60 + i * 88, th = 40 + (i % 3) * 20
    return `<polygon points="${tx},${y + 350} ${tx - 20},${y + 400} ${tx + 20},${y + 400}"
      fill="rgba(5,46,22,0.8)"/>`
  }).join('')}`
}

function mountains(x: number, y: number): string {
  return `
  <polygon points="${x + 500},${y - 200} ${x + 300},${y + 60} ${x + 700},${y + 60}"
    fill="rgba(0,0,0,0.50)"/>
  <polygon points="${x + 700},${y - 150} ${x + 550},${y + 60} ${x + 850},${y + 60}"
    fill="rgba(0,0,0,0.40)"/>
  <polygon points="${x + 300},${y - 100} ${x + 150},${y + 60} ${x + 450},${y + 60}"
    fill="rgba(0,0,0,0.45)"/>
  <!-- 雪 -->
  <polygon points="${x + 500},${y - 200} ${x + 460},${y - 140} ${x + 540},${y - 140}"
    fill="rgba(255,255,255,0.70)"/>`
}

function personSilhouette(cx: number, cy: number, scale: number, color: string, op: number): string {
  const s = scale / 100
  return `
  <!-- 頭 -->
  <circle cx="${cx}" cy="${cy - scale * 1.4}" r="${scale * 0.28}"
    fill="${color}" opacity="${op}"/>
  <!-- 体 -->
  <path d="M${cx - scale * 0.35},${cy - scale * 1.1}
    Q${cx},${cy - scale * 0.85} ${cx + scale * 0.35},${cy - scale * 1.1}
    L${cx + scale * 0.28},${cy - scale * 0.2}
    Q${cx},${cy} ${cx - scale * 0.28},${cy - scale * 0.2} Z"
    fill="${color}" opacity="${op * 0.85}"/>
  <!-- 腕（上げている） -->
  <path d="M${cx - scale * 0.35},${cy - scale * 0.9} Q${cx - scale * 0.7},${cy - scale * 1.4} ${cx - scale * 0.5},${cy - scale * 1.6}"
    fill="none" stroke="${color}" stroke-width="${scale * 0.12}" stroke-linecap="round" opacity="${op}"/>
  <!-- 脚 -->
  <line x1="${cx - scale * 0.14}" y1="${cy - scale * 0.2}" x2="${cx - scale * 0.2}" y2="${cy + scale * 0.5}"
    stroke="${color}" stroke-width="${scale * 0.14}" stroke-linecap="round" opacity="${op}"/>
  <line x1="${cx + scale * 0.14}" y1="${cy - scale * 0.2}" x2="${cx + scale * 0.2}" y2="${cy + scale * 0.5}"
    stroke="${color}" stroke-width="${scale * 0.14}" stroke-linecap="round" opacity="${op}"/>`
}

function network(): string {
  const nodes = [[200,200],[400,300],[600,180],[800,280],[350,450],[650,400],[900,150],[150,500]]
  const lines = [[0,1],[1,2],[2,3],[0,4],[1,4],[2,5],[3,5],[3,6],[4,5],[5,7]]
  return [
    ...lines.map(([a, b]) =>
      `<line x1="${nodes[a][0]}" y1="${nodes[a][1]}" x2="${nodes[b][0]}" y2="${nodes[b][1]}"
        stroke="#a78bfa" stroke-width="1" opacity="0.20"/>`
    ),
    ...nodes.map(([nx, ny]) =>
      `<circle cx="${nx}" cy="${ny}" r="5" fill="#c4b5fd" opacity="0.35"/>`
    ),
  ].join('')
}

function cityLights(x: number, y: number): string {
  const lights = []
  for (let i = 0; i < 40; i++) {
    const lx = x + Math.random() * 1080
    const ly = y + Math.random() * 200
    const r = 1 + Math.random() * 3
    const colors = ['#fbbf24', '#60a5fa', '#f0abfc', '#34d399', '#fb923c']
    lights.push(`<circle cx="${lx}" cy="${ly}" r="${r}"
      fill="${colors[i % colors.length]}" opacity="${0.3 + Math.random() * 0.5}"/>`)
  }
  return lights.join('')
}

function grid(): string {
  const lines = []
  for (let i = 0; i <= 12; i++) {
    const x = i * 90
    lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="1080" stroke="#0ea5e9" stroke-width="0.5" opacity="0.08"/>`)
  }
  for (let i = 0; i <= 12; i++) {
    const y = i * 90
    lines.push(`<line x1="0" y1="${y}" x2="1080" y2="${y}" stroke="#0ea5e9" stroke-width="0.5" opacity="0.08"/>`)
  }
  return lines.join('')
}

function particles(): string {
  const pts = []
  const positions = [
    [150,150,4],[350,200,3],[600,120,5],[800,180,3],[100,350,4],
    [400,400,3],[700,320,4],[950,250,3],[200,550,5],[500,500,3],
    [850,450,4],[1000,380,3],[300,700,4],[650,680,3],[900,620,5],
    [120,750,3],[480,800,4],[750,750,3],[980,700,4],
  ]
  for (const [px, py, pr] of positions) {
    pts.push(`<circle cx="${px}" cy="${py}" r="${pr}" fill="#38bdf8" opacity="${0.25 + Math.random() * 0.35}"/>`)
  }
  return pts.join('')
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
