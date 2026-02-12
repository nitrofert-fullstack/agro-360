"use client"

import { useEffect, useRef } from 'react'
import { useAuth } from './use-auth'
import { useSync } from './use-sync'
import { getCaracterizacionesPendientes } from '@/lib/db/indexed-db'
import { toast } from 'sonner'

/**
 * Hook que sincroniza automáticamente los datos locales cuando el usuario hace login
 * Ejecuta una sola vez después de que el usuario se autentica
 */
export function useAutoSync() {
  const { isAuthenticated, user, loading } = useAuth()
  const { syncAll, isSyncing } = useSync()
  const syncAttemptedRef = useRef(false)

  useEffect(() => {
    const attemptAutoSync = async () => {
      // Solo sincronizar si:
      // 1. El usuario está autenticado
      // 2. No está cargando
      // 3. No hemos intentado sincronizar ya
      // 4. No estamos sincronizando en este momento
      if (!isAuthenticated || loading || syncAttemptedRef.current || isSyncing) {
        return
      }

      // Marcar que ya intentamos sincronizar para evitar duplicados
      syncAttemptedRef.current = true

      try {
        // Verificar si hay datos pendientes
        const pendientes = await getCaracterizacionesPendientes()

        if (pendientes.length > 0) {
          console.log(`[AutoSync] Encontrados ${pendientes.length} registros pendientes. Iniciando sincronización...`)
          
          const result = await syncAll()

          if (result.success) {
            toast.success('Sincronización completada', {
              description: `${result.synced} registros sincronizados correctamente`,
              duration: 3000,
            })
          } else if (result.synced > 0 && result.failed > 0) {
            toast.warning('Sincronización parcial', {
              description: `${result.synced} sincronizados, ${result.failed} fallidos`,
              duration: 4000,
            })
          } else if (result.failed > 0) {
            toast.error('Error en la sincronización', {
              description: `${result.failed} registros fallaron. Intente manualmente más tarde.`,
              duration: 4000,
            })
          }
        }
      } catch (error) {
        console.error('[AutoSync] Error durante auto-sync:', error)
        // No mostrar toast de error para no molestar al usuario si falla silenciosamente
      }
    }

    attemptAutoSync()
  }, [isAuthenticated, loading, syncAll, isSyncing])
}
