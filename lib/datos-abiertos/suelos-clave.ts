/**
 * Parámetros de suelo que merecen verse de un vistazo junto al análisis
 * satelital. El resto sigue en el panel lateral completo.
 */
export const PARAMETROS_CLAVE = [
  "pH (agua)",
  "Materia orgánica",
  "Fósforo (Bray II)",
  "Potasio",
  "Aluminio intercambiable",
  "CIC",
] as const

export type ClasificacionSuelo = "bajo" | "medio" | "alto"

export interface ParametroSueloVista {
  parametro: string
  unidad: string
  mediana: number
  clasificacion: ClasificacionSuelo
  esLimitante: boolean
}

/** Etiqueta corta para cabeceras apretadas. */
export function etiquetaCorta(parametro: string): string {
  const map: Record<string, string> = {
    "pH (agua)": "pH",
    "Materia orgánica": "M.O.",
    "Fósforo (Bray II)": "P",
    Potasio: "K",
    "Aluminio intercambiable": "Al",
    CIC: "CIC",
    Azufre: "S",
    Calcio: "Ca",
    Magnesio: "Mg",
  }
  return map[parametro] ?? parametro
}

export function seleccionarParametrosClave<T extends ParametroSueloVista>(
  parametros: T[],
  max = 6,
): T[] {
  const porNombre = new Map(parametros.map((p) => [p.parametro, p]))
  const elegidos: T[] = []
  for (const nombre of PARAMETROS_CLAVE) {
    const p = porNombre.get(nombre)
    if (p) elegidos.push(p)
    if (elegidos.length >= max) break
  }
  // Si faltan huecos, completa con limitantes que no estén ya.
  if (elegidos.length < max) {
    for (const p of parametros) {
      if (elegidos.includes(p)) continue
      if (!p.esLimitante) continue
      elegidos.push(p)
      if (elegidos.length >= max) break
    }
  }
  return elegidos
}
