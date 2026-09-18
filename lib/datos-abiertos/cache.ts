/**
 * Caché en memoria (+ opcional BD si existe la tabla). Agro360 aún no tiene
 * `datos_externos_cache` en Prisma; la memoria evita martillar Socrata/UPRA.
 */

export type FuenteExterna =
  | "eva"
  | "calendario"
  | "upra"
  | "upra_catalogo"
  | "suelos"
  | "municipios_geo"

type Entrada = { payload: unknown; expira_en: number }

const memoria = new Map<string, Entrada>()

function llave(fuente: FuenteExterna, clave: string) {
  return `${fuente}::${clave}`
}

export async function conCache<T>(
  fuente: FuenteExterna,
  clave: string,
  ttlHoras: number,
  cargar: () => Promise<T>,
): Promise<{ datos: T; desde: "cache" | "vivo" | "cache-vencida" }> {
  const k = llave(fuente, clave)
  const existente = memoria.get(k)
  const ahora = Date.now()

  if (existente && existente.expira_en > ahora) {
    return { datos: existente.payload as T, desde: "cache" }
  }

  try {
    const datos = await cargar()
    memoria.set(k, { payload: datos, expira_en: ahora + ttlHoras * 3_600_000 })
    return { datos, desde: "vivo" }
  } catch (error) {
    if (existente) return { datos: existente.payload as T, desde: "cache-vencida" }
    throw error
  }
}

export async function fetchJson<T>(url: string, timeoutMs = 15_000): Promise<T> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": "Agro360/1.0" },
    })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`)
    return (await res.json()) as T
  } finally {
    clearTimeout(t)
  }
}
