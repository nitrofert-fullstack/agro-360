import { NextResponse } from 'next/server'
import { createClient as createAdminClient, SupabaseClient } from '@supabase/supabase-js'
import {
  sendEmail,
  buildConfirmacionRegistroEmail,
  buildNuevoRegistroEmail,
} from '@/lib/email/mailer'

async function uploadBase64ToStorage(
  supabase: SupabaseClient,
  dataUrl: string | null | undefined,
  bucket: string,
  filePath: string,
  contentType: string
): Promise<string | null> {
  if (!dataUrl) return null
  if (!dataUrl.startsWith('data:')) return dataUrl

  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!matches) return null

  const base64Data = matches[2]
  const buffer = Buffer.from(base64Data, 'base64')

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, buffer, {
      contentType,
      cacheControl: '3600',
      upsert: true,
    })

  if (uploadError) {
    console.error(`[SyncPublic] Error subiendo archivo a ${bucket}/${filePath}:`, uploadError.message)
    return null
  }

  const { data: publicData } = supabase.storage
    .from(bucket)
    .getPublicUrl(uploadData.path)

  return publicData.publicUrl
}

function generateRadicadoOficial(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `RAD-${year}${month}${day}-${random}`
}

async function ensureStorageBuckets(adminClient: SupabaseClient): Promise<void> {
  const buckets = [
    { name: 'fotos-productores', public: true },
    { name: 'firmas', public: true },
    { name: 'fotos-predios', public: true },
  ]

  const { data: existingBuckets } = await adminClient.storage.listBuckets()
  const existing = new Set((existingBuckets || []).map((b: { name: string }) => b.name))

  for (const bucket of buckets) {
    if (!existing.has(bucket.name)) {
      await adminClient.storage.createBucket(bucket.name, {
        public: bucket.public,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        fileSizeLimit: 10485760,
      })
    }
  }
}

