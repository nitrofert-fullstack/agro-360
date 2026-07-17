"use client"

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Camera, Upload, X, Loader2, Image as ImageIcon, SwitchCamera } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PhotoUploadProps {
  onPhotoCapture: (dataUrl: string | null) => void
  currentPhoto?: string | null
  label?: string
  required?: boolean
  className?: string
  guideType?: "documento" | "persona"
  /** Estampa fecha/hora + coordenadas GPS sobre la imagen (evidencia de caracterización) */
  stampMetadata?: boolean
}

/** Obtiene la ubicación actual del dispositivo. Devuelve null si no hay permiso/soporte. */
function getGeolocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    )
  })
}

/** Fecha y hora completas en formato local (es-CO) para el sello. */
function fechaSello(): string {
  return new Date().toLocaleString("es-CO", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  })
}

/** Dibuja una barra inferior con fecha/hora y coordenadas sobre la imagen. */
function stampImage(dataUrl: string, opts: { fecha: string; lat: number | null; lng: number | null }): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext("2d")
      if (!ctx) { resolve(dataUrl); return }
      ctx.drawImage(img, 0, 0)

      const line1 = opts.fecha
      const line2 = opts.lat != null && opts.lng != null
        ? `Lat ${opts.lat.toFixed(6)}, Lng ${opts.lng.toFixed(6)}`
        : "Ubicación GPS no disponible"

      const fontSize = Math.max(14, Math.round(canvas.width * 0.03))
      const pad = Math.round(fontSize * 0.5)
      const lineH = Math.round(fontSize * 1.25)
      const barH = lineH * 2 + pad * 2

      ctx.fillStyle = "rgba(0,0,0,0.55)"
      ctx.fillRect(0, canvas.height - barH, canvas.width, barH)

      ctx.fillStyle = "#ffffff"
      ctx.font = `${fontSize}px system-ui, -apple-system, sans-serif`
      ctx.textBaseline = "top"
      ctx.fillText(line1, pad, canvas.height - barH + pad)
      ctx.fillText(line2, pad, canvas.height - barH + pad + lineH)

      const out = canvas.toDataURL("image/jpeg", 0.85)
      canvas.width = 0
      canvas.height = 0
      resolve(out)
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

