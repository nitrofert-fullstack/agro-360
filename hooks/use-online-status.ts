"use client"

import { useState, useEffect, useCallback } from 'react'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const checkOnlineStatus = useCallback(async () => {
    try {
      // Try to fetch a small resource to verify actual connectivity
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-store',
      })
      const online = response.ok
      setIsOnline(online)
      setLastChecked(new Date())
      return online
    } catch {
      setIsOnline(false)
      setLastChecked(new Date())
      return false
    }
  }, [])

  useEffect(() => {
    // Set initial state based on navigator (only on client)
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine)
    }

    const handleOnline = () => {
      setIsOnline(true)
      // Verify with actual fetch
      checkOnlineStatus()
    }

    const handleOffline = () => {
      setIsOnline(false)
      setLastChecked(new Date())
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial check
    checkOnlineStatus()

    // Periodic check every 30 seconds
    const interval = setInterval(checkOnlineStatus, 30000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [checkOnlineStatus])

  return {
    isOnline,
    lastChecked,
    checkNow: checkOnlineStatus,
  }
}
