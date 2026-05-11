'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getPendingForms, deletePendingForm, incrementRetry, countPendingForms } from '@/lib/offline-db'
import { toast } from 'sonner'

export function useOfflineSync(isAsesor: boolean) {
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true)
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const syncingRef = useRef(false)
  const isAsesorRef = useRef(isAsesor)
  useEffect(() => { isAsesorRef.current = isAsesor }, [isAsesor])

  const refreshCount = useCallback(async () => {
    if (typeof window === 'undefined') return
    try {
      const count = await countPendingForms()
      setPendingCount(count)
    } catch {}
  }, [])

  const syncPending = useCallback(async () => {
    if (!isAsesorRef.current || syncingRef.current) return
    const forms = await getPendingForms()
    if (forms.length === 0) return

    syncingRef.current = true
    setIsSyncing(true)
    let synced = 0
    let failed = 0

    for (const form of forms) {
      try {
        const res = await fetch('/api/caracterizaciones', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Sync-Id': form.localId,
          },
          body: JSON.stringify(form.payload),
        })
        if (res.ok) {
          await deletePendingForm(form.id!)
          synced++
        } else {
          await incrementRetry(form.id!)
          failed++
        }
      } catch {
        await incrementRetry(form.id!)
        failed++
      }
    }

    syncingRef.current = false
    setIsSyncing(false)
    await refreshCount()

    if (synced > 0) {
      toast.success(`${synced} formulario${synced > 1 ? 's' : ''} sincronizado${synced > 1 ? 's' : ''} correctamente`)
    }
    if (failed > 0) {
      toast.error(
        `${failed} formulario${failed > 1 ? 's' : ''} no se pudieron sincronizar. Usa el botón para reintentar.`,
        { duration: 8000 }
      )
    }
  }, [refreshCount])

  // Solo escuchar cambios de conectividad — NO disparar sync desde aquí
  useEffect(() => {
    if (typeof window === 'undefined') return
    refreshCount()

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [refreshCount])

  // Única fuente de auto-sync: cuando isAsesor pasa a true O cuando isOnline pasa a true
  // Solo actúa si AMBOS son true al mismo tiempo
  useEffect(() => {
    if (isAsesor && isOnline) {
      syncPending()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAsesor, isOnline])

  return { isOnline, pendingCount, isSyncing, syncPending, refreshCount }
}
