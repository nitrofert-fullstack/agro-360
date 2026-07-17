import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import ExcelJS from 'exceljs'

const BOOL_COLS = new Set([
  'vive_en_predio', 'tiene_vivienda',
  'cobertura_bosque', 'cobertura_cultivos', 'cobertura_pastos', 'cobertura_rastrojo',
  'nacimiento_manantial', 'rio_quebrada', 'pozo', 'acueducto_rural',
  'canal_distrito_riego', 'jaguey_reservorio', 'agua_lluvia',
  'inundacion', 'sequia', 'viento', 'helada',
  'tiene_infraestructura_procesamiento', 'interesado_programa',
  'autorizacion_datos_personales', 'autorizacion_consulta_crediticia',
  'autorizacion_aviso_privacidad', 'autorizacion_uso_imagen',
])

function boolVal(v: unknown): string {
  if (v === true || v === 'true' || v === 'Si' || v === 'Sí' || v === '1') return 'Sí'
  if (v === false || v === 'false' || v === 'No' || v === '0') return 'No'
  return 'No especificado'
}

function str(v: unknown): string {
  if (v == null || v === '') return 'No especificado'
  return String(v)
}

function num(v: unknown): number | string {
  if (v == null) return 'No especificado'
  const n = Number(v)
  return isNaN(n) ? 'No especificado' : n
}

function dateFmt(v: unknown): string {
  if (!v) return 'No especificado'
  const d = new Date(v as string)
  if (isNaN(d.getTime())) return String(v)
  return d.toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })
}

function pctCalc(numerator: unknown, denominator: unknown): number | string {
  if (numerator == null) return 'No especificado'
  const n = Number(numerator)
  const d = Number(denominator ?? 0)
  if (!d || isNaN(d) || isNaN(n)) return 'No especificado'
  return Math.round((n / d) * 1000) / 10
}

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1F4E79' },
}

