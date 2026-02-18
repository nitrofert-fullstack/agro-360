import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { User } from "@supabase/supabase-js"

/**
 * Refresca la sesión en cada request y devuelve tanto la respuesta
 * (con cookies actualizadas) como el usuario verificado por el servidor.
 * Usar `user` (no el nombre de cookie) para decidir si hay sesión activa.
 */
export async function updateSession(
  request: NextRequest
): Promise<{ response: NextResponse; user: User | null }> {
  let supabaseResponse = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.warn("[v0] Supabase env vars not configured - skipping session update")
    return { response: supabaseResponse, user: null }
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // getUser() verifica el JWT con el servidor y refresca si es necesario
  const { data: { user } } = await supabase.auth.getUser()

  return { response: supabaseResponse, user }
}
