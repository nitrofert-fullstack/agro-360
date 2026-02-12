"use client"

import { useRef, useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Eraser, Check, Upload, Pen } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SignaturePadProps {
  onSignatureChange: (dataUrl: string | null) => void
  currentSignature?: string | null
  label?: string
  required?: boolean
  className?: string
}

export function SignaturePad({
  onSignatureChange,
  currentSignature = null,
  label = "Firma Digital",
  required = false,
  className
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasContent, setHasContent] = useState(!!currentSignature)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Inicializar canvas
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    
    canvas.width = rect.width * dpr
    canvas.height = 192 * dpr // h-48 = 192px
    canvas.style.width = `${rect.width}px`
    canvas.style.height = '192px'

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.scale(dpr, dpr)
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Fondo blanco
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width, 192)

    // Cargar firma existente
    if (currentSignature) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, 192)
        setHasContent(true)
      }
      img.src = currentSignature
    }

    setIsInitialized(true)
  }, []) // Solo al montar

  const getPosition = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      }
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }, [])

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setIsDrawing(true)
    setHasContent(true)

    const pos = getPosition(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }, [getPosition])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const pos = getPosition(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }, [isDrawing, getPosition])

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return
    setIsDrawing(false)

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.closePath()

    // Guardar la firma como data URL
    const dataUrl = canvas.toDataURL('image/png')
    onSignatureChange(dataUrl)
  }, [isDrawing, onSignatureChange])

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.scale(dpr, dpr)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width, 192)
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    setHasContent(false)
    onSignatureChange(null)
  }, [onSignatureChange])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const rect = canvas.getBoundingClientRect()
        const dpr = window.devicePixelRatio || 1
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.scale(dpr, dpr)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, rect.width, 192)
        
        // Calcular escala para centrar la imagen
        const scale = Math.min(rect.width / img.width, 192 / img.height) * 0.9
        const w = img.width * scale
        const h = img.height * scale
        const x = (rect.width - w) / 2
        const y = (192 - h) / 2
        ctx.drawImage(img, x, y, w, h)
        
        // Restaurar estilo de dibujo
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 2.5
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        const dataUrl = canvas.toDataURL('image/png')
        onSignatureChange(dataUrl)
        setHasContent(true)
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }, [onSignatureChange])

  return (
    <div className={cn("space-y-3", className)} ref={containerRef}>
      <Card className="relative overflow-hidden border-2">
        <canvas
          ref={canvasRef}
          className={cn(
            "w-full touch-none cursor-crosshair",
            !hasContent && "opacity-80"
          )}
          style={{ height: '192px' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasContent && isInitialized && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-muted-foreground">
              <Pen className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm opacity-60">Firme aqui con el dedo o mouse</p>
            </div>
          </div>
        )}
      </Card>

      <div className="flex gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearSignature}
          className="gap-2"
        >
          <Eraser className="h-4 w-4" />
          Limpiar
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          Cargar firma
        </Button>

        {hasContent && (
          <div className="flex items-center gap-2 ml-auto text-sm text-green-600 dark:text-green-400">
            <Check className="h-4 w-4" />
            <span>Firma capturada</span>
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

      {required && !hasContent && (
        <p className="text-xs text-destructive">La firma es obligatoria</p>
      )}
    </div>
  )
}
