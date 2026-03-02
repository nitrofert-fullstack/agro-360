"use client"

import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js'

interface Profile {
  id: string
  email: string
  nombre_completo: string
  telefono: string | null
  rol: 'admin' | 'asesor' | 'campesino' | 'analista'
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

  /**
   * Carga el perfil del usuario.
   * - Intenta obtenerlo de la tabla profiles (1 sola petición de red)
   * - Si falla (sin conexión u otro error), usa user_metadata del token (sin red, instantáneo)
   * - NO llama getUser() para evitar una segunda petición redundante al servidor de auth
   */
  const fetchProfile = useCallback(async (user: User) => {
    if (!supabase) return

    // Timeout de 4 s: si la query no responde, caer a user_metadata de inmediato
    const TIMEOUT_MS = 8000

    try {
      const result = await Promise.race([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('profile_timeout')), TIMEOUT_MS)
        ),
      ])

      if (result.data) {
        setProfile(result.data as Profile)
        return
      }
    } catch {
      // Timeout, error de red o sin conexión: usar fallback
    }

    // Fallback offline: datos del token JWT (disponible sin red)
    setProfile({
      id: user.id,
      email: user.email || '',
      nombre_completo: user.user_metadata?.nombre_completo || 'Usuario',
      telefono: user.user_metadata?.telefono || null,
      rol: user.user_metadata?.rol || 'asesor',
      activo: true,
      numero_documento: user.user_metadata?.numero_documento || null,
    })
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
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión'
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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/reset-password`,
      })
      if (error) throw error
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Error al enviar email' }
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