// Decodifica y redimensiona el archivo a un <canvas> UNA sola vez. Antes se
// re-decodificaba la imagen completa hasta 6 veces (una por cada calidad),
// bloqueando el hilo principal 1-2s en Android gama baja.
function fileToCanvas(file: File, maxWidth: number, maxHeight: number): Promise<HTMLCanvasElement> {
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
        resolve(canvas)
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function estimateSizeMB(dataUrl: string): number {
  // base64 encodes 3 bytes per 4 chars; subtract ~37 chars for the data URI prefix
  const base64 = dataUrl.split(',')[1] || ''
  return (base64.length * 0.75) / (1024 * 1024)
}

async function compressImage(file: File): Promise<{ dataUrl: string; sizeMB: number; warn: boolean }> {
  // Decodifica + redimensiona UNA vez; luego solo varía la calidad del JPEG
  // (operación barata) sobre el mismo canvas hasta bajar de 2MB.
  const canvas = await fileToCanvas(file, 1280, 1280)
  const qualities = [0.85, 0.75, 0.65, 0.55, 0.45, 0.4]
  let dataUrl = ''
  let sizeMB = 0
  for (const q of qualities) {
    dataUrl = canvas.toDataURL('image/jpeg', q)
    sizeMB = estimateSizeMB(dataUrl)
    if (sizeMB <= 2) break
  }
  // Libera el buffer del canvas
  canvas.width = 0
  canvas.height = 0
  return { dataUrl, sizeMB, warn: sizeMB > 2 }
}

export function PhotoUpload({
  onPhotoCapture,
  currentPhoto = null,
  label = "Foto",
  required = false,
  className,
  guideType,
  stampMetadata = false,
}: PhotoUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhoto)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sizeWarning, setSizeWarning] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [cameraMode, setCameraMode] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')

  // Cleanup: detener stream de cámara si el componente se desmonta mientras está activo
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setCameraMode(false)
  }, [stream])

  const startCamera = useCallback(async (facing: 'environment' | 'user' = 'environment') => {
    try {
      setError(null)
      // Detener stream previo si existe
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
        setStream(null)
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      setStream(mediaStream)
      setCameraMode(true)
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
  }, [stream])

  const switchCamera = useCallback(() => {
    const newFacing = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(newFacing)
    startCamera(newFacing)
  }, [facingMode, startCamera])

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
      let dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      // Libera el buffer del canvas antes de que el GC lo recoja
      canvas.width = 0
      canvas.height = 0

      if (stampMetadata) {
        const geo = await getGeolocation()
        dataUrl = await stampImage(dataUrl, { fecha: fechaSello(), lat: geo?.lat ?? null, lng: geo?.lng ?? null })
      }

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
  }, [onPhotoCapture, stopCamera, stampMetadata])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona una imagen valida')
      return
    }

    // Límite duro: >15MB no tiene sentido ni comprimir
    if (file.size > 15 * 1024 * 1024) {
      setError('La imagen es demasiado grande. Máximo 15MB para subir')
      return
    }

    setIsProcessing(true)
    setError(null)
    setSizeWarning(null)

    try {
      const { dataUrl, sizeMB, warn } = await compressImage(file)

      // Bloquear si después de comprimir al máximo sigue pasando 5MB
      if (sizeMB > 5) {
        setError(`La imagen no pudo comprimirse lo suficiente (${sizeMB.toFixed(1)}MB). Por favor usa una foto de menor resolución.`)
        return
      }

      let finalUrl = dataUrl
      if (stampMetadata) {
        const geo = await getGeolocation()
        finalUrl = await stampImage(dataUrl, { fecha: fechaSello(), lat: geo?.lat ?? null, lng: geo?.lng ?? null })
      }

      setPreviewUrl(finalUrl)
      onPhotoCapture(finalUrl)

      if (warn) {
        setSizeWarning(`Imagen optimizada: ${sizeMB.toFixed(1)}MB (ideal <2MB). Se subirá igual.`)
      }
    } catch (err) {
      console.error('[v0] Error processing image:', err)
      setError('Error al procesar la imagen')
    } finally {
      setIsProcessing(false)
    }
  }, [onPhotoCapture, stampMetadata])

  const handleRemove = useCallback(() => {
    setPreviewUrl(null)
    onPhotoCapture(null)
    setError(null)
    setSizeWarning(null)
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
              <ImageIcon className="h-10 w-10 text-muted-foreground md:h-12 md:w-12" />
            </div>
            <div className="space-y-1">
              <p className="text-sm md:text-base text-muted-foreground">
                Toma una foto o sube una imagen
              </p>
              <p className="text-xs text-muted-foreground">
                {'Ideal <2MB · Máx 5MB · JPG, PNG o WebP'}
              </p>
            </div>
            <div className="flex gap-3 flex-wrap justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => startCamera(facingMode)}
                disabled={isProcessing}
                className="gap-2 h-11 px-5 md:h-12 md:px-6 md:text-base"
              >
                <Camera className="h-5 w-5" />
                Tomar foto
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="gap-2 h-11 px-5 md:h-12 md:px-6 md:text-base"
              >
                <Upload className="h-5 w-5" />
                Subir archivo
              </Button>
            </div>
          </div>
        </Card>
      )}

      {cameraMode && (
        <Card className="p-4 space-y-4">
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full h-64 md:h-80 object-cover rounded-md bg-black"
              autoPlay
              playsInline
              muted
            />
            {guideType === "documento" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="border-2 border-white border-dashed rounded-lg opacity-80"
                  style={{ width: "75%", height: "62%", borderRadius: "8px" }}
                />
                <span className="mt-2 text-white text-sm font-medium drop-shadow bg-black/40 px-2 py-0.5 rounded">
                  Centre el documento
                </span>
              </div>
            )}
            {guideType === "persona" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="border-2 border-white border-dashed opacity-80"
                  style={{ width: "50%", height: "72%", borderRadius: "50%" }}
                />
                <span className="mt-2 text-white text-sm font-medium drop-shadow bg-black/40 px-2 py-0.5 rounded">
                  Centre el rostro
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button
              type="button"
              variant="default"
              onClick={capturePhoto}
              disabled={isProcessing}
              className="gap-2 h-11 px-5 md:h-12 md:px-6 md:text-base"
            >
              {isProcessing ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Procesando...</>
              ) : (
                <><Camera className="h-5 w-5" /> Capturar</>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={switchCamera}
              disabled={isProcessing}
              className="gap-2 h-11 px-5 md:h-12 md:px-6 md:text-base"
              title={facingMode === 'environment' ? 'Cambiar a cámara frontal' : 'Cambiar a cámara trasera'}
            >
              <SwitchCamera className="h-5 w-5" />
              {facingMode === 'environment' ? 'Frontal' : 'Trasera'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={stopCamera}
              disabled={isProcessing}
              className="h-11 px-5 md:h-12 md:px-6 md:text-base"
            >
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {previewUrl && !cameraMode && (
        <Card className="p-4">
          <div className="relative">
            <img src={previewUrl} alt="Vista previa" className="w-full h-64 md:h-80 object-cover rounded-md" />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-10 w-10"
              onClick={handleRemove}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2 text-center">Foto cargada correctamente</p>
        </Card>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

      {error && <p className="text-xs text-destructive">{error}</p>}
      {sizeWarning && <p className="text-xs text-amber-600">{sizeWarning}</p>}

      {isProcessing && !cameraMode && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Optimizando imagen...</span>
        </div>
      )}
    </div>
  )
}
