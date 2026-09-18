import { conCache, fetchJson } from "./cache"
import { normalizar } from "./socrata"

/**
 * Resultados de análisis de suelos en Colombia (ICA, vía datos.gov.co).
 * ~93.000 muestras reales de laboratorio con química completa: pH, materia
 * orgánica, macro y micronutrientes, CIC, salinidad y acidez intercambiable.
 *
 * Para qué sirve: el agricultor casi nunca llega con un análisis de suelo
 * propio, así que hasta ahora Nitria IA recomendaba fertilización sin un solo
 * dato de química. Con esto se obtiene la línea base de fertilidad real de su
 * zona y cultivo, con la que el analista (y la IA) puede anticipar qué está
 * limitando el rendimiento antes de que exista un análisis del lote.
 *
 * No reemplaza un análisis del predio: es el comportamiento típico de la zona.
 */
const ANALISIS_SUELOS = "ch4u-f3i5"
const BASE = "https://www.datos.gov.co/resource"

function token() {
  const t = process.env.SOCRATA_APP_TOKEN
  return t ? `&$$app_token=${encodeURIComponent(t)}` : ""
}

function comillas(v: string) {
  return `'${v.replace(/'/g, "''")}'`
}

/** Mismo truco que en EVA: Socrata no tiene unaccent, las vocales van como `_`. */
function patronLike(texto: string): string {
  return `%${normalizar(texto).replace(/[AEIOU]/g, "_")}%`
}

type Clasificacion = "bajo" | "medio" | "alto"

export interface Parametro {
  /** Columna en el dataset del ICA. */
  columna: string
  etiqueta: string
  unidad: string
  /** Por debajo de `bajo` es deficiente; por encima de `alto` es excesivo. */
  corteBajo: number
  corteAlto: number
  /**
   * En sodio, salinidad, aluminio y acidez estar por debajo del corte no es una
   * carencia sino lo deseable, así que no se reporta como limitante.
   */
  bajoEsLimitante?: boolean
}

/**
 * Rangos de referencia generales para suelos colombianos (IGAC/ICA). Son un
 * marco de lectura para ubicar un valor, no umbrales por cultivo: un pH 5.5 es
 * limitante para arroz y normal para café. Por eso la IA recibe el número y la
 * clasificación, y ajusta la lectura al cultivo.
 */
export const PARAMETROS: Parametro[] = [
  { columna: "ph_agua_suelo", etiqueta: "pH (agua)", unidad: "", corteBajo: 5.5, corteAlto: 7.3 },
  { columna: "materia_organica", etiqueta: "Materia orgánica", unidad: "%", corteBajo: 3, corteAlto: 5 },
  { columna: "fosforo_bray_ii", etiqueta: "Fósforo (Bray II)", unidad: "ppm", corteBajo: 15, corteAlto: 30 },
  { columna: "azufre_fosfato_monocalcico", etiqueta: "Azufre", unidad: "ppm", corteBajo: 10, corteAlto: 20 },
  { columna: "potasio_intercambiable", etiqueta: "Potasio", unidad: "cmol/kg", corteBajo: 0.2, corteAlto: 0.4 },
  { columna: "calcio_intercambiable", etiqueta: "Calcio", unidad: "cmol/kg", corteBajo: 3, corteAlto: 6 },
  { columna: "magnesio_intercambiable", etiqueta: "Magnesio", unidad: "cmol/kg", corteBajo: 1.5, corteAlto: 2.5 },
  { columna: "sodio_intercambiable", etiqueta: "Sodio", unidad: "cmol/kg", corteBajo: 0.2, corteAlto: 1, bajoEsLimitante: false },
  { columna: "capacidad_de_intercambio_cationico", etiqueta: "CIC", unidad: "cmol/kg", corteBajo: 10, corteAlto: 20 },
  { columna: "conductividad_electrica", etiqueta: "Conductividad eléctrica", unidad: "dS/m", corteBajo: 0.2, corteAlto: 2, bajoEsLimitante: false },
  { columna: "aluminio_intercambiable", etiqueta: "Aluminio intercambiable", unidad: "cmol/kg", corteBajo: 0.3, corteAlto: 1, bajoEsLimitante: false },
  { columna: "acidez_kcl", etiqueta: "Acidez intercambiable", unidad: "cmol/kg", corteBajo: 0.5, corteAlto: 1.5, bajoEsLimitante: false },
  { columna: "boro_disponible", etiqueta: "Boro", unidad: "ppm", corteBajo: 0.2, corteAlto: 0.5 },
  { columna: "zinc_disponible_olsen", etiqueta: "Zinc", unidad: "ppm", corteBajo: 1.5, corteAlto: 3 },
  { columna: "cobre_disponible", etiqueta: "Cobre", unidad: "ppm", corteBajo: 1, corteAlto: 3 },
  { columna: "manganeso_disponible_olsen", etiqueta: "Manganeso", unidad: "ppm", corteBajo: 5, corteAlto: 20 },
  { columna: "hierro_disponible_olsen", etiqueta: "Hierro", unidad: "ppm", corteBajo: 25, corteAlto: 100 },
]

