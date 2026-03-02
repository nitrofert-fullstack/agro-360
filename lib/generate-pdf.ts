import type { CaracterizacionLocal } from '@/lib/db/indexed-db'

export interface PDFCaracterizacion {
  radicado: string
  estado?: string
  // Visita
  fechaVisita?: string
  nombreTecnico?: string
  // Beneficiario
  nombreCompleto: string
  tipoDocumento?: string
  numeroDocumento?: string
  edad?: number | null
  telefono?: string
  correo?: string
  ocupacionPrincipal?: string
  // Predio
  nombrePredio?: string
  departamento?: string
  municipio?: string
  vereda?: string
  tipoTenencia?: string
  codigoCatastral?: string
  areaTotalHectareas?: number | null
  areaProductivaHectareas?: number | null
  altitudMsnm?: number | null
  latitud?: number | null
  longitud?: number | null
  cultivosExistentes?: string
  viveEnPredio?: string | boolean | null
  // Caracterizacion predio
  topografia?: string
  tipoSuelo?: string
  rutaAcceso?: string
  distanciaKm?: number | null
  tiempoAcceso?: string
  temperaturaCelsius?: number | null
  mesesLluvia?: string
  coberturaBosque?: boolean
  coberturaCultivos?: boolean
  coberturaPastos?: boolean
  coberturaRastrojo?: boolean
  // Agua
  fuentesAgua?: string[]
  otraFuente?: string
  // Riesgos
  riesgos?: string[]
  otrosRiesgos?: string
  // Area productiva
  sistemaProductivo?: string
  estadoCultivo?: string
  cantidadProduccion?: string
  ingresoMensualVentas?: number | null
  dondeComercializa?: string
  interesadoPrograma?: boolean
  // Financiera
  ingresosMensualesAgropecuaria?: number | null
  ingresosMensualesOtros?: number | null
  egresosMensuales?: number | null
  activosTotales?: number | null
  pasivosTotales?: number | null
  // Autorizaciones
  autorizaTratamientoDatos?: boolean
  autorizaConsultaCrediticia?: boolean
  // Observaciones
  observaciones?: string
}

const estadoLabels: Record<string, string> = {
  PENDIENTE_SINCRONIZACION: 'Pendiente',
  SINCRONIZADO: 'Sincronizado',
  EN_REVISION: 'En Revision',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
}

