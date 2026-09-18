import { conCache, fetchJson } from "./cache"
import { normalizar } from "./socrata"

// UPRA publica su información (los tableros de upra.gov.co, SIPRA y los
// StoryMaps/Experience Builder de "Monitoreo de cultivos" y "Macroeconomía")
// como servicios ArcGIS REST públicos de esta organización. Consultamos esos
// servicios por API en vez de scrapear el HTML de los tableros.
const ORG_UPRA = "wLfHepIACaM0pwj9"
const BUSQUEDA = "https://www.arcgis.com/sharing/rest/search"

interface ServicioUpra {
  titulo: string
  url: string
  descripcion: string
}

/** Catálogo de servicios públicos de UPRA (cacheado 30 días). */
export async function catalogoUpra(): Promise<ServicioUpra[]> {
  const { datos } = await conCache<ServicioUpra[]>("upra_catalogo", "todos", 24 * 30, async () => {
    const servicios: ServicioUpra[] = []
    for (let inicio = 1; inicio <= 400; inicio += 100) {
      const url =
        `${BUSQUEDA}?f=json&num=100&start=${inicio}&sortField=numviews&sortOrder=desc` +
        `&q=${encodeURIComponent(`orgid:${ORG_UPRA} AND type:"Feature Service"`)}`
      const res = await fetchJson<{ results?: Array<{ title: string; url?: string; snippet?: string }> }>(url)
      if (!res.results?.length) break
      for (const r of res.results) {
        if (r.url) servicios.push({ titulo: r.title, url: r.url, descripcion: r.snippet ?? "" })
      }
    }
    return servicios
  })
  return datos
}

/** Busca en el catálogo los servicios que mejor coinciden con un tema. */
export async function buscarServiciosUpra(tema: string, limite = 6): Promise<ServicioUpra[]> {
  const catalogo = await catalogoUpra()
  const terminos = normalizar(tema).split(/\s+/).filter((t) => t.length > 2)
  return catalogo
    .map((s) => {
      const texto = normalizar(`${s.titulo} ${s.descripcion}`)
      return { s, puntaje: terminos.filter((t) => texto.includes(t)).length }
    })
    .filter((x) => x.puntaje > 0)
    .sort((a, b) => b.puntaje - a.puntaje)
    .slice(0, limite)
    .map((x) => x.s)
}

interface CapaUpra {
  id: number
  nombre: string
}

async function capasDe(servicioUrl: string): Promise<CapaUpra[]> {
  const { datos } = await conCache<CapaUpra[]>("upra", `capas:${servicioUrl}`, 24 * 30, async () => {
    const meta = await fetchJson<{
      layers?: Array<{ id: number; name: string }>
      tables?: Array<{ id: number; name: string }>
    }>(`${servicioUrl}?f=json`)
    return [...(meta.layers ?? []), ...(meta.tables ?? [])].map((l) => ({ id: l.id, nombre: l.name }))
  })
  return datos
}

export interface ResultadoUpra {
  servicio: string
  capa: string
  registros: Array<Record<string, unknown>>
  totalDevuelto: number
}

/**
 * Consulta un tema en los servicios de UPRA: encuentra el servicio y la capa
 * más pertinentes y devuelve registros filtrados. `filtro` es SQL de ArcGIS
 * (ej. "departamento = 'Antioquia' AND cultivo LIKE '%Maíz%'"); si no aplica a
 * la capa encontrada, se reintenta sin filtro para no quedarse sin respuesta.
 */
export async function consultarUpra(opciones: {
  tema: string
  filtro?: string
  maxRegistros?: number
}): Promise<ResultadoUpra | { error: string; serviciosDisponibles: string[] }> {
  const { tema, filtro, maxRegistros = 25 } = opciones
  const candidatos = await buscarServiciosUpra(tema)
  if (!candidatos.length) {
    const catalogo = await catalogoUpra()
    return { error: `Sin servicio UPRA para "${tema}"`, serviciosDisponibles: catalogo.slice(0, 30).map((s) => s.titulo) }
  }

  for (const servicio of candidatos) {
    let capas: CapaUpra[]
    try {
      capas = await capasDe(servicio.url)
    } catch {
      continue
    }
    if (!capas.length) continue

    const terminos = normalizar(tema).split(/\s+/).filter((t) => t.length > 2)
    const capa =
      capas.find((c) => terminos.some((t) => normalizar(c.nombre).includes(t))) ?? capas[0]

    for (const where of [filtro || "1=1", "1=1"]) {
      const clave = `${servicio.url}|${capa.id}|${where}|${maxRegistros}`
      try {
        const { datos } = await conCache<ResultadoUpra>("upra", clave, 24 * 7, async () => {
          const url =
            `${servicio.url}/${capa.id}/query?f=json&outFields=*&returnGeometry=false` +
            `&resultRecordCount=${maxRegistros}&where=${encodeURIComponent(where)}`
          const res = await fetchJson<{ features?: Array<{ attributes: Record<string, unknown> }>; error?: unknown }>(url)
          if (!res.features) throw new Error("consulta ArcGIS sin resultados utilizables")
          const registros = res.features.map((f) => f.attributes)
          return { servicio: servicio.titulo, capa: capa.nombre, registros, totalDevuelto: registros.length }
        })
        if (datos.totalDevuelto > 0) return datos
      } catch {
        // siguiente intento (sin filtro, u otro servicio)
      }
    }
  }

  return { error: `Los servicios de UPRA para "${tema}" no devolvieron registros`, serviciosDisponibles: candidatos.map((s) => s.titulo) }
}
