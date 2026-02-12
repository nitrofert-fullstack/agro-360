'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function EnvVarChecker() {
  const [missingVars, setMissingVars] = useState<string[]>([])

  useEffect(() => {
    const missing: string[] = []
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      missing.push('NEXT_PUBLIC_SUPABASE_URL')
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    }

    setMissingVars(missing)
  }, [])

  if (missingVars.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Variables de entorno faltantes</AlertTitle>
        <AlertDescription>
          <p className="mt-2 text-sm">Las siguientes variables no están configuradas:</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
            {missingVars.map(v => (
              <li key={v} className="font-mono">{v}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs opacity-75">
            Configura estas variables en tu proyecto de Vercel para que la app funcione correctamente.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  )
}