export interface ParametroSuelo {
  parametro: string
  unidad: string
  /** Mediana: los análisis de suelo tienen colas largas, el promedio engaña. */
  mediana: number
  promedio: number
  p25: number
  p75: number
  muestras: number
  clasificacion: Clasificacion
  /** Rango de referencia usado para clasificar, para que la IA pueda citarlo. */
  referencia: string
  /** Si esta desviación merece atención agronómica (ver `bajoEsLimitante`). */
  esLimitante: boolean
}

export interface RelacionCationica {
  relacion: string
  valor: number
  rangoIdeal: string
  dentroDelRango: boolean
}

export interface ResumenSuelos {
  /** Hasta qué nivel se pudo bajar con muestras suficientes. */
  nivel: "municipio-cultivo" | "municipio" | "departamento-cultivo" | "departamento" | "cultivo-nacional" | "nacional"
  ambito: string
  muestrasTotales: number
  /** Cuando la consulta pedida tenía pocas muestras y hubo que ampliar el ámbito. */
  advertencia: string | null
  parametros: ParametroSuelo[]
  relacionesCationicas: RelacionCationica[]
  /** Lo que un analista miraría primero: qué sale del rango y hacia dónde. */
  limitantes: string[]
  fuente: string
}

/** Debajo de esto el promedio de la zona no es representativo y se amplía el ámbito. */
const MUESTRAS_MINIMAS = 15
const LIMITE_FILAS = 1000

/**
 * El dataset guarda los valores como texto: además del número pueden venir
 * `ND` (no determinado) o acotados por el límite de detección (`<0.05`,
 * `>10`). Los acotados se toman por su límite —es el mejor estimador
 * disponible— y los `ND` se descartan.
 */
export function parseValor(crudo: string | undefined): number | null {
  if (!crudo) return null
  const limpio = crudo.trim()
  if (!limpio || /^ND$/i.test(limpio) || /no\s*(indica|determ)/i.test(limpio)) return null
  const n = Number(limpio.replace(/^[<>]=?/, "").replace(",", "."))
  return Number.isFinite(n) ? n : null
}

export function percentil(ordenados: number[], p: number): number {
  if (!ordenados.length) return 0
  const i = (ordenados.length - 1) * p
  const bajo = Math.floor(i)
  const alto = Math.ceil(i)
  const v = bajo === alto ? ordenados[bajo] : ordenados[bajo] + (ordenados[alto] - ordenados[bajo]) * (i - bajo)
  return Number(v.toFixed(3))
}

export function clasificar(valor: number, p: Parametro): Clasificacion {
  if (valor < p.corteBajo) return "bajo"
  if (valor > p.corteAlto) return "alto"
  return "medio"
}

