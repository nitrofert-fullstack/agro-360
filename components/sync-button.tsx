"use client"

import { useState, useEffect } from "react"
import { useSync } from "@/hooks/use-sync"
import { useAuth } from "@/hooks/use-auth"
import { getStats } from "@/lib/db/indexed-db"
import { Button } from "@/components/ui/button"
import { RefreshCw, Cloud, CloudOff, LogIn } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface SyncButtonProps {
  variant?: "default" | "compact"
  className?: string
  onSyncComplete?: (result: { synced: number; failed: number }) => void
}

export function SyncButton({ variant = "default", className, onSyncComplete }: SyncButtonProps) {
  const { canSync, isSyncing, syncAll, lastSyncResult } = useSync()
  const { isAuthenticated } = useAuth()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const loadStats = async () => {
      const stats = await getStats()
      setPendingCount(stats.pendientes)
    }
    loadStats()
    
    // Refresh every 5 seconds
    const interval = setInterval(loadStats, 5000)
    return () => clearInterval(interval)
  }, [lastSyncResult])

  const handleSync = async () => {
    toast.info("Sincronizando...", { duration: 2000 })
    const result = await syncAll()
    
    if (result.synced > 0 && result.failed === 0) {
      toast.success(`${result.synced} formulario${result.synced > 1 ? 's' : ''} sincronizado${result.synced > 1 ? 's' : ''} correctamente`)
    } else if (result.synced > 0 && result.failed > 0) {
      toast.warning(`${result.synced} sincronizado${result.synced > 1 ? 's' : ''}, ${result.failed} con error`)
    } else if (result.failed > 0) {
      toast.error(`Error al sincronizar: ${result.errors[0] || 'Error desconocido'}`)
    } else if (result.synced === 0 && result.failed === 0) {
      toast.info("No hay formularios pendientes por sincronizar")
    }
    
    onSyncComplete?.({ synced: result.synced, failed: result.failed })
  }

  const getTooltipContent = () => {
    if (!isAuthenticated) {
      return "Inicia sesion para sincronizar"
    }
    if (!canSync) {
      return "Sin conexion a internet"
    }
    if (pendingCount === 0) {
      return "Todo sincronizado"
    }
    return `${pendingCount} formulario${pendingCount > 1 ? 's' : ''} pendiente${pendingCount > 1 ? 's' : ''}`
  }

  if (variant === "compact") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={handleSync}
              disabled={!canSync || isSyncing || pendingCount === 0}
              className={cn("relative", className)}
            >
              {!isAuthenticated ? (
                <LogIn className="h-4 w-4" />
              ) : canSync ? (
                <Cloud className={cn("h-4 w-4", isSyncing && "animate-pulse")} />
              ) : (
                <CloudOff className="h-4 w-4" />
              )}
              {pendingCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{getTooltipContent()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Button
      variant={canSync && pendingCount > 0 ? "default" : "outline"}
      onClick={handleSync}
      disabled={!canSync || isSyncing || pendingCount === 0}
      className={cn("gap-2", className)}
    >
      {isSyncing ? (
        <RefreshCw className="h-4 w-4 animate-spin" />
      ) : !isAuthenticated ? (
        <LogIn className="h-4 w-4" />
      ) : canSync ? (
        <Cloud className="h-4 w-4" />
      ) : (
        <CloudOff className="h-4 w-4" />
      )}
      <span>
        {!isAuthenticated 
          ? "Iniciar sesion" 
          : isSyncing 
            ? "Sincronizando..." 
            : pendingCount > 0 
              ? `Sincronizar (${pendingCount})` 
              : "Sincronizado"
        }
      </span>
    </Button>
  )
}
