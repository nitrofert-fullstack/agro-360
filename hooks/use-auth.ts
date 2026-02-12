"use client"

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

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
  
  const supabase = createClient()

  // Si Supabase no está configurado, retornar estado inicial
  if (!supabase) {
    return {
      user: null,
      session: null,
      profile: null,
      loading: false,
      error: 'Supabase not configured',
      isAuthenticated: false,
      isAdmin: false,
      signIn: async () => ({ data: null, error: 'Supabase not configured' }),
      signUp: async () => ({ data: null, error: 'Supabase not configured' }),
      signOut: async () => ({ error: 'Supabase not configured' }),
      resetPassword: async () => ({ error: 'Supabase not configured' }),
    }
  }

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      // Obtener email del usuario de Supabase Auth
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (authUser?.email) {
        setProfile({
          id: userId,
          email: authUser.email,
          nombre_completo: authUser.user_metadata?.nombre_completo || 'Asesor',
          telefono: authUser.user_metadata?.telefono || null,
          rol: 'asesor',
          activo: true
        } as Profile)
      }
    } catch (err) {
      console.error('[Auth] Error fetching profile:', err)
    }
  }, [supabase])

  useEffect(() => {
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
      async (event, session) => {
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

  const signIn = async (email: string, password: string) => {
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
  }

  const signUp = async (
    email: string, 
    password: string, 
    metadata: { nombre_completo: string; telefono?: string }
  ) => {
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
  }

  const signOut = async () => {
    setState(prev => ({ ...prev, loading: true }))
    
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // Limpiar perfil
      setProfile(null)
      
      // Limpiar datos locales de sesión
      try {
        localStorage.removeItem('auth_session_backup')
      } catch (e) {
        // Ignorar errores de localStorage
      }
      
      return { error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error signing out'
      setState(prev => ({ ...prev, error: errorMessage, loading: false }))
      return { error: errorMessage }
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/reset-password`,
      })
      
      if (error) throw error
      
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Error sending reset email' }
    }
  }

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