export async function POST(request: Request) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json(
      { error: 'Configuración del servidor incompleta' },
      { status: 500 }
    )
  }

  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey)

  try {
    const body = await request.json()
    const { caracterizaciones } = body

    if (!caracterizaciones || !Array.isArray(caracterizaciones)) {
      return NextResponse.json({ error: 'Datos invalidos' }, { status: 400 })
    }

    await ensureStorageBuckets(adminClient).catch(e =>
      console.warn('[SyncPublic] ensureStorageBuckets error:', e)
    )

    const results = []

    for (const c of caracterizaciones) {
      try {
        console.log(`[SyncPublic] Procesando: ${c.radicadoLocal}`)

        const docNum = c.beneficiario?.numeroDocumento || c.documentoProductor
        if (!docNum) {
          throw new Error('Número de documento del beneficiario es requerido')
        }

        const radicadoOficial = generateRadicadoOficial()

        // === 1. BENEFICIARIO ===
        const { data: existingBenef } = await adminClient
          .from('beneficiarios')
          .select('id')
          .eq('numero_documento', docNum)
          .maybeSingle()

        let beneficiarioId: string

        if (existingBenef) {
          await adminClient
            .from('beneficiarios')
            .update({
              tipo_documento: c.beneficiario?.tipoDocumento || 'CC',
              nombres: `${c.beneficiario?.primerNombre || ''} ${c.beneficiario?.segundoNombre || ''}`.trim(),
              apellidos: `${c.beneficiario?.primerApellido || ''} ${c.beneficiario?.segundoApellido || ''}`.trim(),
              edad: c.beneficiario?.edad ?? null,
              telefono: c.beneficiario?.telefono || null,
              correo: c.beneficiario?.email || null,
              ocupacion_principal: c.beneficiario?.ocupacionPrincipal || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingBenef.id)

          beneficiarioId = existingBenef.id
        } else {
          const { data: newBenef, error: benefErr } = await adminClient
            .from('beneficiarios')
            .insert({
              tipo_documento: c.beneficiario?.tipoDocumento || 'CC',
              numero_documento: docNum,
              nombres: `${c.beneficiario?.primerNombre || ''} ${c.beneficiario?.segundoNombre || ''}`.trim(),
              apellidos: `${c.beneficiario?.primerApellido || ''} ${c.beneficiario?.segundoApellido || ''}`.trim(),
              edad: c.beneficiario?.edad ?? null,
              telefono: c.beneficiario?.telefono || null,
              correo: c.beneficiario?.email || null,
              ocupacion_principal: c.beneficiario?.ocupacionPrincipal || null,
            })
            .select('id')
            .single()

          if (benefErr) throw new Error(`Error creando beneficiario: ${benefErr.message}`)
          beneficiarioId = newBenef.id
        }

        // === 2. PREDIO ===
        const { data: newPredio, error: predioErr } = await adminClient
          .from('predios')
          .insert({
            id_beneficiario: beneficiarioId,
            nombre_predio: c.predio?.nombrePredio || 'Sin nombre',
            departamento: c.predio?.departamento || c.visita?.departamento || 'Santander',
            municipio: c.predio?.municipio || c.visita?.municipio || null,
            vereda: c.predio?.vereda || c.visita?.vereda || null,
            direccion: c.predio?.direccion || null,
            codigo_catastral: c.predio?.codigoCatastral || null,
            documento_tenencia: c.predio?.documentoTenencia || null,
            tipo_tenencia: c.predio?.tipoTenencia || null,
            tipo_tenencia_otro: c.predio?.tipoTenenciaOtro || null,
            coordenada_x: c.predio?.coordenadaX || null,
            coordenada_y: c.predio?.coordenadaY || null,
            latitud: c.predio?.latitud ?? null,
            longitud: c.predio?.longitud ?? null,
            poligono: c.predio?.poligono ?? null,
            altitud_msnm: c.predio?.altitudMsnm ?? null,
            vive_en_predio: c.predio?.viveEnPredio || null,
            tiene_vivienda: c.predio?.tieneVivienda ?? false,
            area_total_hectareas: c.predio?.areaTotalHectareas ?? null,
            area_productiva_hectareas: c.predio?.areaProductivaHectareas ?? null,
            cultivos_existentes: c.predio?.cultivosExistentes || null,
          })
          .select('id')
          .single()

        if (predioErr) throw new Error(`Error creando predio: ${predioErr.message}`)
        const predioId = newPredio.id

        // === 3. ABASTECIMIENTO AGUA ===
        if (c.aguaRiesgos) {
          await adminClient.from('abastecimiento_agua').insert({
            id_predio: predioId,
            nacimiento_manantial: c.aguaRiesgos.nacimientoManantial ?? false,
            rio_quebrada: c.aguaRiesgos.rioQuebrada ?? false,
            pozo: c.aguaRiesgos.pozo ?? false,
            acueducto_rural: c.aguaRiesgos.acueductoRural ?? false,
            canal_distrito_riego: c.aguaRiesgos.canalDistritoRiego ?? false,
            jaguey_reservorio: c.aguaRiesgos.jagueyReservorio ?? false,
            agua_lluvia: c.aguaRiesgos.aguaLluvia ?? false,
            otra_fuente: c.aguaRiesgos.otraFuente || null,
          })
        }

        // === 4. RIESGOS PREDIO ===
        if (c.aguaRiesgos) {
          await adminClient.from('riesgos_predio').insert({
            id_predio: predioId,
            inundacion: c.aguaRiesgos.inundacion ?? false,
            sequia: c.aguaRiesgos.sequia ?? false,
            viento: c.aguaRiesgos.viento ?? false,
            helada: c.aguaRiesgos.helada ?? false,
            otros_riesgos: c.aguaRiesgos.otrosRiesgos || null,
          })
        }

        // === 5. CARACTERIZACION PREDIO ===
        if (c.caracterizacion) {
          await adminClient.from('caracterizacion_predio').insert({
            id_predio: predioId,
            ruta_acceso: c.caracterizacion.rutaAcceso || null,
            distancia_km: c.caracterizacion.distanciaKm ?? null,
            tiempo_acceso: c.caracterizacion.tiempoAcceso || null,
            temperatura_celsius: c.caracterizacion.temperaturaCelsius ?? null,
            meses_lluvia: c.caracterizacion.mesesLluvia || null,
            topografia: c.caracterizacion.topografia || null,
            cobertura_bosque: c.caracterizacion.coberturaBosque ?? false,
            cobertura_cultivos: c.caracterizacion.coberturaCultivos ?? false,
            cobertura_pastos: c.caracterizacion.coberturaPastos ?? false,
            cobertura_rastrojo: c.caracterizacion.coberturaRastrojo ?? false,
          })
        }

        // === 6. AREA PRODUCTIVA ===
        if (c.areaProductiva) {
          await adminClient.from('area_productiva').insert({
            id_predio: predioId,
            sistema_productivo: c.areaProductiva.sistemaProductivo || null,
            caracterizacion_cultivo: c.areaProductiva.caracterizacionCultivo || null,
            cantidad_produccion: c.areaProductiva.cantidadProduccion || null,
            estado_cultivo: c.areaProductiva.estadoCultivo || null,
            tiene_infraestructura_procesamiento: c.areaProductiva.tieneInfraestructuraProcesamiento ?? false,
            estructuras: c.areaProductiva.estructuras || null,
            interesado_programa: c.areaProductiva.interesadoPrograma ?? false,
            donde_comercializa: c.areaProductiva.dondeComercializa || null,
            ingreso_mensual_ventas: c.areaProductiva.ingresoMensualVentas ?? null,
          })
        }

        // === 7. INFORMACION FINANCIERA ===
        if (c.infoFinanciera) {
          await adminClient.from('informacion_financiera').insert({
            id_beneficiario: beneficiarioId,
            ingresos_mensuales_agropecuaria: c.infoFinanciera.ingresosMensualesAgropecuaria ?? null,
            ingresos_mensuales_otros: c.infoFinanciera.ingresosMensualesOtros ?? null,
            egresos_mensuales: c.infoFinanciera.egresosMensuales ?? null,
            activos_totales: c.infoFinanciera.activosTotales ?? null,
            activos_agropecuaria: c.infoFinanciera.activosAgropecuaria ?? null,
            pasivos_totales: c.infoFinanciera.pasivosTotales ?? null,
          })
        }

        // === 8. VISITA (asesor_id es null para registros públicos) ===
        const { data: newVisita, error: visitaErr } = await adminClient
          .from('visitas')
          .insert({
            fecha_visita: c.visita?.fechaVisita || new Date().toISOString().split('T')[0],
            nombre_tecnico: c.visita?.nombreTecnico || 'Sin asesor',
            codigo_formulario: c.visita?.codigoFormulario || null,
            version_formulario: c.visita?.versionFormulario || '1.0',
            fecha_emision_formulario: c.visita?.fechaEmisionFormulario || null,
            radicado_local: c.radicadoLocal,
            radicado_oficial: radicadoOficial,
            estado: 'SINCRONIZADO',
            asesor_id: null,
          })
          .select('id')
          .single()

        if (visitaErr) throw new Error(`Error creando visita: ${visitaErr.message}`)
        const visitaId = newVisita.id

        // Actualizar beneficiario con id_visita
        await adminClient
          .from('beneficiarios')
          .update({ id_visita: visitaId, updated_at: new Date().toISOString() })
          .eq('id', beneficiarioId)

        // === 9. CARACTERIZACIONES (con fotos y firma) ===
        const timestamp = Date.now()
        const foto1Raw = c.archivos?.foto1Url || null
        const foto2Raw = c.archivos?.foto2Url || null
        const firmaRaw = c.archivos?.firmaProductorUrl || c.autorizacion?.firmaDigital || null

        const [foto1Url, foto2Url, firmaUrl] = await Promise.all([
          uploadBase64ToStorage(adminClient, foto1Raw, 'fotos-productores', `${c.radicadoLocal}/foto-1-${timestamp}.jpg`, 'image/jpeg'),
          uploadBase64ToStorage(adminClient, foto2Raw, 'fotos-productores', `${c.radicadoLocal}/foto-2-${timestamp}.jpg`, 'image/jpeg'),
          uploadBase64ToStorage(adminClient, firmaRaw, 'firmas', `${c.radicadoLocal}/firma-${timestamp}.png`, 'image/png'),
        ])

        await adminClient.from('caracterizaciones').insert({
          id_visita: visitaId,
          id_beneficiario: beneficiarioId,
          id_predio: predioId,
          observaciones: c.observaciones || null,
          foto_1_url: foto1Url,
          foto_2_url: foto2Url,
          firma_productor_url: firmaUrl,
          autorizacion_datos_personales: c.autorizacion?.autorizaTratamientoDatos ?? false,
          autorizacion_consulta_crediticia: c.autorizacion?.autorizaConsultaCrediticia ?? false,
        })

        // === 10. EMAILS ===
        const correobenef = c.beneficiario?.email
        const nombrebenef = [
          c.beneficiario?.primerNombre || '',
          c.beneficiario?.primerApellido || '',
        ].filter(Boolean).join(' ') || 'Productor'
        const nombrePredio = c.predio?.nombrePredio || 'Sin nombre'
        const municipio = c.predio?.municipio || c.visita?.municipio || 'Sin municipio'
        const fechaRegistro = new Date().toLocaleDateString('es-CO', {
          year: 'numeric', month: 'long', day: 'numeric',
        })

        // Email de confirmación al productor (si tiene correo)
        if (correobenef) {
          try {
            const html = buildConfirmacionRegistroEmail({
              nombreCompleto: nombrebenef,
              radicadoOficial,
              numeroDocumento: docNum,
              nombrePredio,
              appUrl,
            })
            await sendEmail({
              to: correobenef,
              subject: 'Tu solicitud de caracterización fue recibida — Agro360',
              html,
            })
            console.log(`[SyncPublic] Confirmación enviada a ${correobenef}`)
          } catch (emailErr) {
            console.error('[SyncPublic] Error enviando confirmación al productor:', emailErr)
          }
        }

        // Notificación a todos los admins y asesores
        try {
          const { data: asesores } = await adminClient
            .from('profiles')
            .select('email')
            .in('rol', ['admin', 'asesor'])
            .eq('activo', true)

          if (asesores && asesores.length > 0) {
            const html = buildNuevoRegistroEmail({
              nombreProductor: nombrebenef,
              numeroDocumento: docNum,
              nombrePredio,
              municipio,
              radicadoOficial,
              fechaRegistro,
              appUrl,
            })
            await Promise.all(
              asesores.map(a =>
                sendEmail({
                  to: a.email,
                  subject: `Nuevo registro: ${nombrebenef} — Agro360`,
                  html,
                })
              )
            )
            console.log(`[SyncPublic] Notificación enviada a ${asesores.length} asesor(es)/admin(s)`)
          }
        } catch (notifErr) {
          console.error('[SyncPublic] Error enviando notificación a asesores:', notifErr)
        }

        results.push({
          radicadoLocal: c.radicadoLocal,
          radicadoOficial,
          estado: 'SINCRONIZADO',
          mensaje: 'Sincronizado correctamente',
        })
      } catch (err) {
        console.error(`[SyncPublic] Error procesando ${c.radicadoLocal}:`, err)
        results.push({
          radicadoLocal: c.radicadoLocal,
          estado: 'ERROR',
          mensaje: err instanceof Error ? err.message : 'Error desconocido',
        })
      }
    }

    return NextResponse.json({ exito: true, resultados: results })
  } catch (err) {
    console.error('[SyncPublic] Error general:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}
