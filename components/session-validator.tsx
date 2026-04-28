"use client"

import { useSessionValidation } from "@/hooks/use-session-validation"
import { ReactNode } from "react"

export function SessionValidator({ children }: { children: ReactNode }) {
  // Renueva el token de sesión proactivamente antes de que expire
  useSessionValidation()
  return <>{children}</>
}
