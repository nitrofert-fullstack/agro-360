'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getCaracterizacionesConError, markAsError, type CaracterizacionLocal } from '@/lib/db/indexed-db'
import { AlertTriangle, RefreshCw, Trash2, Eye } from 'lucide-react'
import { toast } from 'sonner'

export function SyncErrorDisplay() {
  const [errores, setErrores] = useState<CaracterizacionLocal[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedError, setSelectedError] = useState<CaracterizacionLocal | null>(null)

  useEffect(() => {
    loadErrors()
  }, [])

  const loadErrors = async () => {
    setIsLoading(true)
    try {
      const data = await getCaracterizacionesConError()
      setErrores(data)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetry = async (caracterizacion: CaracterizacionLocal) => {
    if (caracterizacion.id === undefined) return
    // Marcar como pendiente nuevamente
    await markAsError(caracterizacion.id, null)
    toast.success('Formulario marcado para reintentar sincronización')
    loadErrors()
  }

  const handleDelete = async (caracterizacion: CaracterizacionLocal) => {
    if (confirm('¿Estás seguro de que deseas eliminar este registro?')) {
      // TODO: Implementar eliminación
      toast.info('Funcionalidad en desarrollo')
    }
  }

  if (errores.length === 0) {
    return null
  }

  return (
    <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <div>
            <CardTitle className="text-red-700 dark:text-red-400">Errores de Sincronización</CardTitle>
            <CardDescription className="text-red-600 dark:text-red-300">
              {errores.length} formulario{errores.length > 1 ? 's' : ''} con problemas
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">Lista</TabsTrigger>
            <TabsTrigger value="details">Detalles</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-2 mt-4">
            {errores.map((error) => (
              <div key={error.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex-1">
                  <p className="font-medium text-sm">{error.radicadoLocal || 'Sin radicado'}</p>
                  <p className="text-xs text-red-600 dark:text-red-400">{error.ultimoErrorSincronizacion || 'Error desconocido'}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedError(error)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRetry(error)}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reintentar
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="details" className="mt-4">
            {selectedError ? (
              <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-lg border border-red-200 dark:border-red-800">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Radicado</p>
                  <p className="font-mono text-sm">{selectedError.radicadoLocal}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Error</p>
                  <Alert className="border-red-200 dark:border-red-800">
                    <AlertDescription className="text-red-600 dark:text-red-400 text-sm">
                      {selectedError.ultimoErrorSincronizacion || 'Error desconocido'}
                    </AlertDescription>
                  </Alert>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Fecha</p>
                  <p className="text-sm">{new Date(selectedError.fechaRegistro).toLocaleString()}</p>
                </div>
                <Button
                  onClick={() => handleRetry(selectedError)}
                  className="w-full"
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reintentar Sincronización
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Selecciona un error para ver detalles</p>
            )}
          </TabsContent>
        </Tabs>

        <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <AlertDescription className="text-blue-600 dark:text-blue-400 text-sm">
            💡 Tip: Revisa que tengas conexión a internet y que todos los campos del formulario sean válidos
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
