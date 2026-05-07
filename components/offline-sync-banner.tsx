'use client'

import { WifiOff, RefreshCw, CloudUpload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface OfflineSyncBannerProps {
  isOnline: boolean
  pendingCount: number
  isSyncing: boolean
  onSyncNow?: () => void
  isAsesor?: boolean
}

export function OfflineSyncBanner({
  isOnline,
  pendingCount,
  isSyncing,
  onSyncNow,
  isAsesor,
}: OfflineSyncBannerProps) {
  if (isOnline && pendingCount === 0) return null

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span className="flex-1">
          Modo sin conexión.
          {isAsesor && pendingCount > 0
            ? ` ${pendingCount} formulario${pendingCount > 1 ? 's' : ''} pendiente${pendingCount > 1 ? 's' : ''} de sincronizar.`
            : isAsesor
            ? ' Los formularios se guardarán localmente.'
            : ' Se requiere conexión para enviar el formulario.'}
        </span>
      </div>
    )
  }

  if (isOnline && pendingCount > 0 && isAsesor) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
        <CloudUpload className="h-4 w-4 shrink-0 text-primary" />
        <span className="flex-1 text-foreground">
          {isSyncing
            ? 'Sincronizando formularios pendientes...'
            : `${pendingCount} formulario${pendingCount > 1 ? 's' : ''} pendiente${pendingCount > 1 ? 's' : ''} de sincronizar.`}
        </span>
        {!isSyncing && onSyncNow && (
          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={onSyncNow}>
            <RefreshCw className="h-3 w-3" />
            Sincronizar
          </Button>
        )}
        {isSyncing && <RefreshCw className={cn('h-4 w-4 text-primary', 'animate-spin')} />}
      </div>
    )
  }

  return null
}
