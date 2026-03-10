import { createClient } from '@/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const response = NextResponse.redirect(new URL('/auth/login', req.url), { status: 302 })
  response.headers.set('Cache-Control', 'no-store')
  return response
}
