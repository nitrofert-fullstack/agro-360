import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Sube un base64 data URL a Supabase Storage y retorna la URL pública.
 * Si el valor ya es una URL (http/https), lo retorna tal cual.
 * Si es null/undefined/vacío, retorna null.
 */
async function uploadBase64ToStorage(
    adminClient: SupabaseClient,
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

    const { data: uploadData, error: uploadError } = await adminClient.storage
        .from(bucket)
        .upload(filePath, buffer, { contentType, cacheControl: '3600', upsert: true })

    if (uploadError) {
        console.error(`[ActualizarFormulario] Error subiendo ${filePath}:`, uploadError.message)
        return null
    }

    const { data: publicData } = adminClient.storage.from(bucket).getPublicUrl(uploadData.path)
    return publicData.publicUrl
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

        // Admin client para operaciones DB (evita problemas de RLS en updates)
        // La verificación de propiedad se hace en código antes de cualquier escritura
        const supabaseAdmin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Obtener la fila de caracterizaciones
        const { data: caracterizacion, error: caracErr } = await supabaseAdmin
            .from('caracterizaciones')
            .select('*')
            .eq('id_visita', visitaId)
            .single()

        if (caracErr || !caracterizacion) {
            return NextResponse.json({ error: 'Formulario no encontrado' }, { status: 404 })
        }

        const predioId = caracterizacion.id_predio
        const beneficiarioId = caracterizacion.id_beneficiario

        // Verificar propiedad según rol del usuario
        const { data: profile } = await supabase
            .from('profiles')
            .select('rol, numero_documento')
            .eq('id', user.id)
            .single()

        if (profile?.rol === 'campesino') {
            const numDoc = (profile as { numero_documento?: string | null }).numero_documento
            let benefQuery = supabase.from('beneficiarios').select('id')
            benefQuery = numDoc
                ? benefQuery.eq('numero_documento', numDoc)
                : benefQuery.eq('correo', user.email)
            const { data: beneficiario } = await benefQuery.maybeSingle()

            if (!beneficiario || beneficiario.id !== beneficiarioId) {
                return NextResponse.json({ error: 'No autorizado para editar este formulario' }, { status: 403 })
            }
        } else if (profile?.rol === 'asesor') {
            const { data: visita } = await supabase
                .from('visitas')
                .select('asesor_id')
                .eq('id', visitaId)
                .single()

            // Si la visita no existe, o tiene asesor asignado y no es este asesor → denegar
            if (!visita || (visita.asesor_id && visita.asesor_id !== user.id)) {
                return NextResponse.json({ error: 'No autorizado para editar este formulario' }, { status: 403 })
            }
        }
        // admin/analista: puede editar todos

        // 1. Visita — solo columnas que existen en el schema
        // (departamento, municipio, vereda, observaciones NO existen en visitas; están en predios/caracterizaciones)
        // NOTA: visitas.estado fue eliminado — el estado vive en caracterizaciones.estado
        await supabaseAdmin.from('visitas').update({
            fecha_visita: datos.visita.fechaVisita,
            updated_at: new Date().toISOString(),
        }).eq('id', visitaId)

        // 2. Beneficiario
        // El formulario envía primerNombre/segundoNombre/primerApellido/segundoApellido
        const nombres = [datos.beneficiario.primerNombre, datos.beneficiario.segundoNombre].filter(Boolean).join(' ')
            || datos.beneficiario.nombres || ''
        const apellidos = [datos.beneficiario.primerApellido, datos.beneficiario.segundoApellido].filter(Boolean).join(' ')
            || datos.beneficiario.apellidos || ''
        await supabaseAdmin.from('beneficiarios').update({
            tipo_documento: datos.beneficiario.tipoDocumento,
            nombres,
            apellidos,
            correo: datos.beneficiario.email || datos.beneficiario.correo || null,
            fecha_nacimiento: datos.beneficiario.fechaNacimiento || null,
            edad: datos.beneficiario.edad ?? null,
            telefono: datos.beneficiario.telefono || null,
            ocupacion_principal: datos.beneficiario.ocupacionPrincipal || null,
            genero: datos.beneficiario.genero || null,
            personas_a_cargo: datos.beneficiario.personasACargo ?? null,
            nombre_contacto_secundario: datos.beneficiario.nombreContactoSecundario || null,
            telefono_secundario: datos.beneficiario.telefonoSecundario || null,
            parentesco_contacto_secundario: datos.beneficiario.parentescoContactoSecundario || null,
            updated_at: new Date().toISOString(),
        }).eq('id', beneficiarioId)

        // 3. Predio
        await supabaseAdmin.from('predios').update({
            nombre_predio: datos.predio.nombrePredio,
            departamento: datos.predio.departamento,
            municipio: datos.predio.municipio,
            vereda: datos.predio.vereda,
            tipo_tenencia: datos.predio.tipoTenencia,
            tipo_tenencia_otro: datos.predio.tipoTenenciaOtro,
            documento_tenencia: datos.predio.documentoTenencia,
            area_total_hectareas: datos.predio.areaTotalHectareas ?? null,
            area_productiva_hectareas: datos.predio.areaProductivaHectareas ?? null,
            latitud: datos.predio.latitud,
            longitud: datos.predio.longitud,
            coordenada_x: datos.predio.coordenadaX || null,
            coordenada_y: datos.predio.coordenadaY || null,
            poligono: datos.predio.poligono,
            altitud_msnm: datos.predio.altitudMsnm ?? null,
            direccion: datos.predio.direccion,
            codigo_catastral: datos.predio.codigoCatastral,
            vive_en_predio: datos.predio.viveEnPredio,
            tiene_vivienda: datos.predio.tieneVivienda,
            cultivos_existentes: datos.predio.cultivosExistentes,
        }).eq('id', predioId)

        // Helper: update si existe, insert si no (evita fallo silencioso de update en fila inexistente)
        const upsertByPredio = async (table: string, data: Record<string, unknown>) => {
            const { data: existing } = await supabaseAdmin.from(table).select('id').eq('id_predio', predioId).maybeSingle()
            if (existing) {
                await supabaseAdmin.from(table).update(data).eq('id_predio', predioId)
            } else {
                await supabaseAdmin.from(table).insert({ id_predio: predioId, ...data })
            }
        }

        // 4. Caracterizacion predio
        await upsertByPredio('caracterizacion_predio', {
            ruta_acceso: datos.caracterizacion.rutaAcceso,
            distancia_km: datos.caracterizacion.distanciaKm ?? null,
            tiempo_acceso: datos.caracterizacion.tiempoAcceso,
            temperatura_celsius: datos.caracterizacion.temperaturaCelsius ?? null,
            meses_lluvia: datos.caracterizacion.mesesLluvia,
            topografia: datos.caracterizacion.topografia,
            cobertura_bosque: datos.caracterizacion.coberturaBosque,
            cobertura_cultivos: datos.caracterizacion.coberturaCultivos,
            cobertura_pastos: datos.caracterizacion.coberturaPastos,
            cobertura_rastrojo: datos.caracterizacion.coberturaRastrojo,
        })

        // 5. Abastecimiento agua
        await upsertByPredio('abastecimiento_agua', {
            nacimiento_manantial: datos.aguaRiesgos.nacimientoManantial,
            rio_quebrada: datos.aguaRiesgos.rioQuebrada,
            pozo: datos.aguaRiesgos.pozo,
            acueducto_rural: datos.aguaRiesgos.acueductoRural,
            canal_distrito_riego: datos.aguaRiesgos.canalDistritoRiego,
            jaguey_reservorio: datos.aguaRiesgos.jagueyReservorio,
            agua_lluvia: datos.aguaRiesgos.aguaLluvia,
            otra_fuente: datos.aguaRiesgos.otraFuente || null,
        })

        // 6. Riesgos predio
        await upsertByPredio('riesgos_predio', {
            inundacion: datos.aguaRiesgos.inundacion,
            sequia: datos.aguaRiesgos.sequia,
            viento: datos.aguaRiesgos.viento,
            helada: datos.aguaRiesgos.helada,
            otros_riesgos: datos.aguaRiesgos.otrosRiesgos || null,
        })

        // 7. Área productiva
        await upsertByPredio('area_productiva', {
            sistema_productivo: datos.areaProductiva.sistemaProductivo,
            caracterizacion_cultivo: datos.areaProductiva.caracterizacionCultivo,
            cantidad_produccion: datos.areaProductiva.cantidadProduccion,
            estado_cultivo: datos.areaProductiva.estadoCultivo,
            tiene_infraestructura_procesamiento: datos.areaProductiva.tieneInfraestructuraProcesamiento,
            estructuras: datos.areaProductiva.estructuras,
            interesado_programa: datos.areaProductiva.interesadoPrograma,
            donde_comercializa: datos.areaProductiva.dondeComercializa,
            ingreso_mensual_ventas: datos.areaProductiva.ingresoMensualVentas ?? null,
        })

        // 8. Información financiera — upsert por id_beneficiario
        // NOTA: la tabla informacion_financiera no tiene columna "ingresos_mensuales"
        const finData = {
            ingresos_mensuales_agropecuaria: datos.infoFinanciera?.ingresosMensualesAgropecuaria ?? null,
            ingresos_mensuales_otros: datos.infoFinanciera?.ingresosMensualesOtros ?? null,
            egresos_mensuales: datos.infoFinanciera?.egresosMensuales ?? null,
            activos_totales: datos.infoFinanciera?.activosTotales ?? null,
            activos_agropecuaria: datos.infoFinanciera?.activosAgropecuaria ?? null,
            pasivos_totales: datos.infoFinanciera?.pasivosTotales ?? null,
        }

        // Obtener la fila más reciente (puede haber duplicados históricos)
        const { data: finRows } = await supabaseAdmin
            .from('informacion_financiera')
            .select('id')
            .eq('id_beneficiario', beneficiarioId)
            .order('created_at', { ascending: false })
            .limit(1)
        const existingFin = finRows?.[0] ?? null

        if (existingFin) {
            await supabaseAdmin.from('informacion_financiera').update(finData).eq('id', existingFin.id)
        } else {
            await supabaseAdmin.from('informacion_financiera').insert({ id_beneficiario: beneficiarioId, ...finData })
        }

        // 9. Subir fotos nuevas (base64) o preservar URLs existentes (http)
        const timestamp = Date.now()
        const prefix = datos.beneficiario?.numeroDocumento || visitaId.substring(0, 8)

        const [fotoBeneficiarioUrl, foto1Url, foto2Url, firmaUrl, fotoDocFrontalUrl, fotoDocTraseraUrl] = await Promise.all([
            uploadBase64ToStorage(supabaseAdmin, datos.archivos.fotoBeneficiario, 'fotos-productores', `${prefix}/foto-beneficiario-${timestamp}.jpg`, 'image/jpeg'),
            uploadBase64ToStorage(supabaseAdmin, datos.archivos.foto1Url, 'fotos-productores', `${prefix}/foto-1-${timestamp}.jpg`, 'image/jpeg'),
            uploadBase64ToStorage(supabaseAdmin, datos.archivos.foto2Url, 'fotos-productores', `${prefix}/foto-2-${timestamp}.jpg`, 'image/jpeg'),
            uploadBase64ToStorage(supabaseAdmin, datos.archivos.firmaProductorUrl, 'firmas', `${prefix}/firma-${timestamp}.png`, 'image/png'),
            uploadBase64ToStorage(supabaseAdmin, datos.archivos.fotoDocFrontalUrl, 'documentos-identidad', `${prefix}/doc-frontal-${timestamp}.jpg`, 'image/jpeg'),
            uploadBase64ToStorage(supabaseAdmin, datos.archivos.fotoDocTraseraUrl, 'documentos-identidad', `${prefix}/doc-trasera-${timestamp}.jpg`, 'image/jpeg'),
        ])

        const updateCaracUrls: Record<string, unknown> = {
            observaciones: datos.observaciones,
            updated_at: new Date().toISOString(),
        }

        if (fotoBeneficiarioUrl) updateCaracUrls.foto_beneficiario_url = fotoBeneficiarioUrl
        if (foto1Url) updateCaracUrls.foto_1_url = foto1Url
        if (foto2Url) updateCaracUrls.foto_2_url = foto2Url
        if (firmaUrl) updateCaracUrls.firma_productor_url = firmaUrl
        if (fotoDocFrontalUrl) updateCaracUrls.foto_doc_frontal_url = fotoDocFrontalUrl
        if (fotoDocTraseraUrl) updateCaracUrls.foto_doc_trasera_url = fotoDocTraseraUrl

        await supabaseAdmin.from('caracterizaciones').update(updateCaracUrls).eq('id_visita', visitaId)

        return NextResponse.json({ success: true, mensaje: 'Formulario actualizado correctamente' })
    } catch (err) {
        console.error('[API Actualizar] Error:', err)
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Error interno' },
            { status: 500 }
        )
    }
}
