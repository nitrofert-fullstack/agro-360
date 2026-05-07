'use client'

import { useAuth } from '@/hooks/use-auth'
import { useOfflineSync } from '@/hooks/use-offline-sync'
import { OfflineSyncBanner } from '@/components/offline-sync-banner'
import { usePathname } from 'next/navigation'

export function AutoSync() {
  const { isAuthenticated, profile } = useAuth()
  const pathname = usePathname()
  const isAsesor = isAuthenticated && (profile?.rol === 'asesor' || profile?.rol === 'admin')
  const { isOnline, pendingCount, isSyncing, syncPending } = useOfflineSync(isAsesor)

  // No mostrar en el formulario (ya tiene su propio banner integrado)
  const isFormPage = pathname?.startsWith('/formulario')

  if (isFormPage || !isAsesor) return null

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-full max-w-md -translate-x-1/2 px-4">
      <OfflineSyncBanner
        isOnline={isOnline}
        pendingCount={pendingCount}
        isSyncing={isSyncing}
        onSyncNow={syncPending}
        isAsesor={isAsesor}
      />
    </div>
  )
}
