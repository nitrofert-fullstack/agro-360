"use client"

import { useSessionValidation } from "@/hooks/use-session-validation"
import { useAutoSync } from "@/hooks/use-auto-sync"
import { ReactNode } from "react"

export function SessionValidator({ children }: { children: ReactNode }) {
  // Este componente valida la sesión cuando se restaura conexión
  useSessionValidation()
  // Sincronizar automáticamente cuando el usuario inicia sesión
  useAutoSync()
  return <>{children}</>
}
