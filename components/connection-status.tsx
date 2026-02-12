"use client"

import { useOnlineStatus } from "@/hooks/use-online-status"
import { Wifi, WifiOff } from "lucide-react"
import { cn } from "@/lib/utils"

interface ConnectionStatusProps {
  showLabel?: boolean
  className?: string
}

export function ConnectionStatus({ showLabel = true, className }: ConnectionStatusProps) {
  const { isOnline } = useOnlineStatus()

  return (
    <div 
      className={cn(
        "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
        isOnline 
          ? "bg-green-500/10 text-green-600 dark:text-green-400" 
          : "bg-red-500/10 text-red-600 dark:text-red-400",
        className
      )}
    >
      {isOnline ? (
        <Wifi className="h-3.5 w-3.5" />
      ) : (
        <WifiOff className="h-3.5 w-3.5" />
      )}
      {showLabel && (
        <span>{isOnline ? "Conectado" : "Sin conexion"}</span>
      )}
    </div>
  )
}