export function generateCaracterizacionPDF(data: PDFCaracterizacion): void {
  const fechaGen = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const estadoLabel = estadoLabels[data.estado ?? ''] ?? data.estado ?? 'Pendiente'

  const field = (label: string, value: string | number | null | undefined) =>
    value != null && value !== ''
      ? `<div class="field"><span class="lbl">${label}:</span> <span class="val">${value}</span></div>`
      : ''

  const money = (v: number | null | undefined) =>
    v != null ? `$${Number(v).toLocaleString('es-CO')}` : null

  const viveStr =
    typeof data.viveEnPredio === 'boolean'
      ? data.viveEnPredio
        ? 'Si'
        : 'No'
      : data.viveEnPredio === 'si'
      ? 'Si'
      : data.viveEnPredio === 'no'
      ? 'No'
      : (data.viveEnPredio ?? null)

  const fuentesAguaHtml =
    (data.fuentesAgua ?? []).length > 0 || data.otraFuente
      ? `<div class="tags">${(data.fuentesAgua ?? [])
          .map((f) => `<span class="tag">${f}</span>`)
          .join('')}${data.otraFuente ? `<span class="tag">${data.otraFuente}</span>` : ''}</div>`
      : ''

  const riesgosHtml =
    (data.riesgos ?? []).length > 0 || data.otrosRiesgos
      ? `<div class="tags">${(data.riesgos ?? [])
          .map((r) => `<span class="tag tag-red">${r}</span>`)
          .join('')}${data.otrosRiesgos ? `<span class="tag tag-red">${data.otrosRiesgos}</span>` : ''}</div>`
      : ''

  const coberturas = [
    data.coberturaBosque ? 'Bosque' : null,
    data.coberturaCultivos ? 'Cultivos' : null,
    data.coberturaPastos ? 'Pastos' : null,
    data.coberturaRastrojo ? 'Rastrojo' : null,
  ].filter(Boolean) as string[]

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Caracterizacion — ${data.nombreCompleto}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;font-size:10.5px;color:#111;background:#fff}
    .page{padding:14mm 12mm;max-width:210mm;margin:0 auto}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #16a34a;padding-bottom:10px;margin-bottom:14px}
    .logo{font-size:18px;font-weight:900;color:#16a34a;letter-spacing:-0.5px}
    .logo-sub{font-size:9px;color:#555;margin-top:2px}
    .header-right{text-align:right}
    .doc-title{font-size:12px;font-weight:700;text-transform:uppercase;color:#111;margin-bottom:3px}
    .radicado{font-family:monospace;font-size:9.5px;color:#555}
    .estado-badge{display:inline-block;padding:2px 7px;border-radius:99px;font-size:9px;font-weight:700;margin-top:3px;background:#dcfce7;color:#15803d}
    h2{font-size:11px;font-weight:700;color:#15803d;border-left:3px solid #16a34a;padding:2px 0 2px 7px;margin:12px 0 7px;text-transform:uppercase;letter-spacing:0.4px}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:3px 18px}
    .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px 12px}
    .field{margin-bottom:4px;line-height:1.4}
    .lbl{color:#555;font-size:9.5px}
    .val{font-weight:600;font-size:10px;color:#111}
    .tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
    .tag{padding:2px 7px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;font-size:9px;color:#15803d;font-weight:600}
    .tag-red{background:#fef2f2;border-color:#fecaca;color:#dc2626}
    .section-box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:5px;padding:8px 10px;margin-bottom:10px}
    .footer{margin-top:20px;border-top:1px solid #e5e7eb;padding-top:8px;display:flex;justify-content:space-between;color:#9ca3af;font-size:8.5px}
    .auth-row{display:flex;gap:12px;flex-wrap:wrap;margin-top:4px}
    .auth-item{padding:2px 8px;border-radius:4px;font-size:9px;font-weight:600}
    .auth-ok{background:#dcfce7;color:#15803d}
    .auth-no{background:#fee2e2;color:#dc2626}
    @page{size:A4;margin:10mm}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style>
</head>
<body>
<div class="page">

  <div class="header">
    <div>
      <div class="logo">Agro360</div>
      <div class="logo-sub">Sistema de Caracterizacion Agropecuaria — Santander, Colombia</div>
    </div>
    <div class="header-right">
      <div class="doc-title">Ficha de Caracterizacion Predial</div>
      <div class="radicado">Radicado: ${data.radicado}</div>
      <div class="radicado">Generado: ${fechaGen}</div>
      <div class="estado-badge">${estadoLabel}</div>
    </div>
  </div>

  <h2>Datos del Productor</h2>
  <div class="section-box">
    <div class="grid2">
      ${field('Nombre completo', data.nombreCompleto)}
      ${field('Tipo documento', data.tipoDocumento)}
      ${field('Num. documento', data.numeroDocumento)}
      ${field('Edad', data.edad ? `${data.edad} años` : null)}
      ${field('Telefono', data.telefono)}
      ${field('Correo', data.correo)}
      ${field('Ocupacion', data.ocupacionPrincipal)}
      ${field('Municipio', data.municipio)}
      ${field('Vereda', data.vereda)}
    </div>
  </div>

  <h2>Datos del Predio</h2>
  <div class="section-box">
    <div class="grid3">
      ${field('Nombre predio', data.nombrePredio)}
      ${field('Departamento', data.departamento)}
      ${field('Municipio', data.municipio)}
      ${field('Vereda', data.vereda)}
      ${field('Tipo tenencia', data.tipoTenencia)}
      ${field('Codigo catastral', data.codigoCatastral)}
      ${field('Area total', data.areaTotalHectareas ? `${data.areaTotalHectareas} ha` : null)}
      ${field('Area productiva', data.areaProductivaHectareas ? `${data.areaProductivaHectareas} ha` : null)}
      ${field('Altitud', data.altitudMsnm ? `${data.altitudMsnm} msnm` : null)}
      ${field('Coordenadas', data.latitud && data.longitud ? `${Number(data.latitud).toFixed(5)}, ${Number(data.longitud).toFixed(5)}` : null)}
      ${field('Vive en predio', viveStr)}
      ${field('Cultivos existentes', data.cultivosExistentes)}
    </div>
  </div>

  ${data.topografia || data.rutaAcceso || data.tiempoAcceso ? `
  <h2>Caracterizacion del Predio</h2>
  <div class="section-box">
    <div class="grid3">
      ${field('Topografia', data.topografia)}
      ${field('Tipo suelo', data.tipoSuelo)}
      ${field('Ruta acceso', data.rutaAcceso)}
      ${field('Distancia', data.distanciaKm ? `${data.distanciaKm} km` : null)}
      ${field('Tiempo acceso', data.tiempoAcceso)}
      ${field('Temperatura', data.temperaturaCelsius ? `${data.temperaturaCelsius} °C` : null)}
      ${field('Meses lluvia', data.mesesLluvia)}
    </div>
    ${coberturas.length > 0 ? `<div style="margin-top:6px">${field('Coberturas vegetales', coberturas.join(', '))}</div>` : ''}
  </div>` : ''}

  ${fuentesAguaHtml ? `
  <h2>Abastecimiento de Agua</h2>
  <div class="section-box">${fuentesAguaHtml}</div>` : ''}

  ${riesgosHtml ? `
  <h2>Riesgos del Predio</h2>
  <div class="section-box">${riesgosHtml}</div>` : ''}

  ${data.sistemaProductivo || data.estadoCultivo || data.cantidadProduccion ? `
  <h2>Area Productiva</h2>
  <div class="section-box">
    <div class="grid3">
      ${field('Sistema productivo', data.sistemaProductivo)}
      ${field('Estado cultivo', data.estadoCultivo)}
      ${field('Cantidad produccion', data.cantidadProduccion)}
      ${field('Ingreso mensual', money(data.ingresoMensualVentas))}
      ${field('Donde comercializa', data.dondeComercializa)}
      ${field('Interesado en programa', data.interesadoPrograma ? 'Si' : null)}
    </div>
  </div>` : ''}

  ${data.ingresosMensualesAgropecuaria != null || data.ingresosMensualesOtros != null || data.activosTotales != null ? `
  <h2>Informacion Financiera</h2>
  <div class="section-box">
    <div class="grid3">
      ${field('Ingresos agropecuarios', money(data.ingresosMensualesAgropecuaria))}
      ${field('Otros ingresos', money(data.ingresosMensualesOtros))}
      ${field('Egresos mensuales', money(data.egresosMensuales))}
      ${field('Activos totales', money(data.activosTotales))}
      ${field('Pasivos totales', money(data.pasivosTotales))}
    </div>
  </div>` : ''}

  <h2>Datos del Registro</h2>
  <div class="section-box">
    <div class="grid3">
      ${field('Tecnico / Asesor', data.nombreTecnico)}
      ${field('Fecha visita', data.fechaVisita ? new Date(data.fechaVisita).toLocaleDateString('es-CO') : null)}
      ${field('Radicado', data.radicado)}
    </div>
  </div>

  <h2>Autorizaciones</h2>
  <div class="section-box">
    <div class="auth-row">
      <span class="auth-item ${data.autorizaTratamientoDatos ? 'auth-ok' : 'auth-no'}">
        ${data.autorizaTratamientoDatos ? '&#10003;' : '&#10007;'} Tratamiento de datos personales
      </span>
      ${data.autorizaConsultaCrediticia != null ? `
      <span class="auth-item ${data.autorizaConsultaCrediticia ? 'auth-ok' : 'auth-no'}">
        ${data.autorizaConsultaCrediticia ? '&#10003;' : '&#10007;'} Consulta crediticia
      </span>` : ''}
    </div>
    ${data.observaciones ? `<div style="margin-top:8px">${field('Observaciones', data.observaciones)}</div>` : ''}
  </div>

  <div class="footer">
    <span>Agro360 — Sistema de Caracterizacion Agropecuaria</span>
    <span>Documento generado el ${fechaGen}</span>
  </div>
</div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) {
    alert('Permite las ventanas emergentes para generar el PDF')
    return
  }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => {
    win.print()
  }, 500)
}

// ==================== ADAPTER: FormData → PDFCaracterizacion ====================
// Accepts the local FormData structure from characterization-form-complete.tsx
export function pdfFromFormData(
  fd: {
    visita: any
    beneficiario: any
    predio: any
    caracterizacion: any
    abastecimientoAgua: any
    riesgos: any
    areaProductiva: any
    infoFinanciera: any
    autorizaciones: any
    observaciones: string
  },
  radicado: string,
  estado = 'PENDIENTE_SINCRONIZACION'
): PDFCaracterizacion {
  const b = fd.beneficiario
  const p = fd.predio
  const c = fd.caracterizacion
  const ag = fd.abastecimientoAgua
  const r = fd.riesgos
  const ap = fd.areaProductiva
  const fi = fd.infoFinanciera
  const v = fd.visita

  const fuentesAgua: string[] = [
    ag?.nacimientoManantial && 'Nacimiento/Manantial',
    ag?.rioQuebrada && 'Rio/Quebrada',
    ag?.pozo && 'Pozo',
    ag?.acueductoRural && 'Acueducto Rural',
    ag?.canalDistritoRiego && 'Canal Distrito Riego',
    ag?.jagueyReservorio && 'Jagüey/Reservorio',
    ag?.aguaLluvia && 'Agua Lluvia',
  ].filter(Boolean) as string[]

  const riesgos: string[] = [
    r?.inundacion && 'Inundacion',
    r?.sequia && 'Sequia',
    r?.viento && 'Viento',
    r?.helada && 'Helada',
  ].filter(Boolean) as string[]

  return {
    radicado,
    estado,
    fechaVisita: v?.fechaVisita,
    nombreTecnico: v?.nombreTecnico,
    nombreCompleto: `${b?.nombres ?? ''} ${b?.apellidos ?? ''}`.trim() || 'Sin nombre',
    tipoDocumento: b?.tipoDocumento,
    numeroDocumento: b?.numeroDocumento,
    edad: b?.edad,
    telefono: b?.telefono,
    correo: b?.correo,
    ocupacionPrincipal: b?.ocupacionPrincipal,
    nombrePredio: p?.nombrePredio,
    departamento: p?.departamento,
    municipio: p?.municipio,
    vereda: p?.vereda,
    tipoTenencia: p?.tipoTenencia,
    codigoCatastral: p?.codigoCatastral,
    areaTotalHectareas: p?.areaTotalHectareas,
    areaProductivaHectareas: p?.areaProductivaHectareas,
    altitudMsnm: p?.altitudMsnm,
    latitud: p?.latitud,
    longitud: p?.longitud,
    cultivosExistentes: p?.cultivosExistentes,
    viveEnPredio: p?.viveEnPredio,
    topografia: c?.topografia,
    rutaAcceso: c?.rutaAcceso,
    distanciaKm: c?.distanciaKm,
    tiempoAcceso: c?.tiempoAcceso,
    temperaturaCelsius: c?.temperaturaCelsius,
    mesesLluvia: c?.mesesLluvia,
    coberturaBosque: c?.coberturaBosque,
    coberturaCultivos: c?.coberturaCultivos,
    coberturaPastos: c?.coberturaPastos,
    coberturaRastrojo: c?.coberturaRastrojo,
    fuentesAgua,
    otraFuente: ag?.otraFuente,
    riesgos,
    otrosRiesgos: r?.otrosRiesgos,
    sistemaProductivo: ap?.sistemaProductivo,
    estadoCultivo: ap?.estadoCultivo,
    cantidadProduccion: ap?.cantidadProduccion,
    ingresoMensualVentas: ap?.ingresoMensualVentas,
    dondeComercializa: ap?.dondeComercializa,
    interesadoPrograma: ap?.interesadoPrograma,
    ingresosMensualesAgropecuaria: fi?.ingresosMensualesAgropecuaria,
    ingresosMensualesOtros: fi?.ingresosMensualesOtros,
    egresosMensuales: fi?.egresosMensuales,
    activosTotales: fi?.activosTotales,
    pasivosTotales: fi?.pasivosTotales,
    autorizaTratamientoDatos: fd.autorizaciones?.autorizacionDatosPersonales,
    autorizaConsultaCrediticia: fd.autorizaciones?.autorizacionConsultaCrediticia,
    observaciones: fd.observaciones,
  }
}

// ==================== ADAPTER: CaracterizacionLocal → PDFCaracterizacion ====================
export function pdfFromLocalData(local: CaracterizacionLocal): PDFCaracterizacion {
  const b = local.beneficiario
  const p = local.predio
  const c = local.caracterizacion
  const ar = local.aguaRiesgos
  const ap = local.areaProductiva
  const fi = local.infoFinanciera
  const v = local.visita

  const fuentesAgua: string[] = [
    ar?.nacimientoManantial && 'Nacimiento/Manantial',
    ar?.rioQuebrada && 'Rio/Quebrada',
    ar?.pozo && 'Pozo',
    ar?.acueductoRural && 'Acueducto Rural',
    ar?.canalDistritoRiego && 'Canal Distrito Riego',
    ar?.jagueyReservorio && 'Jagüey/Reservorio',
    ar?.aguaLluvia && 'Agua Lluvia',
  ].filter(Boolean) as string[]

  const riesgos: string[] = [
    ar?.inundacion && 'Inundacion',
    ar?.sequia && 'Sequia',
    ar?.viento && 'Viento',
    ar?.helada && 'Helada',
  ].filter(Boolean) as string[]

  const nombreCompleto =
    [b?.primerNombre, b?.segundoNombre, b?.primerApellido, b?.segundoApellido]
      .filter(Boolean)
      .join(' ') || 'Sin nombre'

  return {
    radicado: local.radicadoOficial ?? local.radicadoLocal,
    estado: local.estado,
    fechaVisita: v?.fechaVisita,
    nombreTecnico: v?.nombreTecnico,
    nombreCompleto,
    tipoDocumento: b?.tipoDocumento,
    numeroDocumento: b?.numeroDocumento,
    edad: b?.edad,
    telefono: b?.telefono,
    correo: b?.email,
    ocupacionPrincipal: b?.ocupacionPrincipal,
    nombrePredio: p?.nombrePredio,
    departamento: p?.departamento,
    municipio: p?.municipio,
    vereda: p?.vereda,
    tipoTenencia: p?.tipoTenencia,
    codigoCatastral: p?.codigoCatastral,
    areaTotalHectareas: p?.areaTotalHectareas,
    areaProductivaHectareas: p?.areaProductivaHectareas,
    altitudMsnm: p?.altitudMsnm,
    latitud: p?.latitud,
    longitud: p?.longitud,
    cultivosExistentes: p?.cultivosExistentes,
    viveEnPredio: p?.viveEnPredio,
    topografia: c?.topografia,
    tipoSuelo: c?.tipoSuelo,
    rutaAcceso: c?.rutaAcceso,
    distanciaKm: c?.distanciaKm,
    tiempoAcceso: c?.tiempoAcceso,
    temperaturaCelsius: c?.temperaturaCelsius,
    mesesLluvia: c?.mesesLluvia,
    coberturaBosque: c?.coberturaBosque,
    coberturaCultivos: c?.coberturaCultivos,
    coberturaPastos: c?.coberturaPastos,
    coberturaRastrojo: c?.coberturaRastrojo,
    fuentesAgua,
    otraFuente: ar?.otraFuente,
    riesgos,
    otrosRiesgos: ar?.otrosRiesgos,
    sistemaProductivo: ap?.sistemaProduccion,
    estadoCultivo: ap?.estadoCultivo,
    cantidadProduccion: ap?.cantidadProduccion,
    ingresoMensualVentas: ap?.ingresoMensualVentas,
    dondeComercializa: ap?.dondeComercializa,
    interesadoPrograma: ap?.interesadoPrograma,
    ingresosMensualesAgropecuaria: fi?.ingresosMensualesAgropecuaria,
    ingresosMensualesOtros: fi?.ingresosMensualesOtros,
    egresosMensuales: fi?.egresosMensuales,
    activosTotales: fi?.activosTotales,
    pasivosTotales: fi?.pasivosTotales,
    autorizaTratamientoDatos: local.autorizacion?.autorizaTratamientoDatos,
    autorizaConsultaCrediticia: local.autorizacion?.autorizaConsultaCrediticia,
    observaciones: local.observaciones,
  }
}

// ==================== ADAPTER: ServerData → PDFCaracterizacion ====================
// ServerData comes from /api/caracterizacion/[id] — snake_case Supabase fields
export function pdfFromServerData(server: {
  visita: any
  caracterizacion: any
  beneficiario: any
  predio: any
  caracterizacionPredio: any
  abastecimientoAgua: any
  riesgosPredio: any
  areaProductiva: any
  infoFinanciera: any
}): PDFCaracterizacion {
  const { visita, beneficiario, predio, caracterizacionPredio, abastecimientoAgua, riesgosPredio, areaProductiva, infoFinanciera } = server

  const nombre = beneficiario
    ? `${beneficiario.nombres ?? ''} ${beneficiario.apellidos ?? ''}`.trim() || 'Sin nombre'
    : 'Sin nombre'

  const fuentesAgua: string[] = [
    abastecimientoAgua?.nacimiento_manantial && 'Nacimiento/Manantial',
    abastecimientoAgua?.rio_quebrada && 'Rio/Quebrada',
    abastecimientoAgua?.pozo && 'Pozo',
    abastecimientoAgua?.acueducto_rural && 'Acueducto Rural',
    abastecimientoAgua?.canal_distrito_riego && 'Canal Distrito Riego',
    abastecimientoAgua?.jaguey_reservorio && 'Jagüey/Reservorio',
    abastecimientoAgua?.agua_lluvia && 'Agua Lluvia',
  ].filter(Boolean) as string[]

  const riesgos: string[] = [
    riesgosPredio?.inundacion && 'Inundacion',
    riesgosPredio?.sequia && 'Sequia',
    riesgosPredio?.viento && 'Viento',
    riesgosPredio?.helada && 'Helada',
  ].filter(Boolean) as string[]

  return {
    radicado: visita?.radicado_oficial ?? visita?.radicado_local ?? '',
    estado: visita?.estado,
    fechaVisita: visita?.fecha_visita,
    nombreTecnico: visita?.nombre_tecnico,
    nombreCompleto: nombre,
    tipoDocumento: beneficiario?.tipo_documento,
    numeroDocumento: beneficiario?.numero_documento,
    edad: beneficiario?.edad,
    telefono: beneficiario?.telefono,
    correo: beneficiario?.correo,
    ocupacionPrincipal: beneficiario?.ocupacion_principal,
    nombrePredio: predio?.nombre_predio,
    departamento: predio?.departamento,
    municipio: predio?.municipio,
    vereda: predio?.vereda,
    tipoTenencia: predio?.tipo_tenencia,
    codigoCatastral: predio?.codigo_catastral,
    areaTotalHectareas: predio?.area_total_hectareas ?? predio?.area_total,
    areaProductivaHectareas: predio?.area_productiva_hectareas ?? predio?.area_cultivada,
    altitudMsnm: predio?.altitud_msnm ?? predio?.altitud,
    latitud: predio?.latitud ? parseFloat(predio.latitud) : null,
    longitud: predio?.longitud ? parseFloat(predio.longitud) : null,
    cultivosExistentes: predio?.cultivos_existentes,
    viveEnPredio: predio?.vive_en_predio,
    topografia: caracterizacionPredio?.topografia,
    tipoSuelo: caracterizacionPredio?.tipo_suelo,
    rutaAcceso: caracterizacionPredio?.ruta_acceso,
    distanciaKm: caracterizacionPredio?.distancia_km,
    tiempoAcceso: caracterizacionPredio?.tiempo_acceso,
    temperaturaCelsius: caracterizacionPredio?.temperatura_celsius,
    mesesLluvia: caracterizacionPredio?.meses_lluvia,
    coberturaBosque: caracterizacionPredio?.cobertura_bosque,
    coberturaCultivos: caracterizacionPredio?.cobertura_cultivos,
    coberturaPastos: caracterizacionPredio?.cobertura_pastos,
    coberturaRastrojo: caracterizacionPredio?.cobertura_rastrojo,
    fuentesAgua,
    otraFuente: abastecimientoAgua?.otra_fuente,
    riesgos,
    otrosRiesgos: riesgosPredio?.otros_riesgos,
    sistemaProductivo: areaProductiva?.sistema_produccion,
    estadoCultivo: areaProductiva?.estado_cultivo,
    cantidadProduccion: areaProductiva?.cantidad_produccion,
    ingresoMensualVentas: areaProductiva?.ingreso_mensual_ventas,
    dondeComercializa: areaProductiva?.donde_comercializa,
    interesadoPrograma: areaProductiva?.interesado_programa,
    ingresosMensualesAgropecuaria: infoFinanciera?.ingresos_mensuales_agropecuaria,
    ingresosMensualesOtros: infoFinanciera?.ingresos_mensuales_otros,
    egresosMensuales: infoFinanciera?.egresos_mensuales,
    activosTotales: infoFinanciera?.activos_totales,
    pasivosTotales: infoFinanciera?.pasivos_totales,
    autorizaTratamientoDatos: server.caracterizacion?.autoriza_tratamiento_datos,
    autorizaConsultaCrediticia: server.caracterizacion?.autoriza_consulta_crediticia,
    observaciones: server.caracterizacion?.observaciones ?? visita?.observaciones,
  }
}
