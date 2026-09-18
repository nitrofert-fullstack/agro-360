"use client"

import { useEffect, useState } from "react"

/**
 * Chips compactos de fertilidad típica (ICA) — pH y parámetros clave.
 * Misma idea que en Nitria admin/agricultor.
 */

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
}

interface Props {
  municipio?: string | null
  departamento?: string | null
  cultivo?: string | null
  max?: number
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
  bajo: "border-red-500/25 bg-red-500/8 text-red-700 dark:text-red-400",
  medio: "border-emerald-500/25 bg-emerald-500/8 text-emerald-800 dark:text-emerald-400",
  alto: "border-amber-500/25 bg-amber-500/8 text-amber-800 dark:text-amber-400",
} as const

const CORTO: Record<string, string> = {
  "pH (agua)": "pH",
  "Materia orgánica": "M.O.",
  "Fósforo (Bray II)": "P",
  Potasio: "K",
  "Aluminio intercambiable": "Al",
  CIC: "CIC",
}

function elegir(params: ParametroSuelo[], max: number) {
  const map = new Map(params.map((p) => [p.parametro, p]))
  const out: ParametroSuelo[] = []
  for (const n of PRIORIDAD) {
    const p = map.get(n)
    if (p) out.push(p)
    if (out.length >= max) return out
  }
  for (const p of params) {
    if (out.includes(p) || !p.esLimitante) continue
    out.push(p)
    if (out.length >= max) break
  }
  return out
}

export function MetricasZonaStrip({ municipio, departamento, cultivo, max = 5 }: Props) {
  const [suelos, setSuelos] = useState<ResumenSuelos | null>(null)
  const [estado, setEstado] = useState<"idle" | "cargando" | "ok" | "vacio" | "error">(
    municipio || departamento ? "cargando" : "idle",
  )

  useEffect(() => {
    if (!municipio && !departamento) {
      setEstado("idle")
      setSuelos(null)
      return
    }
    const control = new AbortController()
    const params = new URLSearchParams()
    if (municipio) params.set("municipio", municipio)
    if (departamento) params.set("departamento", departamento)
    if (cultivo) params.set("cultivo", cultivo)
    setEstado("cargando")
    fetch(`/api/suelos?${params}`, { signal: control.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: ResumenSuelos) => {
        if (control.signal.aborted) return
        if (!data?.parametros?.length) {
          setSuelos(null)
          setEstado("vacio")
          return
        }
        setSuelos(data)
        setEstado("ok")
      })
      .catch(() => {
        if (!control.signal.aborted) {
          setSuelos(null)
          setEstado("error")
        }
      })
    return () => control.abort()
  }, [municipio, departamento, cultivo])

  if (estado === "idle") return null
  if (estado === "cargando") {
    return (
      <div className="flex flex-wrap gap-1.5" aria-busy="true">
        {Array.from({ length: Math.min(max, 4) }).map((_, i) => (
          <span key={i} className="h-8 w-[4.5rem] animate-pulse rounded-md border border-border/60 bg-muted/50" />
        ))}
      </div>
    )
  }
  if (estado !== "ok" || !suelos) {
    return (
      <p className="text-[11px] text-muted-foreground">
        {estado === "error" ? "Sin datos de suelo por ahora." : "Pocas muestras ICA en esta zona."}
      </p>
    )
  }

  const visibles = elegir(suelos.parametros, max)
  return (
    <div className="flex min-w-0 flex-col gap-1 sm:items-end">
      <ul className="flex flex-wrap gap-1.5 sm:justify-end" aria-label={`Suelo típico de ${suelos.ambito}`}>
        {visibles.map((p) => (
          <li key={p.parametro}>
            <span
              title={`${p.parametro}: ${p.mediana}${p.unidad ? ` ${p.unidad}` : ""}`}
              className={`inline-flex items-baseline gap-1 rounded-md border px-2 py-1.5 shadow-sm ${TONO[p.clasificacion]} ${
                p.esLimitante ? "ring-1 ring-inset ring-current/25" : ""
              }`}
            >
              <span className="text-[10px] font-medium uppercase tracking-wide opacity-80">
                {CORTO[p.parametro] ?? p.parametro}
              </span>
              <span className="font-mono text-sm tabular-nums leading-none">{p.mediana}</span>
              {p.unidad ? <span className="text-[9px] opacity-70">{p.unidad}</span> : null}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-muted-foreground sm:text-right">
        Zona {suelos.ambito}
        {suelos.muestrasTotales > 0 ? ` · ${suelos.muestrasTotales} muestras ICA` : ""}
      </p>
    </div>
  )
}
