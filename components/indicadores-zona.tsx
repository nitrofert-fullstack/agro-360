"use client"

import { useEffect, useMemo, useState } from "react"
import { Leaf, FlaskConical, Loader2 } from "lucide-react"

interface ParametroSuelo {
  parametro: string
  unidad: string
  mediana: number
  clasificacion: "bajo" | "medio" | "alto"
  esLimitante: boolean
}

interface ResumenSuelos {
  ambito: string
  muestrasTotales: number
  advertencia: string | null
  parametros: ParametroSuelo[]
  limitantes: string[]
  fuente: string
}

interface CultivoRow {
  cultivo: string
  rendimientoTonHa: number
  ventajaPct: number | null
}

interface ResumenCultivos {
  ambito: string
  advertencia: string | null
  cultivos: CultivoRow[]
  fuente: string
}

interface Props {
  municipio?: string | null
  departamento?: string | null
  cultivo?: string | null
}

const PRIORIDAD = [
  "pH (agua)",
  "Materia orgánica",
  "Fósforo (Bray II)",
  "Potasio",
  "Aluminio intercambiable",
  "CIC",
]

const TONO = {
  bajo: "text-red-600 dark:text-red-400",
  medio: "text-emerald-600 dark:text-emerald-400",
  alto: "text-amber-600 dark:text-amber-400",
} as const

const ETIQUETA = { bajo: "Bajo", medio: "OK", alto: "Alto" } as const

function clave(params: ParametroSuelo[], max = 6) {
  const map = new Map(params.map((p) => [p.parametro, p]))
  const out: ParametroSuelo[] = []
  for (const n of PRIORIDAD) {
    const p = map.get(n)
    if (p) out.push(p)
    if (out.length >= max) break
  }
  return out
}

/**
 * Fertilidad típica ICA + top cultivos EVA para la zona del predio.
 */
export function IndicadoresZona({ municipio, departamento, cultivo }: Props) {
  const [suelos, setSuelos] = useState<ResumenSuelos | null>(null)
  const [cultivos, setCultivos] = useState<ResumenCultivos | null>(null)
  const [cargando, setCargando] = useState(Boolean(municipio || departamento))

  useEffect(() => {
    if (!municipio && !departamento) return
    const control = new AbortController()
    const params = new URLSearchParams()
    if (municipio) params.set("municipio", municipio)
    if (departamento) params.set("departamento", departamento)
    const paramsSuelo = new URLSearchParams(params)
    if (cultivo) paramsSuelo.set("cultivo", cultivo)

    setCargando(true)
    Promise.allSettled([
      fetch(`/api/suelos?${paramsSuelo}`, { signal: control.signal }).then((r) =>
        r.ok ? r.json() : Promise.reject(),
      ),
      fetch(`/api/cultivos?${params}`, { signal: control.signal }).then((r) =>
        r.ok ? r.json() : Promise.reject(),
      ),
    ]).then(([s, c]) => {
      if (control.signal.aborted) return
      if (s.status === "fulfilled") setSuelos(s.value)
      if (c.status === "fulfilled") setCultivos(c.value)
      setCargando(false)
    })
    return () => control.abort()
  }, [municipio, departamento, cultivo])

  const visibles = useMemo(
    () => (suelos ? clave(suelos.parametros, 6) : []),
    [suelos],
  )

  if (!municipio && !departamento) return null

  if (cargando) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 p-3 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Consultando datos abiertos de la zona…
      </div>
    )
  }

  if (!suelos && !cultivos) return null

  return (
    <div className="space-y-3">
      {suelos && visibles.length > 0 && (
        <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
          <div className="mb-2 flex items-center gap-2">
            <FlaskConical className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-xs font-semibold">Suelo típico · {suelos.ambito}</span>
            <span className="ml-auto text-[10px] text-muted-foreground">
              {suelos.muestrasTotales} muestras ICA
            </span>
          </div>
          {suelos.advertencia && (
            <p className="mb-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-800 dark:text-amber-300">
              {suelos.advertencia}
            </p>
          )}
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3">
            {visibles.map((p) => (
              <div key={p.parametro}>
                <dt className="truncate text-[11px] text-muted-foreground">{p.parametro}</dt>
                <dd className="flex items-baseline gap-1">
                  <span className="font-mono text-sm tabular-nums">{p.mediana}</span>
                  {p.unidad ? (
                    <span className="text-[10px] text-muted-foreground">{p.unidad}</span>
                  ) : null}
                  <span className={`ml-auto text-[10px] font-medium ${TONO[p.clasificacion]}`}>
                    {ETIQUETA[p.clasificacion]}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
          {suelos.limitantes?.length > 0 && (
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
              Limitantes: {suelos.limitantes.slice(0, 3).join(" · ")}
            </p>
          )}
        </div>
      )}

      {cultivos && cultivos.cultivos?.length > 0 && (
        <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Leaf className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-xs font-semibold">Cultivos del municipio</span>
          </div>
          <ol className="space-y-1">
            {cultivos.cultivos.slice(0, 5).map((c, i) => (
              <li key={c.cultivo} className="flex items-baseline gap-2 text-xs">
                <span className="w-3 font-mono text-[10px] text-muted-foreground">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{c.cultivo}</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {c.rendimientoTonHa > 0 ? `${c.rendimientoTonHa} t/ha` : "—"}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