function resumirParametro(valores: number[], p: Parametro): ParametroSuelo | null {
  if (valores.length < 3) return null
  const ordenados = [...valores].sort((a, b) => a - b)
  const mediana = percentil(ordenados, 0.5)
  const clasificacion = clasificar(mediana, p)
  return {
    parametro: p.etiqueta,
    unidad: p.unidad,
    mediana,
    promedio: Number((ordenados.reduce((a, b) => a + b, 0) / ordenados.length).toFixed(3)),
    p25: percentil(ordenados, 0.25),
    p75: percentil(ordenados, 0.75),
    muestras: ordenados.length,
    clasificacion,
    referencia: `bajo <${p.corteBajo}${p.unidad ? " " + p.unidad : ""} · adecuado ${p.corteBajo}–${p.corteAlto} · alto >${p.corteAlto}`,
    esLimitante: clasificacion === "alto" || (clasificacion === "bajo" && p.bajoEsLimitante !== false),
  }
}

/**
 * Las relaciones entre cationes explican deficiencias que los valores
 * absolutos esconden: un suelo con potasio "adecuado" puede seguir sin
 * absorberlo si el calcio y el magnesio lo desplazan del complejo de cambio.
 */
function calcularRelaciones(por: Map<string, number[]>): RelacionCationica[] {
  const med = (col: string) => {
    const v = por.get(col)
    if (!v || v.length < 3) return null
    return percentil([...v].sort((a, b) => a - b), 0.5)
  }
  const ca = med("calcio_intercambiable")
  const mg = med("magnesio_intercambiable")
  const k = med("potasio_intercambiable")

  const salida: RelacionCationica[] = []
  const agregar = (relacion: string, valor: number | null, min: number, max: number) => {
    if (valor === null || !Number.isFinite(valor)) return
    const v = Number(valor.toFixed(2))
    salida.push({ relacion, valor: v, rangoIdeal: `${min}–${max}`, dentroDelRango: v >= min && v <= max })
  }

  agregar("Ca/Mg", ca !== null && mg ? ca / mg : null, 2, 4)
  agregar("Mg/K", mg !== null && k ? mg / k : null, 2, 6)
  agregar("Ca/K", ca !== null && k ? ca / k : null, 5, 25)
  agregar("(Ca+Mg)/K", ca !== null && mg !== null && k ? (ca + mg) / k : null, 10, 40)
  return salida
}

function describirLimitantes(parametros: ParametroSuelo[], relaciones: RelacionCationica[]): string[] {
  const fuera = parametros
    .filter((p) => p.esLimitante)
    .map((p) => `${p.parametro} ${p.clasificacion} (mediana ${p.mediana}${p.unidad ? " " + p.unidad : ""}; ${p.referencia})`)

  const desbalance = relaciones
    .filter((r) => !r.dentroDelRango)
    .map((r) => `Relación ${r.relacion} desbalanceada: ${r.valor} (ideal ${r.rangoIdeal})`)

  return [...fuera, ...desbalance]
}

interface Ambito {
  nivel: ResumenSuelos["nivel"]
  condiciones: string[]
  etiqueta: string
}

/** Del ámbito más específico al más general; se usa el primero con muestras suficientes. */
function construirAmbitos(municipio?: string, departamento?: string, cultivo?: string): Ambito[] {
  const cMunicipio = municipio ? `upper(municipio) like ${comillas(patronLike(municipio))}` : null
  const cDepartamento = departamento ? `upper(departamento) like ${comillas(patronLike(departamento))}` : null
  const cCultivo = cultivo ? `upper(cultivo) like ${comillas(patronLike(cultivo))}` : null

  const ambitos: Ambito[] = []
  const push = (nivel: ResumenSuelos["nivel"], partes: Array<string | null>, etiqueta: string) => {
    const condiciones = partes.filter((p): p is string => Boolean(p))
    if (condiciones.length !== partes.length) return
    ambitos.push({ nivel, condiciones, etiqueta })
  }

  push("municipio-cultivo", [cMunicipio, cCultivo], `${cultivo} en ${municipio}`)
  push("municipio", [cMunicipio], `todos los cultivos en ${municipio}`)
  push("departamento-cultivo", [cDepartamento, cCultivo], `${cultivo} en ${departamento}`)
  push("departamento", [cDepartamento], `todos los cultivos en ${departamento}`)
  push("cultivo-nacional", [cCultivo], `${cultivo} a nivel nacional`)
  ambitos.push({ nivel: "nacional", condiciones: [], etiqueta: "nacional, todos los cultivos" })
  return ambitos
}

