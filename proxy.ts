import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Rutas que requieren autenticacion obligatoria
const protectedRoutes = [
  '/admin',
  '/dashboard',
  '/consultar',
  '/profile',
  '/settings'
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Refrescar sesión y obtener el usuario verificado por el servidor
  let response: NextResponse
  let user = null
  try {
    const result = await updateSession(request)
    response = result.response
    user = result.user
  } catch (err) {
    console.warn("[v0] Error in updateSession:", err)
    response = NextResponse.next({ request })
  }

  // Verificar si es ruta protegida
  const isProtectedRoute = protectedRoutes.some(
    route => pathname === route || pathname.startsWith(route + '/')
  )

  if (isProtectedRoute && !user) {
    // Sin sesión válida → redirigir al login
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return Response.redirect(loginUrl)
  }

  // Si está en login pero ya tiene sesión válida → redirigir al dashboard
  if ((pathname === '/auth/login' || pathname === '/login') && user) {
    return Response.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
