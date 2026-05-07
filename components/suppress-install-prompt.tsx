"use client"

import { useEffect } from "react"

export function SuppressInstallPrompt() {
  useEffect(() => {
    const handler = (e: Event) => e.preventDefault()
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])
  return null
}
