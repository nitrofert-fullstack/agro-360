import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Rutas que requieren autenticacion obligatoria
const protectedRoutes = [
  '/admin',
  '/dashboard',
  '/formulario',
  '/profile',
  '/settings'
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Siempre refrescar la sesion en todas las rutas (con try-catch para seguridad)
  let response
  try {
    response = await updateSession(request)
  } catch (err) {
    console.warn("[v0] Error in updateSession:", err)
    response = NextResponse.next({ request })
  }
  
  // Verificar si es ruta protegida
  const isProtectedRoute = protectedRoutes.some(
    route => pathname === route || pathname.startsWith(route + '/')
  )

  if (isProtectedRoute) {
    // Verificar sesion via cookies de Supabase
    const allCookies = request.cookies.getAll()
    const hasAuthToken = allCookies.some(c => c.name.includes('auth-token'))
    
    if (!hasAuthToken) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return Response.redirect(loginUrl)
    }
  }

  // Si esta en login y ya tiene sesion, redirigir a dashboard
  if (pathname === '/auth/login' || pathname === '/login') {
    const allCookies = request.cookies.getAll()
    const hasAuthToken = allCookies.some(c => c.name.includes('auth-token'))
    
    if (hasAuthToken) {
      return Response.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
