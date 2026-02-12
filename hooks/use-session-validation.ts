"use client"

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useOnlineStatus } from './use-online-status'
import { useAuth } from './use-auth'
import { createClient } from '@/lib/supabase/client'

/**
 * Hook para validar y refrescar la sesión cuando la conexión se restaura
 * Esto asegura que si el token expiró mientras estabas offline,
 * se pida login nuevamente al conectarte
 */
export function useSessionValidation() {
  const { isOnline } = useOnlineStatus()
  const { user, session, signOut } = useAuth()
  const [isValidating, setIsValidating] = useState(false)
  const [sessionValid, setSessionValid] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const validateSession = useCallback(async () => {
    if (!isOnline || !session || !supabase) return

    setIsValidating(true)
    try {
      // Intentar obtener sesión actual
      const { data: { session: currentSession }, error } = await supabase.auth.getSession()

      if (error || !currentSession) {
        console.log('[SessionValidation] Sesión inválida o expirada')
        setSessionValid(false)
        // Forzar logout
        await signOut()
        return
      }

      // Verificar si el token está cerca de expirar (menos de 5 minutos)
      if (currentSession.expires_at) {
        const expiresIn = currentSession.expires_at * 1000 - Date.now()
        if (expiresIn < 5 * 60 * 1000) {
          console.log('[SessionValidation] Token próximo a expirar, renovando...')
          // Supabase renovará automáticamente si hay refresh token
          const { data: { session: refreshedSession }, error: refreshError } =
            await supabase.auth.refreshSession()

          if (refreshError || !refreshedSession) {
            setSessionValid(false)
            await signOut()
            return
          }
        }
      }

      setSessionValid(true)
    } catch (error) {
      console.error('[SessionValidation] Error validating session:', error)
      setSessionValid(false)
    } finally {
      setIsValidating(false)
    }
  }, [isOnline, session, supabase, signOut])

  // Validar sesión cuando se restaura conexión
  useEffect(() => {
    if (isOnline && user) {
      validateSession()
    }
  }, [isOnline, user, validateSession])

  // Validar cada 5 minutos si hay sesión
  useEffect(() => {
    if (!session) return

    const interval = setInterval(() => {
      validateSession()
    }, 5 * 60 * 1000) // Cada 5 minutos

    return () => clearInterval(interval)
  }, [session, validateSession])

  return {
    sessionValid,
    isValidating,
    validateSession,
  }
}
