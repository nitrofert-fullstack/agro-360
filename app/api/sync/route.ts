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
        console.log(`[v0] Procesando: ${c.radicadoLocal}`)

        // === 1. BENEFICIARIO (tabla: beneficiarios) ===
        const docNum = c.beneficiario?.numeroDocumento || c.documentoProductor
        
        const { data: existingBenef } = await supabase
          .from('beneficiarios')
          .select('id')
          .eq('numero_documento', docNum)
          .single()

        let beneficiarioId: string

        if (existingBenef) {
          // Actualizar beneficiario existente
          const { error: updateErr } = await supabase
            .from('beneficiarios')
            .update({
              tipo_documento: c.beneficiario?.tipoDocumento || 'CC',
              nombres: `${c.beneficiario?.primerNombre || ''} ${c.beneficiario?.segundoNombre || ''}`.trim(),
              apellidos: `${c.beneficiario?.primerApellido || ''} ${c.beneficiario?.segundoApellido || ''}`.trim(),
              edad: c.beneficiario?.edad || null,
              telefono: c.beneficiario?.telefono || null,
              correo: c.beneficiario?.email || null,
              ocupacion_principal: c.beneficiario?.ocupacionPrincipal || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingBenef.id)
          
          if (updateErr) throw new Error(`Error actualizando beneficiario: ${updateErr.message}`)
          beneficiarioId = existingBenef.id
          console.log(`[v0] Beneficiario actualizado: ${beneficiarioId}`)
        } else {
          const { data: newBenef, error: benefErr } = await supabase
            .from('beneficiarios')
            .insert({
              tipo_documento: c.beneficiario?.tipoDocumento || 'CC',
              numero_documento: docNum,
              nombres: `${c.beneficiario?.primerNombre || ''} ${c.beneficiario?.segundoNombre || ''}`.trim(),
              apellidos: `${c.beneficiario?.primerApellido || ''} ${c.beneficiario?.segundoApellido || ''}`.trim(),
              edad: c.beneficiario?.edad || null,
              telefono: c.beneficiario?.telefono || null,
              correo: c.beneficiario?.email || null,
              ocupacion_principal: c.beneficiario?.ocupacionPrincipal || null,
            })
            .select('id')
            .single()

          if (benefErr) throw new Error(`Error creando beneficiario: ${benefErr.message}`)
          beneficiarioId = newBenef.id
          console.log(`[v0] Beneficiario creado: ${beneficiarioId}`)
        }

        // === 2. PREDIO (tabla: predios) ===
        const { data: newPredio, error: predioErr } = await supabase
          .from('predios')
          .insert({
            id_beneficiario: beneficiarioId,
            nombre_predio: c.predio?.nombrePredio || 'Sin nombre',
            departamento: c.visita?.departamento || 'Santander',
            municipio: c.visita?.municipio || null,
            vereda: c.visita?.vereda || null,
            direccion: c.predio?.direccion || null,
            codigo_catastral: c.predio?.codigoCatastral || null,
            documento_tenencia: c.predio?.documentoTenencia || null,
            tipo_tenencia: c.predio?.tipoTenencia || null,
            tipo_tenencia_otro: c.predio?.tipoTenenciaOtro || null,
            coordenada_x: c.predio?.coordenadaX || null,
            coordenada_y: c.predio?.coordenadaY || null,
            latitud: c.predio?.latitud || null,
            longitud: c.predio?.longitud || null,
            altitud_msnm: c.predio?.altitudMsnm || null,
            vive_en_predio: c.predio?.viveEnPredio || 'No',
            tiene_vivienda: c.predio?.tieneVivienda || false,
            area_total_hectareas: c.predio?.areaTotalHectareas || null,
            area_productiva_hectareas: c.predio?.areaProductivaHectareas || null,
            cultivos_existentes: c.predio?.cultivosExistentes || null,
          })
          .select('id')
          .single()

        if (predioErr) throw new Error(`Error creando predio: ${predioErr.message}`)
        const predioId = newPredio.id
        console.log(`[v0] Predio creado: ${predioId}`)

        // === 3. ABASTECIMIENTO AGUA (tabla: abastecimiento_agua) ===
        let abastecimientoAguaId: string | null = null
        if (c.aguaRiesgos) {
          const { data: newAbast, error: abastErr } = await supabase
            .from('abastecimiento_agua')
            .insert({
              id_predio: predioId,
              nacimiento_manantial: c.aguaRiesgos.nacimientoManantial || false,
              rio_quebrada: c.aguaRiesgos.rioQuebrada || false,
              pozo: c.aguaRiesgos.pozo || false,
              acueducto_rural: c.aguaRiesgos.acueductoRural || false,
              canal_distrito_riego: c.aguaRiesgos.canalDistritoRiego || false,
              jaguey_reservorio: c.aguaRiesgos.jagueyReservorio || false,
              agua_lluvia: c.aguaRiesgos.aguaLluvia || false,
              otra_fuente: c.aguaRiesgos.otraFuente || null,
            })
            .select('id')
            .single()
          
          if (!abastErr && newAbast) abastecimientoAguaId = newAbast.id
          console.log(`[v0] Abastecimiento agua creado: ${abastecimientoAguaId}`)
        }

        // === 4. RIESGOS PREDIO (tabla: riesgos_predio) ===
        let riesgosPredioId: string | null = null
        if (c.aguaRiesgos) {
          const { data: newRiesgos, error: riesgosErr } = await supabase
            .from('riesgos_predio')
            .insert({
              id_predio: predioId,
              inundacion: c.aguaRiesgos.inundacion || false,
              sequia: c.aguaRiesgos.sequia || false,
              viento: c.aguaRiesgos.viento || false,
              helada: c.aguaRiesgos.helada || false,
              otros_riesgos: c.aguaRiesgos.otrosRiesgos || null,
            })
            .select('id')
            .single()
          
          if (!riesgosErr && newRiesgos) riesgosPredioId = newRiesgos.id
          console.log(`[v0] Riesgos predio creado: ${riesgosPredioId}`)
        }

        // === 5. CARACTERIZACION PREDIO (tabla: caracterizacion_predio) ===
        let caracPredioId: string | null = null
        if (c.caracterizacion) {
          const { data: newCarac, error: caracErr } = await supabase
            .from('caracterizacion_predio')
            .insert({
              id_predio: predioId,
              ruta_acceso: c.caracterizacion.rutaAcceso || null,
              distancia_km: c.caracterizacion.distanciaKm || null,
              tiempo_acceso: c.caracterizacion.tiempoAcceso || null,
              temperatura_celsius: c.caracterizacion.temperaturaCelsius || null,
              meses_lluvia: c.caracterizacion.mesesLluvia || null,
              topografia: c.caracterizacion.topografia || null,
              cobertura_bosque: c.caracterizacion.coberturaBosque || false,
              cobertura_cultivos: c.caracterizacion.coberturaCultivos || false,
              cobertura_pastos: c.caracterizacion.coberturaPastos || false,
              cobertura_rastrojo: c.caracterizacion.coberturaRastrojo || false,
            })
            .select('id')
            .single()
          
          if (!caracErr && newCarac) caracPredioId = newCarac.id
          console.log(`[v0] Caracterización predio creado: ${caracPredioId}`)
        }

        // === 6. AREA PRODUCTIVA (tabla: area_productiva) ===
        let areaProductivaId: string | null = null
        if (c.areaProductiva) {
          const { data: newArea, error: areaErr } = await supabase
            .from('area_productiva')
            .insert({
              id_predio: predioId,
              sistema_productivo: c.areaProductiva.sistemaProductivo || null,
              caracterizacion_cultivo: c.areaProductiva.caracterizacionCultivo || null,
              cantidad_produccion: c.areaProductiva.cantidadProduccion || null,
              estado_cultivo: c.areaProductiva.estadoCultivo || null,
              tiene_infraestructura_procesamiento: c.areaProductiva.tieneInfraestructuraProcesamiento || false,
              estructuras: c.areaProductiva.estructuras || null,
              interesado_programa: c.areaProductiva.interesadoPrograma || false,
              donde_comercializa: c.areaProductiva.dondeComercializa || null,
              ingreso_mensual_ventas: c.areaProductiva.ingresoMensualVentas || null,
            })
            .select('id')
            .single()
          
          if (!areaErr && newArea) areaProductivaId = newArea.id
          console.log(`[v0] Área productiva creada: ${areaProductivaId}`)
        }

        // === 7. INFORMACION FINANCIERA (tabla: informacion_financiera) ===
        let infoFinancieraId: string | null = null
        if (c.infoFinanciera) {
          const { data: newFin, error: finErr } = await supabase
            .from('informacion_financiera')
            .insert({
              id_beneficiario: beneficiarioId,
              ingresos_mensuales_agropecuaria: c.infoFinanciera.ingresosMensualesAgropecuaria || null,
              ingresos_mensuales_otros: c.infoFinanciera.ingresosMensualesOtros || null,
              egresos_mensuales: c.infoFinanciera.egresosMensuales || null,
              activos_totales: c.infoFinanciera.activosTotales || null,
              activos_agropecuaria: c.infoFinanciera.activosAgropecuaria || null,
              pasivos_totales: c.infoFinanciera.pasivosTotales || null,
            })
            .select('id')
            .single()
          
          if (!finErr && newFin) infoFinancieraId = newFin.id
          console.log(`[v0] Información financiera creada: ${infoFinancieraId}`)
        }

        // === 8. VISITA (tabla: visitas) ===
        let visitaId: string | null = null
        const { data: newVisita, error: visitaErr } = await supabase
          .from('visitas')
          .insert({
            fecha_visita: c.visita?.fechaVisita || new Date().toISOString().split('T')[0],
            nombre_tecnico: c.visita?.nombreTecnico || '',
            codigo_formulario: c.visita?.codigoFormulario || null,
            version_formulario: c.visita?.versionFormulario || '1.0',
            fecha_emision_formulario: c.visita?.fechaEmisionFormulario || null,
            radicado_local: c.radicadoLocal,
            radicado_oficial: null,
            estado: 'PENDIENTE_SINCRONIZACION',
            asesor_id: user.id,
          })
          .select('id')
          .single()

        if (!visitaErr && newVisita) visitaId = newVisita.id
        console.log(`[v0] Visita creada: ${visitaId}`)

        // === 9. CARACTERIZACIONES (tabla: caracterizaciones - relacional principal) ===
        if (visitaId) {
          const { error: caracErr } = await supabase
            .from('caracterizaciones')
            .insert({
              id_visita: visitaId,
              id_beneficiario: beneficiarioId,
              id_predio: predioId,
              observaciones: c.observaciones || null,
              foto_1_url: c.archivos?.foto1Url || null,
              foto_2_url: c.archivos?.foto2Url || null,
              firma_productor_url: c.autorizacion?.firmaDigital || null,
              autorizacion_datos_personales: c.autorizacion?.autorizaTratamientoDatos || false,
              autorizacion_consulta_crediticia: false,
            })

          if (caracErr) throw new Error(`Error creando caracterización: ${caracErr.message}`)
          console.log(`[v0] Caracterización creada exitosamente`)
        }

        results.push({
          radicadoLocal: c.radicadoLocal,
          estado: 'SINCRONIZADO',
          mensaje: 'Sincronizado correctamente',
        })
      } catch (err) {
        console.error(`[v0] Error procesando ${c.radicadoLocal}:`, err)
        results.push({
          radicadoLocal: c.radicadoLocal,
          estado: 'ERROR',
          mensaje: err instanceof Error ? err.message : 'Error desconocido',
        })
      }
    }

    return NextResponse.json({
      exito: true,
      resultados: results,
    })
  } catch (err) {
    console.error('[v0] Error en sync:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}
