"use client"

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useOnlineStatus } from './use-online-status'
import { useAuth } from './use-auth'
import { createClient } from '@/lib/supabase/client'

/**
 * Hook para validar y refrescar la sesión cuando la conexión se restaura.
 * Renueva el token proactivamente antes de que expire, pero NO fuerza logout
 * en caso de error — el middleware se encarga de redirigir si la sesión es inválida.
 */
export function useSessionValidation() {
  const { isOnline } = useOnlineStatus()
  const { user, session } = useAuth()
  const [isValidating, setIsValidating] = useState(false)
  const [sessionValid, setSessionValid] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const validateSession = useCallback(async () => {
    if (!isOnline || !session || !supabase) return

    setIsValidating(true)
    try {
      // Verificar si el token está cerca de expirar (menos de 5 minutos)
      // y renovar proactivamente usando el refresh token
      if (session.expires_at) {
        const expiresIn = session.expires_at * 1000 - Date.now()
        if (expiresIn < 5 * 60 * 1000) {
          console.log('[SessionValidation] Token próximo a expirar, renovando...')
          const { error: refreshError } = await supabase.auth.refreshSession()
          if (refreshError) {
            // Solo loguear el error; NO forzar logout por fallo de red
            // El middleware se encargará de redirigir si la sesión es realmente inválida
            console.warn('[SessionValidation] No se pudo renovar token:', refreshError.message)
            setSessionValid(false)
            return
          }
        }
      }

      setSessionValid(true)
    } catch (error) {
      // Error de red u otro error transitorio — no cerrar sesión
      console.warn('[SessionValidation] Error validando sesión (transitorio):', error)
    } finally {
      setIsValidating(false)
    }
  }, [isOnline, session, supabase])

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
