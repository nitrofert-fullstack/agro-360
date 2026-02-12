"use client"

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
}

interface Profile {
  id: string
  email: string
  nombre_completo: string
  telefono: string | null
  rol: 'admin' | 'asesor'
  activo: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  })
  const [profile, setProfile] = useState<Profile | null>(null)

  const supabase = useMemo(() => createClient(), [])

  const fetchProfile = useCallback(async (userId: string) => {
    if (!supabase) return

    try {
      // Primero intentar obtener del Auth
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser?.email) {
        console.warn('[Auth] No auth user found')
        return
      }

      // Intentar obtener del tabla profiles
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (data) {
          setProfile(data as Profile)
          return
        }
      } catch (profileErr) {
        console.warn('[Auth] Could not fetch profile from table:', profileErr)
      }

      // Si no hay datos en profiles, crear un perfil mínimo desde Auth
      setProfile({
        id: userId,
        email: authUser.email,
        nombre_completo: authUser.user_metadata?.nombre_completo || 'Usuario',
        telefono: authUser.user_metadata?.telefono || null,
        rol: authUser.user_metadata?.rol || 'asesor',
        activo: true
      } as Profile)
    } catch (err) {
      console.error('[Auth] Error fetching profile:', err)
    }
  }, [supabase])

  useEffect(() => {
    if (!supabase) {
      setState(prev => ({ ...prev, loading: false, error: 'Supabase not configured' }))
      return
    }

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) throw error

        setState(prev => ({
          ...prev,
          user: session?.user ?? null,
          session,
          loading: false,
        }))

        if (session?.user) {
          await fetchProfile(session.user.id)
        }
      } catch (err) {
        setState(prev => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Error getting session',
          loading: false,
        }))
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        setState(prev => ({
          ...prev,
          user: session?.user ?? null,
          session,
          loading: false,
        }))

        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { data: null, error: 'Supabase not configured' }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      return { data, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error signing in'
      setState(prev => ({ ...prev, error: errorMessage, loading: false }))
      return { data: null, error: errorMessage }
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
      const errorMessage = err instanceof Error ? err.message : 'Error signing up'
      setState(prev => ({ ...prev, error: errorMessage, loading: false }))
      return { data: null, error: errorMessage }
    }
  }, [supabase])

  const signOut = useCallback(async () => {
    if (!supabase) return { error: 'Supabase not configured' }

    setState(prev => ({ ...prev, loading: true }))

    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      // Limpiar perfil
      setProfile(null)

      // Limpiar datos locales de sesión
      try {
        localStorage.removeItem('auth_session_backup')
      } catch {
        // Ignorar errores de localStorage
      }

      return { error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error signing out'
      setState(prev => ({ ...prev, error: errorMessage, loading: false }))
      return { error: errorMessage }
    }
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
      return { error: err instanceof Error ? err.message : 'Error sending reset email' }
    }
  }, [supabase])

  return {
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
}
