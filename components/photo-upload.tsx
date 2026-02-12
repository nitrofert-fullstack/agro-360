"use client"

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Camera, Upload, X, Loader2, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PhotoUploadProps {
  onPhotoCapture: (dataUrl: string | null) => void
  currentPhoto?: string | null
  label?: string
  required?: boolean
  className?: string
}

function resizeImage(file: File, maxWidth: number, maxHeight: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('No canvas context')); return }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function PhotoUpload({
  onPhotoCapture,
  currentPhoto = null,
  label = "Foto",
  required = false,
  className
}: PhotoUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhoto)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [cameraMode, setCameraMode] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setCameraMode(false)
  }, [stream])

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      setStream(mediaStream)
      setCameraMode(true)
      // Asignar el stream al video cuando este listo
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
          videoRef.current.play().catch(() => {})
        }
      }, 100)
    } catch (err) {
      console.error('[v0] Error accessing camera:', err)
      setError('No se pudo acceder a la camara. Intente subir un archivo.')
      setCameraMode(false)
    }
  }, [])

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current) return

    setIsProcessing(true)
    try {
      const video = videoRef.current
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 1280
      canvas.height = video.videoHeight || 720
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.drawImage(video, 0, 0)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      
      setPreviewUrl(dataUrl)
      onPhotoCapture(dataUrl)
      stopCamera()
      setError(null)
    } catch (err) {
      console.error('[v0] Error capturing photo:', err)
      setError('Error al capturar la foto')
    } finally {
      setIsProcessing(false)
    }
  }, [onPhotoCapture, stopCamera])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona una imagen valida')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('La imagen es demasiado grande. Maximo 10MB')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const dataUrl = await resizeImage(file, 1280, 1280, 0.85)
      setPreviewUrl(dataUrl)
      onPhotoCapture(dataUrl)
    } catch (err) {
      console.error('[v0] Error processing image:', err)
      setError('Error al procesar la imagen')
    } finally {
      setIsProcessing(false)
    }
  }, [onPhotoCapture])

  const handleRemove = useCallback(() => {
    setPreviewUrl(null)
    onPhotoCapture(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [onPhotoCapture])

  return (
    <div className={cn("space-y-2", className)}>
      {!cameraMode && !previewUrl && (
        <Card className="p-6 border-dashed">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="rounded-full bg-muted p-4">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Toma una foto o sube una imagen
              </p>
              <p className="text-xs text-muted-foreground">
                {'Maximo 10MB - JPG, PNG o WebP'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={startCamera}
                disabled={isProcessing}
                className="gap-2"
              >
                <Camera className="h-4 w-4" />
                Tomar foto
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Subir archivo
              </Button>
            </div>
          </div>
        </Card>
      )}

      {cameraMode && (
        <Card className="p-4 space-y-4">
          <video
            ref={videoRef}
            className="w-full h-64 object-cover rounded-md bg-black"
            autoPlay
            playsInline
            muted
          />
          <div className="flex gap-2 justify-center">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={capturePhoto}
              disabled={isProcessing}
              className="gap-2"
            >
              {isProcessing ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</>
              ) : (
                <><Camera className="h-4 w-4" /> Capturar</>
              )}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={stopCamera} disabled={isProcessing}>
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {previewUrl && !cameraMode && (
        <Card className="p-4">
          <div className="relative">
            <img src={previewUrl} alt="Vista previa" className="w-full h-64 object-cover rounded-md" />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">Foto cargada correctamente</p>
        </Card>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

      {error && <p className="text-xs text-destructive">{error}</p>}

      {isProcessing && !cameraMode && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Optimizando imagen...</span>
        </div>
      )}
    </div>
  )
}
