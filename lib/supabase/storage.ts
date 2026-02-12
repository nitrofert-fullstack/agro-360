import { createClient } from '@/lib/supabase/client'

export interface UploadResult {
  url: string | null
  path: string | null
  error: string | null
}

export interface FileOptimizationOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'jpeg' | 'png' | 'webp'
}

/**
 * Optimiza una imagen antes de subirla
 */
export async function optimizeImage(
  file: File,
  options: FileOptimizationOptions = {}
): Promise<Blob> {
  const { maxWidth = 1920, maxHeight = 1920, quality = 0.85, format = 'jpeg' } = options

  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = (e) => {
      img.src = e.target?.result as string
    }

    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img

      // Calcular nuevas dimensiones manteniendo el aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width *= ratio
        height *= ratio
      }

      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('No se pudo crear el contexto 2D'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Error al optimizar la imagen'))
          }
        },
        `image/${format}`,
        quality
      )
    }

    img.onerror = () => reject(new Error('Error al cargar la imagen'))
    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsDataURL(file)
  })
}

/**
 * Sube una firma digital a Supabase Storage
 */
export async function uploadFirma(
  blob: Blob,
  radicadoLocal: string
): Promise<UploadResult> {
  try {
    const supabase = createClient()
    const fileName = `firma-${radicadoLocal}-${Date.now()}.png`
    const filePath = `${radicadoLocal}/${fileName}`

    const { data, error } = await supabase.storage
      .from('firmas')
      .upload(filePath, blob, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('[v0] Error uploading firma:', error)
      return { url: null, path: null, error: error.message }
    }

    // Obtener URL pública
    const { data: publicData } = supabase.storage
      .from('firmas')
      .getPublicUrl(data.path)

    return {
      url: publicData.publicUrl,
      path: data.path,
      error: null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('[v0] Error in uploadFirma:', message)
    return { url: null, path: null, error: message }
  }
}

/**
 * Sube una foto del productor a Supabase Storage
 */
export async function uploadFotoProductor(
  file: File,
  radicadoLocal: string
): Promise<UploadResult> {
  try {
    // Optimizar imagen antes de subir
    const optimizedBlob = await optimizeImage(file, {
      maxWidth: 1280,
      maxHeight: 1280,
      quality: 0.8,
      format: 'jpeg',
    })

    const supabase = createClient()
    const fileName = `foto-${radicadoLocal}-${Date.now()}.jpg`
    const filePath = `${radicadoLocal}/${fileName}`

    const { data, error } = await supabase.storage
      .from('fotos-productores')
      .upload(filePath, optimizedBlob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('[v0] Error uploading foto:', error)
      return { url: null, path: null, error: error.message }
    }

    // Obtener URL pública
    const { data: publicData } = supabase.storage
      .from('fotos-productores')
      .getPublicUrl(data.path)

    return {
      url: publicData.publicUrl,
      path: data.path,
      error: null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('[v0] Error in uploadFotoProductor:', message)
    return { url: null, path: null, error: message }
  }
}

/**
 * Elimina un archivo de Supabase Storage
 */
export async function deleteFile(bucket: string, path: string): Promise<boolean> {
  try {
    const supabase = createClient()
    const { error } = await supabase.storage.from(bucket).remove([path])

    if (error) {
      console.error('[v0] Error deleting file:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[v0] Error in deleteFile:', error)
    return false
  }
}

/**
 * Obtiene la URL pública de un archivo
 */
export function getPublicUrl(bucket: string, path: string): string {
  const supabase = createClient()
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}
