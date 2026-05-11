import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient, SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { sendEmail, buildSyncNotificationEmail, buildConfirmacionRegistroEmail } from '@/lib/email/mailer'
import { prisma } from '@/lib/prisma'

/**
 * Sube un base64 data URL a Supabase Storage y retorna la URL pública.
 * Si el valor ya es una URL normal (no base64), lo retorna tal cual.
 * Si es null/undefined/vacío, retorna null.
 */
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
  if (base64Data.length > 10_485_760) {
    console.warn('[API] Archivo base64 excede el límite, ignorando')
    return null
  }
  const buffer = Buffer.from(base64Data, 'base64')

  const MAX_ATTEMPTS = 3
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, { contentType, cacheControl: '3600', upsert: true })

    if (!uploadError) {
      return supabase.storage.from(bucket).getPublicUrl(uploadData.path).data.publicUrl
    }

    if (attempt < MAX_ATTEMPTS) {
      console.warn(`[API] Intento ${attempt} fallido para ${bucket}/${filePath}: ${uploadError.message}. Reintentando...`)
      await new Promise(r => setTimeout(r, 600 * attempt))
    } else {
      console.error(`[API] Error subiendo ${bucket}/${filePath} tras ${MAX_ATTEMPTS} intentos:`, uploadError.message)
    }
  }
  return null
}

function generateRadicadoOficial(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const random = crypto.randomBytes(4).toString('hex').toUpperCase()
  return `RAD-${year}${month}${day}-${random}`
}

async function ensureStorageBuckets(adminClient: SupabaseClient): Promise<void> {
  const buckets = [
    { name: 'fotos-productores', public: true },
    { name: 'firmas', public: true },
    { name: 'fotos-predios', public: true },
    { name: 'documentos-identidad', public: true },
  ]

  const { data: existingBuckets } = await adminClient.storage.listBuckets()
  const existing = new Set((existingBuckets || []).map((b: { name: string }) => b.name))

  for (const bucket of buckets) {
    if (!existing.has(bucket.name)) {
      await adminClient.storage.createBucket(bucket.name, {
        public: bucket.public,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        fileSizeLimit: 10485760,
      }).catch(e => console.warn(`[API] No se pudo crear bucket '${bucket.name}':`, e))
    }
  }
}

