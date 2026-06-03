import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// スタッフ登録API（管理者のみ使用）
export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { staff_id, pin, name } = await request.json()

    if (!staff_id || !pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'スタッフIDと4桁のPINが必要です' }, { status: 400 })
    }

    const email = `${staff_id.toLowerCase()}@land.internal`
    const password = `pin_${pin}_land`

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: name || staff_id, staff_id },
    })

    if (error) throw error

    return NextResponse.json({ success: true, user_id: data.user.id })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create staff'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
