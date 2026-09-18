import { conCache, fetchJson } from "./cache"

// datos.gov.co (Socrata). Sin app token funciona con cuota baja por IP; con
// SOCRATA_APP_TOKEN la cuota sube. Por eso además cacheamos en BD.
const BASE = "https://www.datos.gov.co/resource"
const EVA_AGRICOLA = "uejq-wxrr"   // EVA 2019-2025, base agrícola municipal
const EVA_CALENDARIO = "526r-sixz" // Calendario nacional de siembras y cosechas

function token() {
  const t = process.env.SOCRATA_APP_TOKEN
  return t ? `&$$app_token=${encodeURIComponent(t)}` : ""
}

/** Quita tildes y normaliza para comparar municipios/cultivos escritos a mano. */
export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toUpperCase()
}

function comillas(v: string) {
  return `'${v.replace(/'/g, "''")}'`
}

/**
 * Socrata no tiene unaccent: buscar "MAIZ" no encuentra "Maíz" y viceversa.
 * Como en LIKE el guion bajo casa con cualquier carácter, sustituimos las
 * vocales por `_` para que el patrón sirva escriba el usuario con tilde o sin
 * ella. Se usa siempre dentro de un LIKE %...%.
 */
function patronLike(texto: string): string {
  return `%${normalizar(texto).replace(/[AEIOU]/g, "_")}%`
}

/**
 * El comodín de vocales del LIKE es deliberadamente laxo y deja pasar falsos
 * positivos: el patrón de "Cacao" (`%C_C__%`) también casa con "arraCACHA".
 * Socrata no puede afinar más, así que el resultado se filtra aquí comparando
 * los textos ya sin tildes.
 */
function coincide(valor: string | undefined, consulta: string | undefined): boolean {
  if (!consulta) return true
  if (!valor) return false
  return normalizar(valor).includes(normalizar(consulta))
}

export interface EvaFila {
  municipio: string
  departamento: string
  cultivo: string
  anio: string
  areaSembradaHa: number
  areaCosechadaHa: number
  produccionTon: number
  rendimientoTonHa: number
  ciclo: string | null
}

export interface EvaResumen {
  filas: EvaFila[]
  rendimientoPromedioTonHa: number | null
  cultivosMasSembrados: Array<{ cultivo: string; areaHa: number; rendimientoTonHa: number }>
}

/**
 * Estadística agrícola oficial (área, producción, rendimiento) por municipio
 * y/o cultivo. Es la referencia con la que se compara el desempeño de un
 * predio: "tu rendimiento vs. el promedio de tu municipio".
 */
export async function consultarEva(opciones: {
  municipio?: string
  departamento?: string
  cultivo?: string
  anioDesde?: number
}): Promise<EvaResumen> {
  const { municipio, departamento, cultivo, anioDesde = 2021 } = opciones
  const clave = normalizar([municipio, departamento, cultivo, anioDesde].filter(Boolean).join("|"))

  const { datos } = await conCache<EvaResumen>("eva", `v2:${clave || "nacional"}`, 24 * 30, async () => {
    const condiciones = [`a_o >= '${anioDesde}'`]
    if (municipio) condiciones.push(`upper(municipio) like ${comillas(patronLike(municipio))}`)
    if (departamento) condiciones.push(`upper(departamento) like ${comillas(patronLike(departamento))}`)
    if (cultivo) condiciones.push(`upper(cultivo) like ${comillas(patronLike(cultivo))}`)

    const url =
      `${BASE}/${EVA_AGRICOLA}.json?$where=${encodeURIComponent(condiciones.join(" AND "))}` +
      `&$order=a_o DESC&$limit=400${token()}`

    const todas = await fetchJson<Array<Record<string, string>>>(url)
    const crudas = todas.filter(
      (r) =>
        coincide(r.municipio, municipio) &&
        coincide(r.departamento, departamento) &&
        coincide(r.cultivo, cultivo),
    )
    const filas: EvaFila[] = crudas.map((r) => ({
      municipio: r.municipio,
      departamento: r.departamento,
      cultivo: r.cultivo,
      anio: r.a_o,
      areaSembradaHa: Number(r.rea_sembrada ?? 0),
      areaCosechadaHa: Number(r.rea_cosechada ?? 0),
      produccionTon: Number(r.producci_n ?? 0),
      rendimientoTonHa: Number(r.rendimiento ?? 0),
      ciclo: r.ciclo_del_cultivo ?? null,
    }))

    const conRendimiento = filas.filter((f) => f.rendimientoTonHa > 0)
    const rendimientoPromedioTonHa = conRendimiento.length
      ? Number((conRendimiento.reduce((a, f) => a + f.rendimientoTonHa, 0) / conRendimiento.length).toFixed(2))
      : null

    const porCultivo = new Map<string, { areaHa: number; rend: number[] }>()
    for (const f of filas) {
      const acc = porCultivo.get(f.cultivo) ?? { areaHa: 0, rend: [] }
      acc.areaHa += f.areaSembradaHa
      if (f.rendimientoTonHa > 0) acc.rend.push(f.rendimientoTonHa)
      porCultivo.set(f.cultivo, acc)
    }

    const cultivosMasSembrados = [...porCultivo.entries()]
      .map(([nombre, v]) => ({
        cultivo: nombre,
        areaHa: Number(v.areaHa.toFixed(1)),
        rendimientoTonHa: v.rend.length
          ? Number((v.rend.reduce((a, b) => a + b, 0) / v.rend.length).toFixed(2))
          : 0,
      }))
      .sort((a, b) => b.areaHa - a.areaHa)
      .slice(0, 12)

    return { filas: filas.slice(0, 60), rendimientoPromedioTonHa, cultivosMasSembrados }
  })

  return datos
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"] as const

export interface CalendarioCultivo {
  cultivo: string
  ciclo: string
  calendario: string // "Siembras" | "Cosechas"
  porMes: Record<string, number>
  mesesPico: string[]
}

/** Calendario nacional de siembras y cosechas — % de actividad por mes. */
export async function consultarCalendario(cultivo: string): Promise<CalendarioCultivo[]> {
  const clave = normalizar(cultivo)
  const { datos } = await conCache<CalendarioCultivo[]>("calendario", `v2:${clave}`, 24 * 90, async () => {
    const where = `upper(cultivo) like ${comillas(patronLike(cultivo))}`
    const url = `${BASE}/${EVA_CALENDARIO}.json?$where=${encodeURIComponent(where)}&$limit=40${token()}`
    const todas = await fetchJson<Array<Record<string, string>>>(url)
    const crudas = todas.filter((r) => coincide(r.cultivo, cultivo))

    return crudas.map((r) => {
      const porMes = Object.fromEntries(MESES.map((m) => [m, Number(r[m] ?? 0)]))
      const ordenados = [...MESES].sort((a, b) => porMes[b] - porMes[a])
      return {
        cultivo: r.cultivo,
        ciclo: r.ciclo,
        calendario: r.calendario,
        porMes,
        mesesPico: ordenados.slice(0, 3),
      }
    })
  })

  return datos
}
