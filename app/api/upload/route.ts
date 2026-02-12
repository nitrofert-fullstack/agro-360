import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const tipo = formData.get('tipo') as string | null
    const radicadoLocal = formData.get('radicadoLocal') as string | null

    if (!file || !tipo || !radicadoLocal) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      )
    }

    // Determinar bucket según tipo
    let bucket: string
    let fileExt: string
    
    if (tipo === 'firma') {
      bucket = 'firmas'
      fileExt = 'png'
    } else if (tipo === 'foto') {
      bucket = 'fotos-productores'
      fileExt = 'jpg'
    } else {
      return NextResponse.json(
        { error: 'Tipo de archivo no válido' },
        { status: 400 }
      )
    }

    // Generar nombre de archivo único
    const fileName = `${radicadoLocal}/${tipo}-${Date.now()}.${fileExt}`

    // Convertir File a ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Subir archivo
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('[v0] Upload error:', uploadError)
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      )
    }

    // Obtener URL pública
    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(uploadData.path)

    return NextResponse.json({
      success: true,
      url: publicData.publicUrl,
      path: uploadData.path,
    })
  } catch (error) {
    console.error('[v0] API upload error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
