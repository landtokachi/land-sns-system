import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const adminSupabase = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const LAND_PRIORITY: Record<string, string> = {
  '\u88dc\u52a9\u91d1\u30fb\u52a9\u6210\u91d1\u30fb\u652f\u63f4\u5236\u5ea6': 'high',
  '\u30a4\u30d9\u30f3\u30c8\u30fb\u30bb\u30df\u30ca\u30fc': 'high',
  'LAND\u306e\u53d6\u308a\u7d44\u307f': 'high',
  '\u3068\u304b\u3061\u8ca1\u56e3\u306e\u53d6\u308a\u7d44\u307f': 'high',
  '\u304a\u77e5\u3089\u305b\u30fb\u52df\u96c6': 'medium',
  '\u4e8b\u696d\u8005\u7d39\u4ecb': 'medium',
  '\u6d3b\u52d5\u30ec\u30dd\u30fc\u30c8': 'medium',
  '\u5b66\u751f\u8d77\u696d\u652f\u63f4': 'medium',
  '\u63a1\u629e\u8005\u30fb\u5352\u696d\u751f\u30fb\u652f\u63f4\u5148\u306e\u305d\u306e\u5f8c': 'medium',
  '\u30b3\u30e9\u30e0\u30fb\u30ce\u30a6\u30cf\u30a6': 'low',
}

function extractTextFromHtml(html: string): string {
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  text = text.replace(/<[^>]+>/g, ' ')
  return text.replace(/\s+/g, ' ').trim().slice(0, 5000)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json().catch(() => ({}))
    const igHandle = (body as { handle?: string }).handle || 'land.tokachi'
    const applyToAll = (body as { applyToAll?: boolean }).applyToAll || false

    let igPageText = ''
    try {
      const res = await fetch('https://www.instagram.com/' + igHandle + '/', {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LANDBot/1.0)' },
        signal: AbortSignal.timeout(8000),
      })
      if (res.ok) igPageText = extractTextFromHtml(await res.text())
    } catch { /* use preloaded knowledge */ }

    const igInfo = [
      '@land.tokachi Instagram analysis (1601 posts, 1444 followers):',
      '- Highlights: KAIKON, TokachAgri, TokachiEGG, Bakufu2023, TIP, Tokachiname',
      '- Most frequent: grants/subsidies (with deadlines), local seminars/events',
      '- Regular: LAND programs (REALIZE CAFE, 4 stages), startup info',
      '- Occasional: agri/food industry, entrepreneurship columns',
      igPageText ? 'Live page text: ' + igPageText.slice(0, 1000) : '(live fetch not available)',
    ].join('\n')

    const prompt = 'You are an SNS strategy analyst for LAND startup support facility in Tokachi, Hokkaido.\n' +
      'Analyze the Instagram posting patterns of @' + igHandle + ' and return priority weights.\n\n' +
      'Known information:\n' + igInfo + '\n\n' +
      'Return JSON only:\n' +
      '{' +
      '  "insights": ["pattern1", "pattern2", "pattern3"],' +
      '  "top_categories": ["cat1", "cat2", "cat3"],' +
      '  "priority_weights": {' +
      '    "\u88dc\u52a9\u91d1\u30fb\u52a9\u6210\u91d1\u30fb\u652f\u63f4\u5236\u5ea6": "high",' +
      '    "\u30a4\u30d9\u30f3\u30c8\u30fb\u30bb\u30df\u30ca\u30fc": "high",' +
      '    "LAND\u306e\u53d6\u308a\u7d44\u307f": "high",' +
      '    "\u3068\u304b\u3061\u8ca1\u56e3\u306e\u53d6\u308a\u7d44\u307f": "high",' +
      '    "\u304a\u77e5\u3089\u305b\u30fb\u52df\u96c6": "medium",' +
      '    "\u30b3\u30e9\u30e0\u30fb\u30ce\u30a6\u30cf\u30a6": "low"' +
      '  },' +
      '  "recommendation": "strategy advice in Japanese (100 chars)"' +
      '}'

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    })

    const analysis = JSON.parse(response.choices[0].message.content || '{}')
    const weights: Record<string, string> = analysis.priority_weights || LAND_PRIORITY

    let updatedCount = 0
    if (applyToAll) {
      const { data: candidates } = await adminSupabase
        .from('post_candidates')
        .select('id, category, priority')
        .eq('status', 'unconfirmed')

      if (candidates && candidates.length > 0) {
        const updates = candidates
          .filter((c: { category: string; priority: string }) => c.category && weights[c.category] && weights[c.category] !== c.priority)
          .map((c: { id: string; category: string }) => ({ id: c.id, priority: weights[c.category] }))
        for (const update of updates) {
          await adminSupabase.from('post_candidates').update({ priority: update.priority }).eq('id', update.id)
        }
        updatedCount = updates.length
      }
    }

    return NextResponse.json({ analysis, priority_weights: weights, updated_count: updatedCount })
  } catch (error) {
    console.error('instagram-priority error:', error)
    return NextResponse.json({ error: '\u5206\u6790\u306b\u5931\u6557\u3057\u307e\u3057\u305f' }, { status: 500 })
  }
}