async function traerFilas(condiciones: string[]): Promise<Array<Record<string, string>>> {
  const columnas = PARAMETROS.map((p) => p.columna).join(",")
  const where = condiciones.length ? `&$where=${encodeURIComponent(condiciones.join(" AND "))}` : ""
  const url = `${BASE}/${ANALISIS_SUELOS}.json?$select=${encodeURIComponent(columnas)}${where}&$limit=${LIMITE_FILAS}${token()}`
  return fetchJson<Array<Record<string, string>>>(url)
}

/**
 * Línea base de fertilidad del suelo para una zona y cultivo. Baja al ámbito
 * más específico que tenga muestras suficientes y avisa cuando tuvo que
 * ampliarlo, para que nadie lea como "dato de su municipio" un promedio
 * departamental.
 */
export async function consultarAnalisisSuelos(opciones: {
  municipio?: string
  departamento?: string
  cultivo?: string
}): Promise<ResumenSuelos> {
  const { municipio, departamento, cultivo } = opciones
  const clave = normalizar([municipio, departamento, cultivo].filter(Boolean).join("|")) || "nacional"

  const { datos } = await conCache<ResumenSuelos>("suelos", clave, 24 * 90, async () => {
    const ambitos = construirAmbitos(municipio, departamento, cultivo)

    let elegido: { ambito: Ambito; filas: Array<Record<string, string>> } | null = null
    for (const ambito of ambitos) {
      const filas = await traerFilas(ambito.condiciones)
      if (filas.length >= MUESTRAS_MINIMAS || ambito.nivel === "nacional") {
        elegido = { ambito, filas }
        break
      }
      // Guarda el más específico con algo de dato por si ninguno llega al mínimo.
      if (filas.length > 0 && !elegido) elegido = { ambito, filas }
    }

    const { ambito, filas } = elegido!
    const por = new Map<string, number[]>()
    for (const fila of filas) {
      for (const p of PARAMETROS) {
        const v = parseValor(fila[p.columna])
        if (v === null) continue
        const acc = por.get(p.columna) ?? []
        acc.push(v)
        por.set(p.columna, acc)
      }
    }

    const parametros = PARAMETROS.map((p) => resumirParametro(por.get(p.columna) ?? [], p)).filter(
      (p): p is ParametroSuelo => p !== null,
    )
    const relacionesCationicas = calcularRelaciones(por)

    const pidioMunicipio = Boolean(municipio)
    const seAmplio = ambitos[0].nivel !== ambito.nivel
    const advertencia = !filas.length
      ? "No hay muestras de análisis de suelo para este ámbito."
      : filas.length < MUESTRAS_MINIMAS
        ? `Solo ${filas.length} muestras: tómalo como indicio, no como línea base de la zona.`
        : seAmplio
          ? `No había muestras suficientes para ${pidioMunicipio ? "el municipio" : "lo pedido"}; estos valores son de ${ambito.etiqueta}.`
          : null

    return {
      nivel: ambito.nivel,
      ambito: ambito.etiqueta,
      muestrasTotales: filas.length,
      advertencia,
      parametros,
      relacionesCationicas,
      limitantes: describirLimitantes(parametros, relacionesCationicas),
      fuente: "Resultados de análisis de suelos en Colombia — ICA, datos.gov.co (ch4u-f3i5)",
    }
  })

  return datos
}
