"use client"

import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js'

function translateAuthError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid login credentials') || m.includes('invalid credentials')) return 'Correo o contraseña incorrectos'
  if (m.includes('email not confirmed')) return 'Debes confirmar tu correo antes de iniciar sesión'
  if (m.includes('user not found')) return 'No existe una cuenta con ese correo'
  if (m.includes('too many requests') || m.includes('rate limit')) return 'Demasiados intentos. Espera unos minutos e intenta de nuevo'
  if (m.includes('network') || m.includes('fetch')) return 'Error de conexión. Verifica tu internet'
  if (m.includes('password')) return 'La contraseña no cumple los requisitos mínimos'
  if (m.includes('email')) return 'El correo ingresado no es válido'
  return 'Error al iniciar sesión. Intenta de nuevo'
}

interface Profile {
  id: string
  email: string
  nombre_completo: string
  telefono: string | null
  rol: 'admin' | 'asesor' | 'agricultor' | 'analista'
  activo: boolean
  numero_documento: string | null
}

interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<{ data: unknown; error: string | null }>
  signUp: (email: string, password: string, metadata: { nombre_completo: string; telefono?: string }) => Promise<{ data: unknown; error: string | null }>
  signOut: () => Promise<{ error: string | null }>
  resetPassword: (email: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState({
    user: null as User | null,
    session: null as Session | null,
    loading: true,
    error: null as string | null,
  })
  const [profile, setProfile] = useState<Profile | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const fetchProfile = useCallback(async (user: User) => {
    if (!supabase) return
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (data) setProfile(data as Profile)
    } catch {
      // Si falla, el perfil queda null — el usuario verá la sesión activa pero sin datos de perfil
    }
  }, [supabase])

  useEffect(() => {
    if (!supabase) {
      setState(prev => ({ ...prev, loading: false, error: 'Supabase not configured' }))
      return
    }

    const getInitialSession = async () => {
      try {
        // getSession() lee de las cookies/localStorage — sin petición de red
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          // Si el refresh token guardado es inválido, limpiarlo y arrancar sin sesión
          if (error.message?.includes('Refresh Token') || (error as { code?: string }).code === 'refresh_token_not_found') {
            await supabase.auth.signOut()
            setState(prev => ({ ...prev, user: null, session: null, loading: false }))
            return
          }
          throw error
        }

        // Parar el loading INMEDIATAMENTE — getSession() lee de localStorage sin red
        setState(prev => ({
          ...prev,
          user: session?.user ?? null,
          session,
          loading: false,
        }))

        // Cargar perfil en segundo plano sin bloquear la UI
        if (session?.user) {
          fetchProfile(session.user)
        }
      } catch (err) {
        setState(prev => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Error obteniendo sesión',
          loading: false,
        }))
      }
    }

    getInitialSession()

    // Escuchar cambios de auth (login, logout, refresco de token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        // TOKEN_REFRESHED con sesión nula = refresh token inválido → limpiar
        if (event === 'TOKEN_REFRESHED' && !session) {
          supabase.auth.signOut()
          setProfile(null)
          setState(prev => ({ ...prev, user: null, session: null, loading: false }))
          return
        }

        // Actualizar estado INMEDIATAMENTE sin bloquear en fetchProfile
        setState(prev => ({
          ...prev,
          user: session?.user ?? null,
          session,
          loading: false,
        }))

        // Cargar perfil solo en eventos relevantes (no en TOKEN_REFRESHED ni PASSWORD_RECOVERY)
        if (session?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION')) {
          fetchProfile(session.user)
        } else if (!session) {
          setProfile(null)
        }
      }
    )

    // Refrescar sesión cuando el usuario vuelve a la pestaña (solo si el token expira pronto)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.expires_at) {
            const nowSec = Math.floor(Date.now() / 1000)
            const CINCO_MIN = 5 * 60
            // Solo refrescar si faltan menos de 5 minutos para que expire
            if (session.expires_at - nowSec < CINCO_MIN) {
              const { error } = await supabase.auth.refreshSession()
              // Si el refresh token ya no es válido, cerrar sesión limpiamente
              if (error && (error.message?.includes('Refresh Token') || (error as { code?: string }).code === 'refresh_token_not_found')) {
                await supabase.auth.signOut()
                setProfile(null)
                setState(prev => ({ ...prev, user: null, session: null, loading: false }))
              }
            }
          }
        } catch {
          // Silenciar: el onAuthStateChange manejará el estado resultante
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [supabase, fetchProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { data: null, error: 'Supabase not configured' }
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      return { data, error: null }
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Error al iniciar sesión'
      const msg = translateAuthError(raw)
      setState(prev => ({ ...prev, error: msg, loading: false }))
      return { data: null, error: msg }
    }
  }, [supabase])

  const signUp = useCallback(async (
    email: string,
    password: string,
    metadata: { nombre_completo: string; telefono?: string }
  ) => {
    if (!supabase) return { data: null, error: 'Supabase not configured' }
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
            `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
          data: {
            nombre_completo: metadata.nombre_completo,
            telefono: metadata.telefono,
            rol: 'asesor',
          },
        },
      })
      if (error) throw error
      return { data, error: null }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al registrarse'
      setState(prev => ({ ...prev, error: msg, loading: false }))
      return { data: null, error: msg }
    }
  }, [supabase])

  const signOut = useCallback(async () => {
    if (!supabase) return { error: 'Supabase not configured' }
    // Limpiar estado local INMEDIATAMENTE — no esperar respuesta del servidor
    setProfile(null)
    setState(prev => ({ ...prev, user: null, session: null, loading: false }))
    try { localStorage.removeItem('auth_session_backup') } catch { /* ignorar */ }
    // Invalidar sesión en el servidor (best-effort: si falla, el estado local ya está limpio)
    try {
      await supabase.auth.signOut()
    } catch {
      // Silenciar — el estado local ya se limpió arriba
    }
    return { error: null }
  }, [supabase])

  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) return { error: 'Supabase not configured' }
    try {
      // window.location.origin da el dominio+puerto real del navegador,
      // que debe coincidir con lo configurado en Supabase → Redirect URLs.
      // Redirige directo a la página cliente (no al server callback),
      // porque el PKCE code_verifier está en el localStorage del navegador.
      const origin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL ?? '')
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/reset-password`,
      })
      if (error) throw error
      return { error: null }
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Error al enviar email'
      return { error: translateAuthError(raw) }
    }
  }, [supabase])

  const value: AuthContextValue = {
    user: state.user,
    session: state.session,
    profile,
    loading: state.loading,
    error: state.error,
    isAuthenticated: !!state.session,
    isAdmin: profile?.rol === 'admin',
    signIn,
    signUp,
    signOut,
    resetPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
