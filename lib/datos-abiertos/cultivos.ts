import { consultarEva } from "./socrata"

export interface CultivoRecomendado {
  cultivo: string
  areaHa: number
  rendimientoTonHa: number
  /** Rendimiento del mismo cultivo en el departamento, como referencia. */
  rendimientoDepartamentoTonHa: number | null
  /** % de diferencia contra el departamento. Positivo = el municipio rinde mejor. */
  ventajaPct: number | null
  /** Porción del área sembrada del municipio que ocupa este cultivo. */
  participacionPct: number
}

export interface ResumenCultivos {
  ambito: string
  /** true cuando no había datos del municipio y se respondió con el departamento. */
  ampliadoADepartamento: boolean
  advertencia: string | null
  cultivos: CultivoRecomendado[]
  rendimientoPromedioTonHa: number | null
  fuente: string
}

/** Cuántos cultivos del municipio reciben referencia departamental propia. */
const CULTIVOS_COMPARADOS = 8

const FUENTE =
  "Evaluaciones Agropecuarias Municipales (EVA) — MinAgricultura/UPRA, datos.gov.co (uejq-wxrr)"

/**
 * Qué se siembra en un municipio y cómo rinde, ordenado por área. Es una
 * lectura de lo que la zona ya demostró que produce, no una prescripción
 * agronómica: el rendimiento comparado con el departamento indica si el
 * municipio es competitivo en ese cultivo.
 */
export async function consultarTopCultivos(opciones: {
  municipio?: string
  departamento?: string
  anioDesde?: number
}): Promise<ResumenCultivos> {
  const { municipio, departamento, anioDesde = 2021 } = opciones

  const municipal = municipio
    ? await consultarEva({ municipio, departamento, anioDesde })
    : null

  // El departamento sirve para dos cosas: comparar rendimientos y, si el
  // municipio no tiene registros en EVA, responder con el ámbito más amplio en
  // vez de una lista vacía.
  const departamental = departamento
    ? await consultarEva({ departamento, anioDesde })
    : null

  const hayMunicipal = !!municipal?.cultivosMasSembrados.length
  const base = hayMunicipal ? municipal! : departamental
  const ampliadoADepartamento = !hayMunicipal && !!departamental?.cultivosMasSembrados.length

  if (!base?.cultivosMasSembrados.length) {
    return {
      ambito: municipio ?? departamento ?? "Colombia",
      ampliadoADepartamento: false,
      advertencia: "EVA no tiene registros agrícolas para esta zona.",
      cultivos: [],
      rendimientoPromedioTonHa: null,
      fuente: FUENTE,
    }
  }

  const rendDepartamento = new Map(
    (departamental?.cultivosMasSembrados ?? []).map((c) => [c.cultivo, c.rendimientoTonHa]),
  )

  // El resumen departamental solo trae sus 12 cultivos de mayor área, así que
  // el cultivo principal de un municipio pequeño puede faltar. Para los que
  // van a mostrarse se pide la referencia una por una (va por caché, de modo
  // que solo la primera vez sale a la red).
  if (departamento && !ampliadoADepartamento) {
    const faltantes = base.cultivosMasSembrados
      .slice(0, CULTIVOS_COMPARADOS)
      .filter((c) => !rendDepartamento.has(c.cultivo))

    const referencias = await Promise.all(
      faltantes.map(async (c) => {
        try {
          const r = await consultarEva({ departamento, cultivo: c.cultivo, anioDesde })
          const coincidencia = r.cultivosMasSembrados.find((x) => x.cultivo === c.cultivo)
          return [c.cultivo, coincidencia?.rendimientoTonHa ?? r.rendimientoPromedioTonHa ?? 0] as const
        } catch {
          return [c.cultivo, 0] as const
        }
      }),
    )
    for (const [cultivo, rend] of referencias) {
      if (rend > 0) rendDepartamento.set(cultivo, rend)
    }
  }

  const areaTotal = base.cultivosMasSembrados.reduce((a, c) => a + c.areaHa, 0)

  const cultivos: CultivoRecomendado[] = base.cultivosMasSembrados.map((c) => {
    const refDpto = rendDepartamento.get(c.cultivo) ?? null
    // Solo tiene sentido comparar si ambos rendimientos existen y el ámbito es
    // el municipio: comparar el departamento contra sí mismo daría siempre 0.
    const comparable = !ampliadoADepartamento && !!refDpto && refDpto > 0 && c.rendimientoTonHa > 0
    return {
      cultivo: c.cultivo,
      areaHa: c.areaHa,
      rendimientoTonHa: c.rendimientoTonHa,
      rendimientoDepartamentoTonHa: refDpto,
      ventajaPct: comparable ? Number((((c.rendimientoTonHa - refDpto!) / refDpto!) * 100).toFixed(1)) : null,
      participacionPct: areaTotal > 0 ? Number(((c.areaHa / areaTotal) * 100).toFixed(1)) : 0,
    }
  })

  return {
    ambito: ampliadoADepartamento ? (departamento ?? "") : (municipio ?? departamento ?? "Colombia"),
    ampliadoADepartamento,
    advertencia: ampliadoADepartamento
      ? `EVA no tiene registros de ${municipio}; estos cultivos son de todo el departamento.`
      : null,
    cultivos,
    rendimientoPromedioTonHa: base.rendimientoPromedioTonHa,
    fuente: FUENTE,
  }
}