/**
 * POST /api/caracterizaciones
 * Crea una caracterización completa (visita + beneficiario + predio + sub-tablas).
 * - Si el usuario está autenticado como asesor/admin: asesor_id = user.id.
 * - Si no hay sesión: asesor_id queda null (se auto-asigna al de menor carga).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { offlineSync, ...c } = body

    // === Idempotencia: detectar reintentos offline ya comprometidos ===
    // El header X-Sync-Id es el localId de IndexedDB. Si ya existe una visita
    // con ese valor en codigo_formulario, el primer intento tuvo éxito y el cliente
    // reintenta por un timeout de red. Devolvemos 200 para que borre el form local.
    const syncId = request.headers.get('X-Sync-Id')
    if (syncId) {
      const serviceRoleKeyEarly = process.env.SUPABASE_SERVICE_ROLE_KEY
      const supabaseUrlEarly = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (serviceRoleKeyEarly && supabaseUrlEarly) {
        const adminEarly = createAdminClient(supabaseUrlEarly, serviceRoleKeyEarly)
        const { data: existingVisita } = await adminEarly
          .from('visitas')
          .select('radicado_oficial')
          .eq('codigo_formulario', syncId)
          .maybeSingle()
        if (existingVisita) {
          return NextResponse.json(
            { radicadoOficial: existingVisita.radicado_oficial || 'YA_REGISTRADO', duplicate: true },
            { status: 200 }
          )
        }
      }
    }

    // === Auth: sesión opcional ===
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let asesorId: string | null = null
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('rol')
        .eq('id', user.id)
        .single()
      if (profile?.rol === 'asesor' || profile?.rol === 'admin') {
        asesorId = user.id
      }
    }

    // === Auto-asignación: asesor con menor carga cuando no hay asesor autenticado ===
    let asesorAutoNombre: string | null = null
    if (!asesorId) {
      const supabaseUrl2 = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceRoleKey2 = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (supabaseUrl2 && serviceRoleKey2) {
        const adminForAssign = createAdminClient(supabaseUrl2, serviceRoleKey2)
        const { data: asesores } = await adminForAssign
          .from('profiles')
          .select('id, nombre_completo')
          .eq('rol', 'asesor')
          .eq('activo', true)

        if (asesores && asesores.length > 0) {
          const asesorIds = asesores.map((a: { id: string; nombre_completo: string }) => a.id)
          const { data: visitasCounts } = await adminForAssign
            .from('visitas')
            .select('asesor_id')
            .in('asesor_id', asesorIds)
          const countMap = new Map<string, number>()
          for (const v of (visitasCounts ?? [])) {
            countMap.set(v.asesor_id, (countMap.get(v.asesor_id) ?? 0) + 1)
          }
          const counts = asesores.map((a: { id: string; nombre_completo: string }) => ({
            id: a.id,
            nombre: a.nombre_completo,
            count: countMap.get(a.id) ?? 0,
          }))
          counts.sort((a: { count: number }, b: { count: number }) => a.count - b.count)
          asesorId = counts[0].id
          asesorAutoNombre = counts[0].nombre
        }
      }
    }

    // === Validación mínima ===
    const docNum = c.beneficiario?.numeroDocumento
    if (!docNum) {
      return NextResponse.json({ error: 'Número de documento del agricultor es requerido' }, { status: 400 })
    }

    // === Cliente admin (bypass RLS para inserts en cascada) ===
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 })
    }
    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey)

    await ensureStorageBuckets(adminClient).catch(e => console.warn('[API] ensureStorageBuckets:', e))

    // === Validar correo duplicado con distinto documento ===
    const correoEnviado = c.beneficiario?.email
    if (correoEnviado) {
      const { data: benefExistente } = await adminClient
        .from('beneficiarios')
        .select('numero_documento')
        .eq('correo', correoEnviado)
        .maybeSingle()

      if (benefExistente && benefExistente.numero_documento !== docNum) {
        return NextResponse.json(
          { error: 'El correo electrónico ingresado ya está registrado con otro número de documento.' },
          { status: 409 }
        )
      }
    }

    const radicadoOficial = generateRadicadoOficial()

    // === 1. BENEFICIARIO — upsert atómico ===
    // Usar upsert con onConflict garantiza que peticiones simultáneas con el mismo
    // numero_documento no generen dos beneficiarios distintos (condición de carrera).
    // Requiere UNIQUE constraint en beneficiarios.numero_documento.
    const benefData = {
      tipo_documento: c.beneficiario?.tipoDocumento || 'CC',
      numero_documento: docNum,
      nombres: [c.beneficiario?.primerNombre, c.beneficiario?.segundoNombre].filter(Boolean).join(' ').trim() || 'Sin nombre',
      apellidos: [c.beneficiario?.primerApellido, c.beneficiario?.segundoApellido].filter(Boolean).join(' ').trim() || 'Sin apellido',
      fecha_nacimiento: c.beneficiario?.fechaNacimiento || null,
      edad: c.beneficiario?.edad ?? null,
      telefono: c.beneficiario?.telefono || null,
      correo: c.beneficiario?.email || null,
      ocupacion_principal: c.beneficiario?.ocupacionPrincipal || null,
      genero: c.beneficiario?.genero || null,
      personas_a_cargo: c.beneficiario?.personasACargo ?? null,
      nombre_contacto_secundario: c.beneficiario?.nombreContactoSecundario || null,
      telefono_secundario: c.beneficiario?.telefonoSecundario || null,
      parentesco_contacto_secundario: c.beneficiario?.parentescoContactoSecundario || null,
      asociacion: c.beneficiario?.asociacion || null,
    }

    const { data: benefResult, error: benefErr } = await adminClient
      .from('beneficiarios')
      .upsert(benefData, { onConflict: 'numero_documento' })
      .select('id')
      .single()
    if (benefErr) throw new Error(`Error creando beneficiario: ${benefErr.message}`)
    const beneficiarioId = benefResult.id

    // === Validar proceso activo / duplicado ===
    // Se corre SIEMPRE (no solo si el beneficiario ya existía), porque upsert puede
    // haber resuelto una condición de carrera y el beneficiario fue creado por otra petición.
    const ESTADOS_BLOQUEANTES = ['INICIADO', 'REVISADO', 'EN_ESTUDIO_CREDITO', 'SINCRONIZADO', 'EN_REVISION', 'RECHAZADO']
    const { data: caracActiva } = await adminClient
      .from('caracterizaciones')
      .select('id, estado, radicado_oficial')
      .eq('id_beneficiario', beneficiarioId)
      .in('estado', ESTADOS_BLOQUEANTES)
      .limit(1)
      .maybeSingle()

    if (caracActiva) {
      // Si es sync offline, devolver 200 para que el cliente descarte el formulario
      // de IndexedDB sin tratarlo como error y no reintente indefinidamente.
      if (offlineSync) {
        return NextResponse.json(
          { radicadoOficial: caracActiva.radicado_oficial || 'YA_REGISTRADO', duplicate: true },
          { status: 200 }
        )
      }
      return NextResponse.json(
        { error: 'Este agricultor ya tiene un proceso activo. Solo puede iniciar uno nuevo cuando el proceso actual esté cancelado o aprobado.' },
        { status: 409 }
      )
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
      await prisma.abastecimiento_agua.create({
        data: {
          id_predio: predioId,
          nacimiento_manantial: c.aguaRiesgos.nacimientoManantial ?? false,
          rio_quebrada:         c.aguaRiesgos.rioQuebrada ?? false,
          pozo:                 c.aguaRiesgos.pozo ?? false,
          acueducto_rural:      c.aguaRiesgos.acueductoRural ?? false,
          canal_distrito_riego: c.aguaRiesgos.canalDistritoRiego ?? false,
          jaguey_reservorio:    c.aguaRiesgos.jagueyReservorio ?? false,
          agua_lluvia:          c.aguaRiesgos.aguaLluvia ?? false,
          otra_fuente:          c.aguaRiesgos.otraFuente || null,
        },
      })
    }

    // === 4. RIESGOS ===
    if (c.aguaRiesgos) {
      await prisma.riesgos_predio.create({
        data: {
          id_predio:     predioId,
          inundacion:    c.aguaRiesgos.inundacion ?? false,
          sequia:        c.aguaRiesgos.sequia ?? false,
          viento:        c.aguaRiesgos.viento ?? false,
          helada:        c.aguaRiesgos.helada ?? false,
          otros_riesgos: c.aguaRiesgos.otrosRiesgos || null,
        },
      })
    }

    // === 5. CARACTERIZACION PREDIO ===
    if (c.caracterizacion) {
      await prisma.caracterizacion_predio.create({
        data: {
          id_predio:           predioId,
          ruta_acceso:         c.caracterizacion.rutaAcceso || null,
          distancia_km:        c.caracterizacion.distanciaKm ?? null,
          tiempo_acceso:       c.caracterizacion.tiempoAcceso || null,
          temperatura_celsius: c.caracterizacion.temperaturaCelsius ?? null,
          meses_lluvia:        c.caracterizacion.mesesLluvia || null,
          topografia:          c.caracterizacion.topografia || null,
          cobertura_bosque:    c.caracterizacion.coberturaBosque ?? false,
          cobertura_cultivos:  c.caracterizacion.coberturaCultivos ?? false,
          cobertura_pastos:    c.caracterizacion.coberturaPastos ?? false,
          cobertura_rastrojo:  c.caracterizacion.coberturaRastrojo ?? false,
        },
      })
    }

    // === 6. AREA PRODUCTIVA ===
    if (c.areaProductiva) {
      await prisma.area_productiva.create({
        data: {
          id_predio:                           predioId,
          sistema_productivo:                  c.areaProductiva.sistemaProductivo || null,
          caracterizacion_cultivo:             c.areaProductiva.caracterizacionCultivo || null,
          cantidad_produccion:                 c.areaProductiva.cantidadProduccion || null,
          estado_cultivo:                      c.areaProductiva.estadoCultivo || null,
          tiene_infraestructura_procesamiento: c.areaProductiva.tieneInfraestructuraProcesamiento ?? false,
          estructuras:                         c.areaProductiva.estructuras || null,
          interesado_programa:                 c.areaProductiva.interesadoPrograma ?? false,
          donde_comercializa:                  c.areaProductiva.dondeComercializa || null,
          ingreso_mensual_ventas:              c.areaProductiva.ingresoMensualVentas ?? null,
          sistema_productivo_interes:          c.areaProductiva.sistemaProductivoInteres || null,
          hectareas_siembra_nueva:             c.areaProductiva.hectareasSiembraNueva ?? null,
          hectareas_renovacion:                c.areaProductiva.hectareasRenovacion ?? null,
        },
      })
    }

    // === 7. INFORMACION FINANCIERA (upsert por beneficiario) ===
    if (c.infoFinanciera) {
      const finData = {
        ingresos_mensuales_agropecuaria: c.infoFinanciera.ingresosMensualesAgropecuaria ?? null,
        ingresos_mensuales_otros: c.infoFinanciera.ingresosMensualesOtros ?? null,
        egresos_mensuales: c.infoFinanciera.egresosMensuales ?? null,
        activos_totales: c.infoFinanciera.activosTotales ?? null,
        activos_agropecuaria: c.infoFinanciera.activosAgropecuaria ?? null,
        pasivos_totales: c.infoFinanciera.pasivosTotales ?? null,
      }

      const { data: existingFin } = await adminClient
        .from('informacion_financiera')
        .select('id')
        .eq('id_beneficiario', beneficiarioId)
        .maybeSingle()

      if (existingFin) {
        await adminClient.from('informacion_financiera').update(finData).eq('id', existingFin.id)
      } else {
        await adminClient.from('informacion_financiera').insert({ id_beneficiario: beneficiarioId, ...finData })
      }
    }

    // === 8. VISITA ===
    const { data: newVisita, error: visitaErr } = await adminClient
      .from('visitas')
      .insert({
        fecha_visita: c.visita?.fechaVisita || new Date().toISOString().split('T')[0],
        nombre_tecnico: asesorAutoNombre || c.visita?.nombreTecnico || '',
        codigo_formulario: c.visita?.codigoFormulario || null,
        version_formulario: c.visita?.versionFormulario || '1.0',
        fecha_emision_formulario: c.visita?.fechaEmisionFormulario || null,
        radicado_oficial: radicadoOficial,
        asesor_id: asesorId,
      })
      .select('id')
      .single()
    if (visitaErr) throw new Error(`Error creando visita: ${visitaErr.message}`)
    const visitaId = newVisita.id

    // === 9. Vincular beneficiario con visita ===
    await adminClient
      .from('beneficiarios')
      .update({ id_visita: visitaId, updated_at: new Date().toISOString() })
      .eq('id', beneficiarioId)

    // === 10. Subir archivos a Storage ===
    const timestamp = Date.now()
    const uploadResults = await Promise.allSettled([
      uploadBase64ToStorage(adminClient, c.archivos?.fotoBeneficiario || null, 'fotos-productores', `${docNum}/foto-beneficiario-${timestamp}.jpg`, 'image/jpeg'),
      uploadBase64ToStorage(adminClient, c.archivos?.foto1Url || null, 'fotos-productores', `${docNum}/foto-1-${timestamp}.jpg`, 'image/jpeg'),
      uploadBase64ToStorage(adminClient, c.archivos?.foto2Url || null, 'fotos-productores', `${docNum}/foto-2-${timestamp}.jpg`, 'image/jpeg'),
      uploadBase64ToStorage(adminClient, c.archivos?.firmaProductorUrl || c.autorizacion?.firmaDigital || null, 'firmas', `${docNum}/firma-${timestamp}.png`, 'image/png'),
      uploadBase64ToStorage(adminClient, c.archivos?.fotoDocFrontalUrl || null, 'documentos-identidad', `${docNum}/doc-frontal-${timestamp}.jpg`, 'image/jpeg'),
      uploadBase64ToStorage(adminClient, c.archivos?.fotoDocTraseraUrl || null, 'documentos-identidad', `${docNum}/doc-trasera-${timestamp}.jpg`, 'image/jpeg'),
    ])
    const [fotoBeneficiarioUrl, foto1Url, foto2Url, firmaUrl, fotoDocFrontalUrl, fotoDocTraseraUrl] =
      uploadResults.map(r => r.status === 'fulfilled' ? r.value : null)

    // === 11. CARACTERIZACION (registro central) ===
    // Segundo chequeo de duplicado justo antes del insert: captura casos donde un
    // intento previo falló después del paso 1 (beneficiario) pero antes de este punto,
    // dejando al beneficiario sin caracterización y permitiendo que un reintento pase
    // el primer chequeo. Con este segundo chequeo se bloquea el reintento correctamente.
    const { data: caracActivaFinal } = await adminClient
      .from('caracterizaciones')
      .select('id, estado, radicado_oficial')
      .eq('id_beneficiario', beneficiarioId)
      .in('estado', ESTADOS_BLOQUEANTES)
      .limit(1)
      .maybeSingle()

    if (caracActivaFinal) {
      if (offlineSync) {
        return NextResponse.json(
          { radicadoOficial: caracActivaFinal.radicado_oficial || 'YA_REGISTRADO', duplicate: true },
          { status: 200 }
        )
      }
      return NextResponse.json(
        { error: 'Este agricultor ya tiene un proceso activo. Solo puede iniciar uno nuevo cuando el proceso actual esté cancelado o aprobado.' },
        { status: 409 }
      )
    }

    const { error: caracErr } = await adminClient
      .from('caracterizaciones')
      .insert({
        id_visita: visitaId,
        id_beneficiario: beneficiarioId,
        id_predio: predioId,
        observaciones: c.observaciones || null,
        foto_beneficiario_url: fotoBeneficiarioUrl,
        foto_1_url: foto1Url,
        foto_2_url: foto2Url,
        firma_productor_url: firmaUrl,
        foto_doc_frontal_url: fotoDocFrontalUrl,
        foto_doc_trasera_url: fotoDocTraseraUrl,
        autorizacion_datos_personales: c.autorizaciones?.autorizacionDatosPersonales ?? c.autorizacion?.autorizaTratamientoDatos ?? false,
        autorizacion_consulta_crediticia: c.autorizaciones?.autorizacionConsultaCrediticia ?? c.autorizacion?.autorizaConsultaCrediticia ?? false,
        autorizacion_aviso_privacidad: c.autorizaciones?.autorizacionAvisoPrivacidad ?? c.autorizacion?.autorizaAvisoPrivacidad ?? false,
        autorizacion_uso_imagen: c.autorizaciones?.autorizacionUsoImagen ?? c.autorizacion?.autorizaUsoImagen ?? false,
        estado: 'INICIADO',
      })
    if (caracErr) throw new Error(`Error creando caracterización: ${caracErr.message}`)

    // === 12. Crear cuenta + email al agricultor (si tiene correo) ===
    const correoAg = c.beneficiario?.email
    const nombreAg = [c.beneficiario?.primerNombre || '', c.beneficiario?.primerApellido || '']
      .filter(Boolean).join(' ') || 'Agricultor'
    const nombrePredio = c.predio?.nombrePredio || 'Sin nombre'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

    if (correoAg) {
      try {
        const { data: existingProfile } = await adminClient
          .from('profiles')
          .select('id')
          .eq('email', correoAg)
          .maybeSingle()

        if (!existingProfile) {
          const tempPassword = `Agro${crypto.randomBytes(4).toString('hex').toUpperCase()}!`
          const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
            email: correoAg,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { nombre_completo: nombreAg, rol: 'agricultor', numero_documento: docNum },
          })

          if (!createErr && newUser?.user) {
            await adminClient.from('profiles').upsert({
              id: newUser.user.id,
              email: correoAg,
              nombre_completo: nombreAg,
              rol: 'agricultor',
              activo: true,
              numero_documento: docNum,
            })

            await sendEmail({
              to: correoAg,
              subject: 'Tu caracterización agropecuaria fue registrada — Santander Agro360',
              html: buildSyncNotificationEmail({
                nombreCompleto: nombreAg,
                email: correoAg,
                password: tempPassword,
                radicadoOficial,
                nombrePredio,
                appUrl,
              }),
            })
          }
        } else {
          await sendEmail({
            to: correoAg,
            subject: 'Tu caracterización fue registrada — Santander Agro360',
            html: buildConfirmacionRegistroEmail({
              nombreCompleto: nombreAg,
              radicadoOficial,
              numeroDocumento: docNum,
              nombrePredio,
              appUrl,
            }),
          })
        }
      } catch (emailErr) {
        console.error('[API] Error enviando email (no bloquea):', emailErr)
      }
    }

    return NextResponse.json({
      exito: true,
      radicadoOficial,
      mensaje: 'Caracterización registrada correctamente',
    })
  } catch (err) {
    console.error('[API caracterizaciones]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}
