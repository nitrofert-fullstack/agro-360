import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Verificar autenticacion
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado. Debes iniciar sesion para sincronizar.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { caracterizaciones } = body

    if (!caracterizaciones || !Array.isArray(caracterizaciones)) {
      return NextResponse.json(
        { error: 'Datos invalidos' },
        { status: 400 }
      )
    }

    const results = []

    for (const c of caracterizaciones) {
      try {
        // Verificar si ya existe por radicado local
        const { data: existing } = await supabase
          .from('caracterizaciones')
          .select('id, radicado_oficial')
          .eq('radicado_local', c.radicadoLocal)
          .single()

        if (existing) {
          results.push({
            radicadoLocal: c.radicadoLocal,
            radicadoOficial: existing.radicado_oficial,
            estado: 'SINCRONIZADO',
            mensaje: 'Ya existia en el sistema',
          })
          continue
        }

        // === 1. BENEFICIARIO ===
        const docNum = c.beneficiario?.numeroDocumento || c.documentoProductor
        
        const { data: existingBenef } = await supabase
          .from('beneficiarios')
          .select('id')
          .eq('numero_documento', docNum)
          .single()

        let beneficiarioId: string

        if (existingBenef) {
          // Actualizar beneficiario existente
          await supabase
            .from('beneficiarios')
            .update({
              tipo_documento: c.beneficiario?.tipoDocumento || 'CC',
              primer_nombre: c.beneficiario?.primerNombre || '',
              segundo_nombre: c.beneficiario?.segundoNombre || null,
              primer_apellido: c.beneficiario?.primerApellido || '',
              segundo_apellido: c.beneficiario?.segundoApellido || null,
              edad: c.beneficiario?.edad || null,
              telefono: c.beneficiario?.telefono || null,
              email: c.beneficiario?.email || null,
              ocupacion_principal: c.beneficiario?.ocupacionPrincipal || null,
              municipio: c.beneficiario?.municipio || c.visita?.municipio || null,
              vereda: c.beneficiario?.vereda || c.visita?.vereda || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingBenef.id)
          beneficiarioId = existingBenef.id
        } else {
          const { data: newBenef, error: benefErr } = await supabase
            .from('beneficiarios')
            .insert({
              tipo_documento: c.beneficiario?.tipoDocumento || 'CC',
              numero_documento: docNum,
              primer_nombre: c.beneficiario?.primerNombre || '',
              segundo_nombre: c.beneficiario?.segundoNombre || null,
              primer_apellido: c.beneficiario?.primerApellido || '',
              segundo_apellido: c.beneficiario?.segundoApellido || null,
              edad: c.beneficiario?.edad || null,
              telefono: c.beneficiario?.telefono || null,
              email: c.beneficiario?.email || null,
              ocupacion_principal: c.beneficiario?.ocupacionPrincipal || null,
              municipio: c.beneficiario?.municipio || c.visita?.municipio || null,
              vereda: c.beneficiario?.vereda || c.visita?.vereda || null,
            })
            .select('id')
            .single()

          if (benefErr) throw new Error(`Error creando beneficiario: ${benefErr.message}`)
          beneficiarioId = newBenef.id
        }

        // === 2. PREDIO ===
        const { data: newPredio, error: predioErr } = await supabase
          .from('predios')
          .insert({
            beneficiario_id: beneficiarioId,
            nombre_predio: c.predio?.nombrePredio || 'Sin nombre',
            tipo_tenencia: c.predio?.tipoTenencia || null,
            area_total: c.predio?.areaTotal || null,
            area_cultivada: c.predio?.areaCultivada || null,
            latitud: c.predio?.latitud || null,
            longitud: c.predio?.longitud || null,
            altitud: c.predio?.altitud || null,
            departamento: c.visita?.departamento || 'Santander',
            municipio: c.visita?.municipio || null,
            vereda: c.visita?.vereda || null,
            direccion: c.predio?.direccion || null,
            codigo_catastral: c.predio?.codigoCatastral || null,
            fuente_agua: c.predio?.fuenteAgua || null,
            acceso_vial: c.predio?.accesoVial || null,
            distancia_cabecera: c.predio?.distanciaCabecera || null,
            vive_en_predio: c.predio?.viveEnPredio === 'Si' || c.predio?.viveEnPredio === true,
            tiene_vivienda: c.predio?.tieneVivienda || false,
            cultivos_existentes: c.predio?.cultivosExistentes || null,
          })
          .select('id')
          .single()

        if (predioErr) throw new Error(`Error creando predio: ${predioErr.message}`)
        const predioId = newPredio.id

        // === 3. CARACTERIZACION PREDIO ===
        let caracPredioId: string | null = null
        if (c.caracterizacion) {
          const { data: newCarac, error: caracErr } = await supabase
            .from('caracterizacion_predio')
            .insert({
              predio_id: predioId,
              topografia: c.caracterizacion.topografia || null,
              tipo_suelo: c.caracterizacion.tipoSuelo || null,
              erosion: c.caracterizacion.erosion || null,
              drenaje: c.caracterizacion.drenaje || null,
              cobertura_vegetal: c.caracterizacion.coberturaVegetal || null,
              ruta_acceso: c.caracterizacion.rutaAcceso || null,
              distancia_km: c.caracterizacion.distanciaKm || null,
              tiempo_acceso: c.caracterizacion.tiempoAcceso || null,
              temperatura_celsius: c.caracterizacion.temperaturaCelsius || null,
              meses_lluvia: c.caracterizacion.mesesLluvia || null,
            })
            .select('id')
            .single()
          if (!caracErr && newCarac) caracPredioId = newCarac.id
        }

        // === 4. AREA PRODUCTIVA ===
        let areaProductivaId: string | null = null
        if (c.areaProductiva) {
          const { data: newArea, error: areaErr } = await supabase
            .from('area_productiva')
            .insert({
              predio_id: predioId,
              cultivo_principal: c.areaProductiva.cultivoPrincipal || null,
              area_cultivo_principal: c.areaProductiva.areaCultivoPrincipal || null,
              produccion_estimada: c.areaProductiva.produccionEstimada || null,
              destino_produccion: c.areaProductiva.destinoProduccion || null,
              sistema_produccion: c.areaProductiva.sistemaProduccion || null,
              caracterizacion_cultivo: c.areaProductiva.caracterizacionCultivo || null,
              estado_cultivo: c.areaProductiva.estadoCultivo || null,
              tiene_infraestructura_procesamiento: c.areaProductiva.tieneInfraestructuraProcesamiento || false,
              estructuras: c.areaProductiva.estructuras || null,
              interesado_programa: c.areaProductiva.interesadoPrograma || false,
              donde_comercializa: c.areaProductiva.dondeComercializa || null,
              ingreso_mensual_ventas: c.areaProductiva.ingresoMensualVentas || null,
              cantidad_produccion: c.areaProductiva.cantidadProduccion || null,
            })
            .select('id')
            .single()
          if (!areaErr && newArea) areaProductivaId = newArea.id
        }

        // === 5. INFORMACION FINANCIERA ===
        let infoFinancieraId: string | null = null
        if (c.infoFinanciera) {
          const { data: newFin, error: finErr } = await supabase
            .from('informacion_financiera')
            .insert({
              beneficiario_id: beneficiarioId,
              ingresos_mensuales: c.infoFinanciera.ingresosMensuales || null,
              ingresos_mensuales_agropecuaria: c.infoFinanciera.ingresosMensualesAgropecuaria || null,
              ingresos_mensuales_otros: c.infoFinanciera.ingresosMensualesOtros || null,
              egresos_mensuales: c.infoFinanciera.egresosMensuales || null,
              activos_totales: c.infoFinanciera.activosTotales || null,
              activos_agropecuaria: c.infoFinanciera.activosAgropecuaria || null,
              pasivos_totales: c.infoFinanciera.pasivosTotales || null,
              fuentes_ingreso: c.infoFinanciera.fuentesIngreso || ['Actividad agropecuaria'],
              acceso_credito: c.infoFinanciera.accesoCredito || false,
            })
            .select('id')
            .single()
          if (!finErr && newFin) infoFinancieraId = newFin.id
        }

        // === 6. VISITA ===
        let visitaId: string | null = null
        const { data: newVisita, error: visitaErr } = await supabase
          .from('visitas')
          .insert({
            asesor_id: user.id,
            beneficiario_id: beneficiarioId,
            predio_id: predioId,
            fecha_visita: c.visita?.fechaVisita || new Date().toISOString().split('T')[0],
            nombre_tecnico: c.visita?.nombreTecnico || null,
            objetivo: c.visita?.objetivo || 'Caracterizacion predial',
            observaciones: c.observaciones || c.visita?.observaciones || null,
          })
          .select('id')
          .single()
        if (!visitaErr && newVisita) visitaId = newVisita.id

        // === 9. GENERAR RADICADO OFICIAL ===
        const timestamp = Date.now()
        const random = Math.random().toString(36).substring(2, 6).toUpperCase()
        const radicadoOficial = `RAD-${timestamp}-${random}`

        // === 10. CREAR CARACTERIZACION (tabla relacional principal) ===
        const { error: insertError } = await supabase
          .from('caracterizaciones')
          .insert({
            radicado_local: c.radicadoLocal,
            radicado_oficial: radicadoOficial,
            estado: 'sincronizado',
            asesor_id: user.id,
            beneficiario_id: beneficiarioId,
            predio_id: predioId,
            visita_id: visitaId,
            caracterizacion_predio_id: caracPredioId,
            area_productiva_id: areaProductivaId,
            informacion_financiera_id: infoFinancieraId,
            firma_beneficiario_url: c.archivos?.firmaProductorUrl || c.autorizacion?.firmaDigital || null,
            foto_beneficiario_url: c.archivos?.fotoBeneficiario || null,
            foto_predio_1_url: c.archivos?.foto1Url || null,
            foto_predio_2_url: c.archivos?.foto2Url || null,
            autoriza_tratamiento_datos: c.autorizacion?.autorizaTratamientoDatos || false,
            fecha_autorizacion: c.autorizacion?.fechaAutorizacion || null,
            observaciones: c.observaciones || null,
            fecha_sincronizacion: new Date().toISOString(),
          })

        if (insertError) {
          // Rollback manual - eliminar solo lo que se creo
          if (visitaId) await supabase.from('visitas').delete().eq('id', visitaId)
          if (areaProductivaId) await supabase.from('area_productiva').delete().eq('id', areaProductivaId)
          if (infoFinancieraId) await supabase.from('informacion_financiera').delete().eq('id', infoFinancieraId)
          if (caracPredioId) await supabase.from('caracterizacion_predio').delete().eq('id', caracPredioId)
          await supabase.from('predios').delete().eq('id', predioId)
          
          throw new Error(`Error creando caracterizacion: ${insertError.message}`)
        }

        results.push({
          radicadoLocal: c.radicadoLocal,
          radicadoOficial,
          estado: 'SINCRONIZADO',
          mensaje: 'Sincronizado correctamente',
        })

      } catch (err) {
        results.push({
          radicadoLocal: c.radicadoLocal,
          estado: 'ERROR',
          mensaje: err instanceof Error ? err.message : 'Error desconocido',
        })
      }
    }

    const exitosos = results.filter(r => r.estado === 'SINCRONIZADO').length
    const fallidos = results.filter(r => r.estado === 'ERROR').length

    return NextResponse.json({
      success: fallidos === 0,
      total: results.length,
      exitosos,
      fallidos,
      resultados: results,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