const COLUMNS: { header: string; key: string; width: number }[] = [
  // ── Identificación del agricultor ────────────────────────────────────────
  { header: 'Nombre Agricultor',            key: 'nombre_agricultor',            width: 30 },
  { header: 'Número Documento',             key: 'numero_documento',             width: 18 },
  { header: 'Tipo Documento',               key: 'tipo_documento',               width: 16 },
  { header: 'Edad',                         key: 'edad',                         width: 8  },
  { header: 'Fecha Nacimiento',             key: 'fecha_nacimiento',             width: 16 },
  { header: 'Género',                       key: 'genero',                       width: 12 },
  { header: 'Teléfono',                     key: 'telefono',                     width: 16 },
  { header: 'Correo',                       key: 'correo',                       width: 30 },
  { header: 'Ocupación Principal',          key: 'ocupacion_principal',          width: 24 },
  { header: 'Personas a Cargo',             key: 'personas_a_cargo',             width: 16 },
  { header: 'Asociación',                   key: 'asociacion',                   width: 22 },
  { header: 'Contacto Secundario',          key: 'nombre_contacto_secundario',   width: 24 },
  { header: 'Tel. Contacto Secundario',     key: 'telefono_secundario',          width: 20 },
  { header: 'Parentesco Contacto',          key: 'parentesco_contacto_secundario', width: 20 },
  // ── Visita ────────────────────────────────────────────────────────────────
  { header: 'Fecha Visita',                 key: 'fecha_visita',                 width: 14 },
  { header: 'Técnico Campo',                key: 'tecnico_campo',                width: 26 },
  { header: 'Radicado Oficial',             key: 'radicado_oficial',             width: 20 },
  { header: 'Radicado Local',               key: 'radicado_local',               width: 20 },
  { header: 'Código Formulario',            key: 'codigo_formulario',            width: 18 },
  { header: 'Versión Formulario',           key: 'version_formulario',           width: 18 },
  { header: 'Fecha Emisión Formulario',     key: 'fecha_emision_formulario',     width: 22 },
  // ── Predio ────────────────────────────────────────────────────────────────
  { header: 'Nombre Predio',                key: 'nombre_predio',                width: 24 },
  { header: 'Departamento',                 key: 'departamento',                 width: 18 },
  { header: 'Municipio',                    key: 'municipio',                    width: 18 },
  { header: 'Vereda',                       key: 'vereda',                       width: 18 },
  { header: 'Dirección',                    key: 'direccion',                    width: 30 },
  { header: 'Código Catastral',             key: 'codigo_catastral',             width: 20 },
  { header: 'Tipo Tenencia',                key: 'tipo_tenencia',                width: 18 },
  { header: 'Tipo Tenencia (Otro)',          key: 'tipo_tenencia_otro',           width: 20 },
  { header: 'Área Total (ha)',              key: 'area_total_hectareas',         width: 14 },
  { header: 'Área Productiva (ha)',         key: 'area_productiva_hectareas',    width: 18 },
  { header: '% Área Productiva',            key: 'pct_area_productiva',          width: 16 },
  { header: 'Cultivos Existentes',          key: 'cultivos_existentes',          width: 26 },
  { header: 'Vive en Predio',              key: 'vive_en_predio',               width: 14 },
  { header: 'Tiene Vivienda',              key: 'tiene_vivienda',               width: 14 },
  { header: 'Latitud',                      key: 'latitud',                      width: 14 },
  { header: 'Longitud',                     key: 'longitud',                     width: 14 },
  { header: 'Altitud (msnm)',               key: 'altitud_msnm',                 width: 14 },
  { header: 'Coordenada X',                 key: 'coordenada_x',                 width: 16 },
  { header: 'Coordenada Y',                 key: 'coordenada_y',                 width: 16 },
  { header: 'Documento Tenencia',           key: 'documento_tenencia',           width: 20 },
  // ── Caracterización del predio ────────────────────────────────────────────
  { header: 'Topografía',                   key: 'topografia',                   width: 18 },
  { header: 'Temperatura (°C)',             key: 'temperatura_celsius',          width: 16 },
  { header: 'Meses Lluvia',                 key: 'meses_lluvia',                 width: 16 },
  { header: 'Ruta Acceso',                  key: 'ruta_acceso',                  width: 20 },
  { header: 'Distancia (km)',               key: 'distancia_km',                 width: 14 },
  { header: 'Tiempo Acceso',                key: 'tiempo_acceso',                width: 16 },
  { header: 'Cobertura Bosque',             key: 'cobertura_bosque',             width: 16 },
  { header: 'Cobertura Cultivos',           key: 'cobertura_cultivos',           width: 18 },
  { header: 'Cobertura Pastos',             key: 'cobertura_pastos',             width: 16 },
  { header: 'Cobertura Rastrojo',           key: 'cobertura_rastrojo',           width: 18 },
  // ── Abastecimiento de agua ────────────────────────────────────────────────
  { header: 'Nacimiento/Manantial',         key: 'nacimiento_manantial',         width: 20 },
  { header: 'Río/Quebrada',                 key: 'rio_quebrada',                 width: 14 },
  { header: 'Pozo',                         key: 'pozo',                         width: 10 },
  { header: 'Acueducto Rural',              key: 'acueducto_rural',              width: 16 },
  { header: 'Canal/Distrito Riego',         key: 'canal_distrito_riego',         width: 18 },
  { header: 'Jagüey/Reservorio',            key: 'jaguey_reservorio',            width: 18 },
  { header: 'Agua Lluvia',                  key: 'agua_lluvia',                  width: 12 },
  { header: 'Otra Fuente Agua',             key: 'otra_fuente',                  width: 18 },
  // ── Riesgos del predio ────────────────────────────────────────────────────
  { header: 'Riesgo Inundación',            key: 'inundacion',                   width: 18 },
  { header: 'Riesgo Sequía',               key: 'sequia',                       width: 14 },
  { header: 'Riesgo Viento',               key: 'viento',                       width: 14 },
  { header: 'Riesgo Helada',               key: 'helada',                       width: 14 },
  { header: 'Otros Riesgos',               key: 'otros_riesgos',                width: 20 },
  // ── Área productiva / cultivo ─────────────────────────────────────────────
  { header: 'Sistema Productivo',           key: 'sistema_productivo',           width: 24 },
  { header: 'Caracterización Cultivo',      key: 'caracterizacion_cultivo',      width: 26 },
  { header: 'Estado Cultivo',               key: 'estado_cultivo',               width: 18 },
  { header: 'Cantidad Producción',          key: 'cantidad_produccion',          width: 20 },
  { header: 'Infraest. Procesamiento',      key: 'tiene_infraestructura_procesamiento', width: 22 },
  { header: 'Estructuras',                  key: 'estructuras',                  width: 20 },
  { header: 'Interesado en Programa',       key: 'interesado_programa',          width: 22 },
  { header: 'Dónde Comercializa',           key: 'donde_comercializa',           width: 24 },
  { header: 'Ingreso Mensual Ventas',       key: 'ingreso_mensual_ventas',       width: 22 },
  { header: 'Sistema Productivo Interés',   key: 'sistema_productivo_interes',   width: 26 },
  { header: 'Há. Siembra Nueva',            key: 'hectareas_siembra_nueva',      width: 18 },
  { header: 'Há. Renovación',               key: 'hectareas_renovacion',         width: 16 },
  // ── Información financiera ────────────────────────────────────────────────
  { header: 'Ingresos Agropecuarios/mes',   key: 'ingresos_mensuales_agropecuaria', width: 24 },
  { header: 'Otros Ingresos/mes',           key: 'ingresos_mensuales_otros',     width: 20 },
  { header: 'Ingreso Total Mensual',        key: 'ingreso_total_mensual',        width: 22 },
  { header: 'Egresos Mensuales',            key: 'egresos_mensuales',            width: 18 },
  { header: 'Balance Mensual',              key: 'balance_mensual',              width: 18 },
  { header: 'Activos Totales',              key: 'activos_totales',              width: 18 },
  { header: 'Activos Agropecuarios',        key: 'activos_agropecuaria',         width: 20 },
  { header: 'Pasivos Totales',              key: 'pasivos_totales',              width: 18 },
  { header: '% Endeudamiento',              key: 'pct_endeudamiento',            width: 16 },
  // ── Estado y autorizaciones ───────────────────────────────────────────────
  { header: 'Estado Caracterización',       key: 'estado_caracterizacion',       width: 24 },
  { header: 'Autoriza Datos Personales',    key: 'autorizacion_datos_personales', width: 24 },
  { header: 'Autoriza Aviso Privacidad',    key: 'autorizacion_aviso_privacidad', width: 24 },
  { header: 'Observaciones',                key: 'observaciones',                width: 44 },
]

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { rol: true },
    })

    if (profile?.rol !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores pueden exportar' }, { status: 403 })
    }

    const profilesMap: Record<string, string> = {}

    // Build workbook
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'AgroSantander360'
    workbook.created = new Date()

    const sheet = workbook.addWorksheet('Caracterizaciones', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1, topLeftCell: 'A2', activeCell: 'A2' }],
    })

    sheet.columns = COLUMNS

    // Style header row — includeEmpty garantiza que se iteren todas las celdas
    // aunque ExcelJS no las haya materializado aún antes del primer addRow
    const headerRow = sheet.getRow(1)
    headerRow.height = 24
    headerRow.eachCell({ includeEmpty: true }, cell => {
      cell.fill = HEADER_FILL
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false }
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FF2E75B6' } },
      }
    })

    // AutoFilter on header row
    sheet.autoFilter = { from: 'A1', to: { row: 1, column: COLUMNS.length } }

    const BATCH_SIZE = 250
    let skip = 0

    while (true) {
      const rows = await prisma.caracterizaciones.findMany({
        include: {
          beneficiarios: {
            include: { informacion_financiera: true },
          },
          predios: {
            include: {
              caracterizacion_predio: true,
              abastecimiento_agua:    true,
              riesgos_predio:         true,
              area_productiva:        true,
            },
          },
          visitas: true,
        },
        orderBy: [
          { created_at: 'asc' },
          { id: 'asc' },
        ],
        skip,
        take: BATCH_SIZE,
      })

      if (rows.length === 0) break

      const asesorIds = [...new Set(rows.map(c => c.visitas?.asesor_id).filter((x): x is string => !!x))]
      const missingAsesorIds = asesorIds.filter((id) => !(id in profilesMap))
      if (missingAsesorIds.length > 0) {
        const profiles = await prisma.profiles.findMany({
          where: { id: { in: missingAsesorIds } },
          select: { id: true, nombre_completo: true },
        })
        for (const p of profiles) profilesMap[p.id] = p.nombre_completo ?? ''
      }

      for (const c of rows) {
        const b   = c.beneficiarios
        const p   = c.predios
        const v   = c.visitas
        const cp  = p?.caracterizacion_predio ?? null
        const aa  = (p?.abastecimiento_agua ?? [])[0] ?? null
        const rp  = (p?.riesgos_predio      ?? [])[0] ?? null
        const ap  = (p?.area_productiva     ?? [])[0] ?? null
        const fin = (b?.informacion_financiera ?? [])[0] ?? null

        // Preservar null como null para distinguir "cero real" de "no capturado"
        const ingAgro  = fin?.ingresos_mensuales_agropecuaria != null ? Number(fin.ingresos_mensuales_agropecuaria) : null
        const ingOtros = fin?.ingresos_mensuales_otros != null        ? Number(fin.ingresos_mensuales_otros)        : null
        const egresos  = fin?.egresos_mensuales != null               ? Number(fin.egresos_mensuales)               : null
        const activos  = fin?.activos_totales != null                 ? Number(fin.activos_totales)                 : null
        const pasivos  = fin?.pasivos_totales != null                 ? Number(fin.pasivos_totales)                 : null
        const ingTotal = (ingAgro != null || ingOtros != null) ? (ingAgro ?? 0) + (ingOtros ?? 0) : null
        const balance  = (ingTotal != null && egresos != null) ? ingTotal - egresos                : null

        const asesorNombre = v?.asesor_id ? (profilesMap[v.asesor_id] || v.nombre_tecnico) : v?.nombre_tecnico

        sheet.addRow({
          nombre_agricultor:               b ? `${b.nombres ?? ''} ${b.apellidos ?? ''}`.trim() : 'No especificado',
          numero_documento:                str(b?.numero_documento),
          tipo_documento:                  str(b?.tipo_documento),
          edad:                            num(b?.edad),
          fecha_nacimiento:                dateFmt(b?.fecha_nacimiento),
          genero:                          str(b?.genero),
          telefono:                        str(b?.telefono),
          correo:                          str(b?.correo),
          ocupacion_principal:             str(b?.ocupacion_principal),
          personas_a_cargo:                num(b?.personas_a_cargo),
          asociacion:                      str(b?.asociacion),
          nombre_contacto_secundario:      str(b?.nombre_contacto_secundario),
          telefono_secundario:             str(b?.telefono_secundario),
          parentesco_contacto_secundario:  str(b?.parentesco_contacto_secundario),
          fecha_visita:                    dateFmt(v?.fecha_visita),
          tecnico_campo:                   str(asesorNombre),
          radicado_oficial:                str(v?.radicado_oficial),
          radicado_local:                  str(v?.radicado_local),
          codigo_formulario:               str(v?.codigo_formulario),
          version_formulario:              str(v?.version_formulario),
          fecha_emision_formulario:        dateFmt(v?.fecha_emision_formulario),
          nombre_predio:                   str(p?.nombre_predio),
          departamento:                    str(p?.departamento),
          municipio:                       str(p?.municipio),
          vereda:                          str(p?.vereda),
          direccion:                       str(p?.direccion),
          codigo_catastral:                str(p?.codigo_catastral),
          tipo_tenencia:                   str(p?.tipo_tenencia),
          tipo_tenencia_otro:              str(p?.tipo_tenencia_otro),
          area_total_hectareas:            num(p?.area_total_hectareas),
          area_productiva_hectareas:       num(p?.area_productiva_hectareas),
          pct_area_productiva:             pctCalc(p?.area_productiva_hectareas, p?.area_total_hectareas),
          cultivos_existentes:             str(p?.cultivos_existentes),
          vive_en_predio:                  str(p?.vive_en_predio),
          tiene_vivienda:                  boolVal(p?.tiene_vivienda),
          latitud:                         num(p?.latitud),
          longitud:                        num(p?.longitud),
          altitud_msnm:                    num(p?.altitud_msnm),
          coordenada_x:                    str(p?.coordenada_x),
          coordenada_y:                    str(p?.coordenada_y),
          documento_tenencia:              str(p?.documento_tenencia),
          topografia:                      str(cp?.topografia),
          temperatura_celsius:             num(cp?.temperatura_celsius),
          meses_lluvia:                    str(cp?.meses_lluvia),
          ruta_acceso:                     str(cp?.ruta_acceso),
          distancia_km:                    num(cp?.distancia_km),
          tiempo_acceso:                   str(cp?.tiempo_acceso),
          cobertura_bosque:                boolVal(cp?.cobertura_bosque),
          cobertura_cultivos:              boolVal(cp?.cobertura_cultivos),
          cobertura_pastos:                boolVal(cp?.cobertura_pastos),
          cobertura_rastrojo:              boolVal(cp?.cobertura_rastrojo),
          nacimiento_manantial:            boolVal(aa?.nacimiento_manantial),
          rio_quebrada:                    boolVal(aa?.rio_quebrada),
          pozo:                            boolVal(aa?.pozo),
          acueducto_rural:                 boolVal(aa?.acueducto_rural),
          canal_distrito_riego:            boolVal(aa?.canal_distrito_riego),
          jaguey_reservorio:               boolVal(aa?.jaguey_reservorio),
          agua_lluvia:                     boolVal(aa?.agua_lluvia),
          otra_fuente:                     str(aa?.otra_fuente),
          inundacion:                      boolVal(rp?.inundacion),
          sequia:                          boolVal(rp?.sequia),
          viento:                          boolVal(rp?.viento),
          helada:                          boolVal(rp?.helada),
          otros_riesgos:                   str(rp?.otros_riesgos),
          sistema_productivo:              str(ap?.sistema_productivo),
          caracterizacion_cultivo:         str(ap?.caracterizacion_cultivo),
          estado_cultivo:                  str(ap?.estado_cultivo),
          cantidad_produccion:             str(ap?.cantidad_produccion),
          tiene_infraestructura_procesamiento: boolVal(ap?.tiene_infraestructura_procesamiento),
          estructuras:                     str(ap?.estructuras),
          interesado_programa:             boolVal(ap?.interesado_programa),
          donde_comercializa:              str(ap?.donde_comercializa),
          ingreso_mensual_ventas:          num(ap?.ingreso_mensual_ventas),
          sistema_productivo_interes:      str(ap?.sistema_productivo_interes),
          hectareas_siembra_nueva:         num(ap?.hectareas_siembra_nueva),
          hectareas_renovacion:            num(ap?.hectareas_renovacion),
          ingresos_mensuales_agropecuaria: ingAgro  ?? 'No especificado',
          ingresos_mensuales_otros:        ingOtros ?? 'No especificado',
          ingreso_total_mensual:           ingTotal ?? 'No especificado',
          egresos_mensuales:               egresos  ?? 'No especificado',
          balance_mensual:                 balance  ?? 'No especificado',
          activos_totales:                 activos  ?? 'No especificado',
          activos_agropecuaria:            num(fin?.activos_agropecuaria),
          pasivos_totales:                 pasivos  ?? 'No especificado',
          pct_endeudamiento:               activos != null && activos > 0 && pasivos != null
                                             ? Math.round((pasivos / activos) * 1000) / 10
                                             : 'No especificado',
          estado_caracterizacion:          str(c.estado),
          autorizacion_datos_personales:   boolVal(c.autorizacion_datos_personales),
          autorizacion_consulta_crediticia: boolVal(c.autorizacion_consulta_crediticia),
          autorizacion_aviso_privacidad:   boolVal(c.autorizacion_aviso_privacidad),
          autorizacion_uso_imagen:         boolVal(c.autorizacion_uso_imagen),
          observaciones:                   str(c.observaciones),
        })
      }

      skip += rows.length
    }

    // Alternate row shading for readability
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      if (rowNumber % 2 === 0) {
        row.eachCell({ includeEmpty: true }, cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F8FC' } }
        })
      }
    })

    const buffer = await workbook.xlsx.writeBuffer()
    const fecha  = new Date().toISOString().split('T')[0]

    return new Response(buffer as ArrayBuffer, {
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Data_360_${fecha}.xlsx"`,
        'Cache-Control':       'no-store',
      },
    })
  } catch (err) {
    console.error('[ExportCaracterizaciones]', err)
    return NextResponse.json({ error: 'Error al exportar' }, { status: 500 })
  }
}
