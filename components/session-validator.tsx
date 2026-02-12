"use client"

import { useSessionValidation } from "@/hooks/use-session-validation"
import { ReactNode } from "react"

export function SessionValidator({ children }: { children: ReactNode }) {
  // Este componente valida la sesión cuando se restaura conexión
  useSessionValidation()
  return <>{children}</>
}
