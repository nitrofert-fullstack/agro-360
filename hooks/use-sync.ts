"use client"

import { useState, useCallback } from 'react'
import { useAuth } from './use-auth'
import { useOnlineStatus } from './use-online-status'
import {
  getCaracterizacionesPendientes,
  markAsSynced,
  markAsError,
  addSyncLog,
  type CaracterizacionLocal,
} from '@/lib/db/indexed-db'

interface SyncResult {
  success: boolean
  synced: number
  failed: number
  errors: string[]
}

export function useSync() {
  const { isAuthenticated, user } = useAuth()
  const { isOnline } = useOnlineStatus()
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null)

  const canSync = isAuthenticated && isOnline

  const syncAll = useCallback(async (): Promise<SyncResult> => {
    if (!canSync) {
      const result: SyncResult = {
        success: false,
        synced: 0,
        failed: 0,
        errors: [!isAuthenticated ? 'Debes iniciar sesion para sincronizar' : 'Sin conexion a internet'],
      }
      setLastSyncResult(result)
      return result
    }

    setIsSyncing(true)
    const errors: string[] = []
    let synced = 0
    let failed = 0

    try {
      const pendientes = await getCaracterizacionesPendientes()
      
      if (pendientes.length === 0) {
        const result: SyncResult = {
          success: true,
          synced: 0,
          failed: 0,
          errors: [],
        }
        setLastSyncResult(result)
        return result
      }

      // Llamar a la API de sincronización
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          caracterizaciones: pendientes,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error en la sincronizacion')
      }

      const data = await response.json()
      
      // Procesar resultados
      for (const resultado of data.resultados || []) {
        const caracterizacion = pendientes.find(c => c.radicadoLocal === resultado.radicadoLocal)
        
        if (resultado.estado === 'SINCRONIZADO') {
          if (caracterizacion?.id) {
            await markAsSynced(caracterizacion.id, resultado.radicadoOficial)
          }
          await addSyncLog({
            fecha: new Date().toISOString(),
            radicadoLocal: resultado.radicadoLocal,
            radicadoOficial: resultado.radicadoOficial,
            exito: true,
            mensaje: resultado.mensaje,
          })
          synced++
        } else {
          if (caracterizacion?.id) {
            await markAsError(caracterizacion.id, resultado.mensaje)
          }
          await addSyncLog({
            fecha: new Date().toISOString(),
            radicadoLocal: resultado.radicadoLocal,
            exito: false,
            mensaje: resultado.mensaje,
          })
          errors.push(`${resultado.radicadoLocal}: ${resultado.mensaje}`)
          failed++
        }
      }

      const result: SyncResult = {
        success: failed === 0,
        synced,
        failed,
        errors,
      }
      setLastSyncResult(result)
      return result

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      errors.push(errorMessage)
      
      const result: SyncResult = {
        success: false,
        synced,
        failed: failed + 1,
        errors,
      }
      setLastSyncResult(result)
      return result
    } finally {
      setIsSyncing(false)
    }
  }, [canSync, isAuthenticated, isOnline])

  return {
    canSync,
    isSyncing,
    syncAll,
    lastSyncResult,
    isOnline,
    isAuthenticated,
  }
}
