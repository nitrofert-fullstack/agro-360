import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createStorageClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import type { SupabaseClient } from '@supabase/supabase-js'

// Storage sigue en Supabase (Prisma es ORM, no maneja archivos)
async function uploadBase64ToStorage(
  storageClient: SupabaseClient,
  dataUrl: string | null | undefined,
  bucket: string,
  filePath: string,
  contentType: string
): Promise<string | null> {
  if (!dataUrl) return null
  if (!dataUrl.startsWith('data:')) return dataUrl

  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!matches) return null

  const buffer = Buffer.from(matches[2], 'base64')

  const { data: uploadData, error } = await storageClient.storage
    .from(bucket)
    .upload(filePath, buffer, { contentType, cacheControl: '3600', upsert: true })

  if (error) {
    console.error(`[ActualizarFormulario] Error subiendo ${filePath}:`, error.message)
    return null
  }

  return storageClient.storage.from(bucket).getPublicUrl(uploadData.path).data.publicUrl
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { visitaId, datos } = body

    if (!visitaId || !datos) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    // ── Obtener la caracterización ──────────────────────────────────────────
    const carac = await prisma.caracterizaciones.findFirst({
      where: { id_visita: visitaId },
      select: { id: true, id_predio: true, id_beneficiario: true },
    })

    if (!carac) {
      return NextResponse.json({ error: 'Formulario no encontrado' }, { status: 404 })
    }

    const { id_predio: predioId, id_beneficiario: beneficiarioId } = carac

    // ── Verificar propiedad por rol ─────────────────────────────────────────
    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { rol: true, numero_documento: true },
    })

    if (profile?.rol === 'agricultor') {
      const ownBenef = profile.numero_documento
        ? await prisma.beneficiarios.findFirst({ where: { numero_documento: profile.numero_documento }, select: { id: true } })
        : await prisma.beneficiarios.findFirst({ where: { correo: user.email ?? undefined }, select: { id: true } })

      if (!ownBenef || ownBenef.id !== beneficiarioId) {
        return NextResponse.json({ error: 'No autorizado para editar este formulario' }, { status: 403 })
      }
    } else if (profile?.rol === 'asesor') {
      const visita = await prisma.visitas.findUnique({ where: { id: visitaId }, select: { asesor_id: true } })
      if (!visita || (visita.asesor_id && visita.asesor_id !== user.id)) {
        return NextResponse.json({ error: 'No autorizado para editar este formulario' }, { status: 403 })
      }
    }

    // ── 1. Visita ───────────────────────────────────────────────────────────
    await prisma.visitas.update({
      where: { id: visitaId },
      data: {
        fecha_visita: datos.visita.fechaVisita ? new Date(datos.visita.fechaVisita) : undefined,
        updated_at:   new Date(),
      },
    })

    // ── 2. Beneficiario ─────────────────────────────────────────────────────
    const nombres   = [datos.beneficiario.primerNombre, datos.beneficiario.segundoNombre].filter(Boolean).join(' ') || datos.beneficiario.nombres || ''
    const apellidos = [datos.beneficiario.primerApellido, datos.beneficiario.segundoApellido].filter(Boolean).join(' ') || datos.beneficiario.apellidos || ''

    await prisma.beneficiarios.update({
      where: { id: beneficiarioId },
      data: {
        tipo_documento:                  datos.beneficiario.tipoDocumento || undefined,
        nombres,
        apellidos,
        correo:                          datos.beneficiario.email || datos.beneficiario.correo || null,
        fecha_nacimiento:                datos.beneficiario.fechaNacimiento ? new Date(datos.beneficiario.fechaNacimiento) : null,
        edad:                            datos.beneficiario.edad ?? null,
        telefono:                        datos.beneficiario.telefono || null,
        ocupacion_principal:             datos.beneficiario.ocupacionPrincipal || null,
        genero:                          datos.beneficiario.genero || null,
        personas_a_cargo:                datos.beneficiario.personasACargo ?? null,
        nombre_contacto_secundario:      datos.beneficiario.nombreContactoSecundario || null,
        telefono_secundario:             datos.beneficiario.telefonoSecundario || null,
        parentesco_contacto_secundario:  datos.beneficiario.parentescoContactoSecundario || null,
        asociacion:                      datos.beneficiario.asociacion || null,
        updated_at:                      new Date(),
      },
    })

    // ── 3. Predio ───────────────────────────────────────────────────────────
    await prisma.predios.update({
      where: { id: predioId },
      data: {
        nombre_predio:             datos.predio.nombrePredio || undefined,
        departamento:              datos.predio.departamento || undefined,
        municipio:                 datos.predio.municipio || undefined,
        vereda:                    datos.predio.vereda || null,
        tipo_tenencia:             datos.predio.tipoTenencia || null,
        tipo_tenencia_otro:        datos.predio.tipoTenenciaOtro || null,
        documento_tenencia:        datos.predio.documentoTenencia || null,
        area_total_hectareas:      datos.predio.areaTotalHectareas ?? null,
        area_productiva_hectareas: datos.predio.areaProductivaHectareas ?? null,
        latitud:                   datos.predio.latitud ?? null,
        longitud:                  datos.predio.longitud ?? null,
        coordenada_x:              datos.predio.coordenadaX || null,
        coordenada_y:              datos.predio.coordenadaY || null,
        poligono:                  datos.predio.poligono !== undefined ? datos.predio.poligono : null,
        altitud_msnm:              datos.predio.altitudMsnm ?? null,
        direccion:                 datos.predio.direccion || null,
        codigo_catastral:          datos.predio.codigoCatastral || null,
        vive_en_predio:            datos.predio.viveEnPredio || null,
        tiene_vivienda:            datos.predio.tieneVivienda ?? null,
        cultivos_existentes:       datos.predio.cultivosExistentes || null,
        updated_at:                new Date(),
      },
    })

    // Helper upsert sub-tablas de predio
    const upsertByPredio = async <T extends { id_predio: string }>(
      table: 'caracterizacion_predio' | 'abastecimiento_agua' | 'riesgos_predio' | 'area_productiva',
      data: Omit<T, 'id_predio' | 'id'>
    ) => {
      const existing = await (prisma[table] as any).findFirst({ where: { id_predio: predioId }, select: { id: true } })
      if (existing) {
        await (prisma[table] as any).update({ where: { id: existing.id }, data })
      } else {
        await (prisma[table] as any).create({ data: { id_predio: predioId, ...data } })
      }
    }

    // ── 4-7. Sub-tablas del predio ──────────────────────────────────────────
    await Promise.all([
      upsertByPredio('caracterizacion_predio', {
        ruta_acceso:         datos.caracterizacion.rutaAcceso || null,
        distancia_km:        datos.caracterizacion.distanciaKm ?? null,
        tiempo_acceso:       datos.caracterizacion.tiempoAcceso || null,
        temperatura_celsius: datos.caracterizacion.temperaturaCelsius ?? null,
        meses_lluvia:        datos.caracterizacion.mesesLluvia || null,
        topografia:          datos.caracterizacion.topografia || null,
        cobertura_bosque:    datos.caracterizacion.coberturaBosque ?? false,
        cobertura_cultivos:  datos.caracterizacion.coberturaCultivos ?? false,
        cobertura_pastos:    datos.caracterizacion.coberturaPastos ?? false,
        cobertura_rastrojo:  datos.caracterizacion.coberturaRastrojo ?? false,
        updated_at:          new Date(),
      }),
      upsertByPredio('abastecimiento_agua', {
        nacimiento_manantial: datos.aguaRiesgos.nacimientoManantial ?? false,
        rio_quebrada:         datos.aguaRiesgos.rioQuebrada ?? false,
        pozo:                 datos.aguaRiesgos.pozo ?? false,
        acueducto_rural:      datos.aguaRiesgos.acueductoRural ?? false,
        canal_distrito_riego: datos.aguaRiesgos.canalDistritoRiego ?? false,
        jaguey_reservorio:    datos.aguaRiesgos.jagueyReservorio ?? false,
        agua_lluvia:          datos.aguaRiesgos.aguaLluvia ?? false,
        otra_fuente:          datos.aguaRiesgos.otraFuente || null,
      }),
      upsertByPredio('riesgos_predio', {
        inundacion:    datos.aguaRiesgos.inundacion ?? false,
        sequia:        datos.aguaRiesgos.sequia ?? false,
        viento:        datos.aguaRiesgos.viento ?? false,
        helada:        datos.aguaRiesgos.helada ?? false,
        otros_riesgos: datos.aguaRiesgos.otrosRiesgos || null,
      }),
      upsertByPredio('area_productiva', {
        sistema_productivo:                  datos.areaProductiva.sistemaProductivo || null,
        caracterizacion_cultivo:             datos.areaProductiva.caracterizacionCultivo || null,
        cantidad_produccion:                 datos.areaProductiva.cantidadProduccion || null,
        estado_cultivo:                      datos.areaProductiva.estadoCultivo || null,
        tiene_infraestructura_procesamiento: datos.areaProductiva.tieneInfraestructuraProcesamiento ?? false,
        estructuras:                         datos.areaProductiva.estructuras || null,
        interesado_programa:                 datos.areaProductiva.interesadoPrograma ?? false,
        donde_comercializa:                  datos.areaProductiva.dondeComercializa || null,
        ingreso_mensual_ventas:              datos.areaProductiva.ingresoMensualVentas ?? null,
        sistema_productivo_interes:          datos.areaProductiva.sistemaProductivoInteres || null,
        hectareas_siembra_nueva:             datos.areaProductiva.hectareasSiembraNueva ?? null,
        hectareas_renovacion:               datos.areaProductiva.hectareasRenovacion ?? null,
        updated_at:                          new Date(),
      }),
    ])

    // ── 8. Información financiera ───────────────────────────────────────────
    const finData = {
      ingresos_mensuales_agropecuaria: datos.infoFinanciera?.ingresosMensualesAgropecuaria ?? null,
      ingresos_mensuales_otros:        datos.infoFinanciera?.ingresosMensualesOtros ?? null,
      egresos_mensuales:               datos.infoFinanciera?.egresosMensuales ?? null,
      activos_totales:                 datos.infoFinanciera?.activosTotales ?? null,
      activos_agropecuaria:            datos.infoFinanciera?.activosAgropecuaria ?? null,
      pasivos_totales:                 datos.infoFinanciera?.pasivosTotales ?? null,
      updated_at:                      new Date(),
    }
    const existingFin = await prisma.informacion_financiera.findFirst({
      where:   { id_beneficiario: beneficiarioId },
      orderBy: { created_at: 'desc' },
      select:  { id: true },
    })
    if (existingFin) {
      await prisma.informacion_financiera.update({ where: { id: existingFin.id }, data: finData })
    } else {
      await prisma.informacion_financiera.create({ data: { id_beneficiario: beneficiarioId, ...finData } })
    }

    // ── 9. Subir fotos (Supabase Storage) ──────────────────────────────────
    const storageClient = createStorageClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const timestamp = Date.now()
    const prefix    = datos.beneficiario?.numeroDocumento || visitaId.substring(0, 8)

    const [fotoBeneficiarioUrl, foto1Url, foto2Url, firmaUrl, fotoDocFrontalUrl, fotoDocTraseraUrl] =
      await Promise.all([
        uploadBase64ToStorage(storageClient, datos.archivos.fotoBeneficiario,  'fotos-productores',   `${prefix}/foto-beneficiario-${timestamp}.jpg`, 'image/jpeg'),
        uploadBase64ToStorage(storageClient, datos.archivos.foto1Url,          'fotos-productores',   `${prefix}/foto-1-${timestamp}.jpg`,             'image/jpeg'),
        uploadBase64ToStorage(storageClient, datos.archivos.foto2Url,          'fotos-productores',   `${prefix}/foto-2-${timestamp}.jpg`,             'image/jpeg'),
        uploadBase64ToStorage(storageClient, datos.archivos.firmaProductorUrl, 'firmas',              `${prefix}/firma-${timestamp}.png`,              'image/png'),
        uploadBase64ToStorage(storageClient, datos.archivos.fotoDocFrontalUrl, 'documentos-identidad',`${prefix}/doc-frontal-${timestamp}.jpg`,        'image/jpeg'),
        uploadBase64ToStorage(storageClient, datos.archivos.fotoDocTraseraUrl, 'documentos-identidad',`${prefix}/doc-trasera-${timestamp}.jpg`,        'image/jpeg'),
      ])

    // ── 10. Actualizar URLs en caracterizaciones ───────────────────────────
    await prisma.caracterizaciones.update({
      where: { id: carac.id },
      data: {
        observaciones:        datos.observaciones ?? null,
        updated_at:           new Date(),
        ...(fotoBeneficiarioUrl && { foto_beneficiario_url: fotoBeneficiarioUrl }),
        ...(foto1Url           && { foto_1_url:             foto1Url           }),
        ...(foto2Url           && { foto_2_url:             foto2Url           }),
        ...(firmaUrl           && { firma_productor_url:    firmaUrl           }),
        ...(fotoDocFrontalUrl  && { foto_doc_frontal_url:   fotoDocFrontalUrl  }),
        ...(fotoDocTraseraUrl  && { foto_doc_trasera_url:   fotoDocTraseraUrl  }),
      },
    })

    return NextResponse.json({ success: true, mensaje: 'Formulario actualizado correctamente' })
  } catch (err) {
    console.error('[API Actualizar] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
