"use client"

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useAuth } from './use-auth'
import { createClient } from '@/lib/supabase/client'

/**
 * Hook que renueva proactivamente el token de sesión antes de que expire.
 * No fuerza logout en error de red — el middleware redirige si la sesión es inválida.
 */
export function useSessionValidation() {
  const { user, session } = useAuth()
  const [isValidating, setIsValidating] = useState(false)
  const [sessionValid, setSessionValid] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const validateSession = useCallback(async () => {
    if (!session || !supabase) return

    setIsValidating(true)
    try {
      if (session.expires_at) {
        const expiresIn = session.expires_at * 1000 - Date.now()
        if (expiresIn < 5 * 60 * 1000) {
          console.log('[SessionValidation] Token próximo a expirar, renovando...')
          const { error: refreshError } = await supabase.auth.refreshSession()
          if (refreshError) {
            console.warn('[SessionValidation] No se pudo renovar token:', refreshError.message)
            setSessionValid(false)
            return
          }
        }
      }
      setSessionValid(true)
    } catch (error) {
      console.warn('[SessionValidation] Error validando sesión (transitorio):', error)
    } finally {
      setIsValidating(false)
    }
  }, [session, supabase])

  // Validar al montar si hay usuario
  useEffect(() => {
    if (user) validateSession()
  }, [user, validateSession])

  // Polling cada 5 minutos
  useEffect(() => {
    if (!session) return
    const interval = setInterval(() => validateSession(), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [session, validateSession])

  return { sessionValid, isValidating, validateSession }
}
