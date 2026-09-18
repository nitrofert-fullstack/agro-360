import { NextRequest, NextResponse } from "next/server"
import crypto from "node:crypto"

/**
 * NDVI puntual: intenta MODIS ORNL (público) y, si está caído, Sentinel-2 vía
 * Google Earth Engine cuando GEE_SERVICE_ACCOUNT_B64 está configurado.
 *
 * ORNL TESViS ha respondido 500 de forma prolongada (incluso en ejemplos de
 * su documentación); el fallback evita que el panel del agricultor quede vacío.
 */

function getModisDateRange(periodsBack: number): { startDate: string; endDate: string } {
  const date = new Date()
  date.setDate(date.getDate() - 70 - periodsBack * 16)
  const year = date.getFullYear()
  const yearStart = new Date(year, 0, 1)
  const doy = Math.floor((date.getTime() - yearStart.getTime()) / 86400000) + 1
  const periodStart = Math.floor((doy - 1) / 16) * 16 + 1
  const periodEnd = Math.min(periodStart + 15, 365)
  const fmt = (d: number) => `A${year}${String(d).padStart(3, "0")}`
  return { startDate: fmt(periodStart), endDate: fmt(periodEnd) }
}

function interpretNDVI(ndvi: number): { interpretacion: string; color: string } {
  if (ndvi < 0) return { interpretacion: "Agua / Suelo desnudo", color: "#ef4444" }
  if (ndvi < 0.2) return { interpretacion: "Vegetación muy escasa", color: "#f97316" }
  if (ndvi < 0.4) return { interpretacion: "Vegetación moderada", color: "#eab308" }
  if (ndvi < 0.6) return { interpretacion: "Vegetación saludable", color: "#84cc16" }
  return { interpretacion: "Vegetación densa / muy saludable", color: "#22c55e" }
}

type CuentaServicio = { client_email: string; private_key: string; project_id?: string }

function leerGee(): CuentaServicio | null {
  const b64 = process.env.GEE_SERVICE_ACCOUNT_B64
  if (!b64) return null
  try {
    const json = JSON.parse(Buffer.from(b64, "base64").toString("utf8")) as CuentaServicio
    if (!json.client_email || !json.private_key) return null
    return json
  } catch {
    return null
  }
}

async function tokenGee(cred: CuentaServicio): Promise<string | null> {
  const TOKEN_URL = "https://oauth2.googleapis.com/token"
  const b64url = (o: unknown) =>
    Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url")
  const ahora = Math.floor(Date.now() / 1000)
  const sinFirmar = `${b64url({ alg: "RS256", typ: "JWT" })}.${b64url({
    iss: cred.client_email,
    scope: "https://www.googleapis.com/auth/earthengine",
    aud: TOKEN_URL,
    exp: ahora + 3600,
    iat: ahora,
  })}`
  const firma = crypto.createSign("RSA-SHA256").update(sinFirmar).sign(cred.private_key).toString("base64url")
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: `${sinFirmar}.${firma}`,
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    const d = (await res.json()) as { access_token?: string }
    return d.access_token ?? null
  } catch {
    return null
  }
}

/** Sample NDVI Sentinel-2 en un buffer pequeño alrededor del punto. */
async function ndviDesdeGee(
  lat: number,
  lng: number,
): Promise<{ ndvi: number; fecha: string; interpretacion: string; color: string; fuente: string } | null> {
  const cred = leerGee()
  if (!cred) return null
  const token = await tokenGee(cred)
  if (!token) return null

  const project = process.env.GEE_PROJECT_ID || cred.project_id || "registro-soil"
  const d = 0.00012
  const coords = [
    [lng - d, lat - d],
    [lng + d, lat - d],
    [lng + d, lat + d],
    [lng - d, lat + d],
    [lng - d, lat - d],
  ]
  const geometria = {
    functionInvocationValue: {
      functionName: "GeometryConstructors.Polygon",
      arguments: {
        coordinates: {
          constantValue: [coords],
        },
      },
    },
  }

  const desde = new Date(Date.now() - 150 * 86400_000).toISOString().slice(0, 10)
  const hasta = new Date(Date.now() + 86400_000).toISOString().slice(0, 10)

  // Expresión EE: mediana NDVI (B8-B4)/(B8+B4) de la escena S2 más reciente
  // con <45% nubes que intersecta el punto.
  const expression = {
    values: {
      geom: geometria,
      col: {
        functionInvocationValue: {
          functionName: "Collection.filter",
          arguments: {
            collection: {
              functionInvocationValue: {
                functionName: "Collection.filter",
                arguments: {
                  collection: {
                    functionInvocationValue: {
                      functionName: "Collection.filter",
                      arguments: {
                        collection: {
                          functionInvocationValue: {
                            functionName: "ImageCollection.load",
                            arguments: { id: { constantValue: "COPERNICUS/S2_SR_HARMONIZED" } },
                          },
                        },
                        filter: {
                          functionInvocationValue: {
                            functionName: "Filter.lessThan",
                            arguments: {
                              leftField: { constantValue: "CLOUDY_PIXEL_PERCENTAGE" },
                              rightValue: { constantValue: 45 },
                            },
                          },
                        },
                      },
                    },
                  },
                  filter: {
                    functionInvocationValue: {
                      functionName: "Filter.dateRangeContains",
                      arguments: {
                        leftValue: {
                          functionInvocationValue: {
                            functionName: "DateRange",
                            arguments: {
                              start: { constantValue: desde },
                              end: { constantValue: hasta },
                            },
                          },
                        },
                        rightField: { constantValue: "system:time_start" },
                      },
                    },
                  },
                },
              },
            },
            filter: {
              functionInvocationValue: {
                functionName: "Filter.intersects",
                arguments: {
                  leftField: { constantValue: ".geo" },
                  rightValue: { valueReference: "geom" },
                },
              },
            },
          },
        },
      },
      img: {
        functionInvocationValue: {
          functionName: "Collection.first",
          arguments: {
            collection: {
              functionInvocationValue: {
                functionName: "Collection.limit",
                arguments: {
                  collection: { valueReference: "col" },
                  limit: { constantValue: 1 },
                  key: { constantValue: "system:time_start" },
                  ascending: { constantValue: false },
                },
              },
            },
          },
        },
      },
      ndvi: {
        functionInvocationValue: {
          functionName: "Image.normalizedDifference",
          arguments: {
            input: { valueReference: "img" },
            bandNames: { constantValue: ["B8", "B4"] },
          },
        },
      },
      mean: {
        functionInvocationValue: {
          functionName: "Image.reduceRegion",
          arguments: {
            image: { valueReference: "ndvi" },
            reducer: {
              functionInvocationValue: { functionName: "Reducer.mean", arguments: {} },
            },
            geometry: { valueReference: "geom" },
            scale: { constantValue: 10 },
            maxPixels: { constantValue: 1e7 },
            bestEffort: { constantValue: true },
          },
        },
      },
      t0: {
        functionInvocationValue: {
          functionName: "Element.get",
          arguments: {
            object: { valueReference: "img" },
            property: { constantValue: "system:time_start" },
          },
        },
      },
    },
    result: "mean",
  }

  try {
    const res = await fetch(`https://earthengine.googleapis.com/v1/projects/${project}/value:compute`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ expression }),
      signal: AbortSignal.timeout(45000),
    })
    if (!res.ok) {
      console.error("[NDVI GEE]", res.status, (await res.text()).slice(0, 200))
      return null
    }
    const data = (await res.json()) as { result?: Record<string, number> }
    const raw = data.result?.nd ?? data.result?.["nd"] ?? Object.values(data.result ?? {})[0]
    if (typeof raw !== "number" || !Number.isFinite(raw)) return null
    const ndvi = Math.round(raw * 1000) / 1000
    const { interpretacion, color } = interpretNDVI(ndvi)

    // Segunda llamada ligera para la fecha (opcional)
    let fecha = new Date().toISOString().slice(0, 10)
    try {
      const resFecha = await fetch(`https://earthengine.googleapis.com/v1/projects/${project}/value:compute`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          expression: { ...expression, result: "t0" },
        }),
        signal: AbortSignal.timeout(20000),
      })
      if (resFecha.ok) {
        const df = (await resFecha.json()) as { result?: number }
        if (typeof df.result === "number") fecha = new Date(df.result).toISOString().slice(0, 10)
      }
    } catch {
      /* keep default fecha */
    }

    return { ndvi, interpretacion, color, fecha, fuente: "sentinel2-gee" }
  } catch (err) {
    console.error("[NDVI GEE]", err)
    return null
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")

  if (!lat || !lng) {
    return NextResponse.json({ error: "Latitud y longitud requeridas" }, { status: 400 })
  }

  const latNum = parseFloat(lat)
  const lngNum = parseFloat(lng)
  if (isNaN(latNum) || isNaN(lngNum)) {
    return NextResponse.json({ error: "Coordenadas inválidas" }, { status: 400 })
  }
  if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
    return NextResponse.json({ error: "Coordenadas fuera de rango válido" }, { status: 400 })
  }

  let lastError = "Error al obtener NDVI"
  let ornlCaido = false

  for (let periodsBack = 0; periodsBack <= 5; periodsBack++) {
    const { startDate, endDate } = getModisDateRange(periodsBack)
    try {
      const url =
        `https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset` +
        `?latitude=${latNum}&longitude=${lngNum}` +
        `&startDate=${startDate}&endDate=${endDate}` +
        `&kmAboveBelow=0&kmLeftRight=0`

      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      })

      if (!res.ok) {
        lastError = `MODIS ${res.status}`
        if (res.status >= 500) ornlCaido = true
        continue
      }

      const data = await res.json()
      const subsets: Array<{ band?: string; data?: number[]; calendar_date?: string }> = data?.subset ?? []
      if (!subsets.length) {
        lastError = "Sin datos para esta ubicación y período"
        continue
      }

      const ndviSubset = subsets.find((s) => s.band?.toLowerCase().includes("ndvi")) ?? subsets[0]
      if (!ndviSubset?.data?.length) {
        lastError = "Sin datos NDVI disponibles"
        continue
      }

      const rawValue = ndviSubset.data.find((v) => v > -3000) ?? null
      if (rawValue === null) {
        lastError = "Sin píxeles válidos (cobertura de nubes)"
        continue
      }

      const ndvi = rawValue / 10000
      const fecha = ndviSubset.calendar_date ?? startDate
      const { interpretacion, color } = interpretNDVI(ndvi)

      return NextResponse.json({
        ndvi: Math.round(ndvi * 1000) / 1000,
        interpretacion,
        color,
        fecha,
        fuente: "modis-ornl",
      })
    } catch (err) {
      console.error("[NDVI MODIS]", err)
      lastError = "No se pudo obtener el dato satelital"
      ornlCaido = true
    }
  }

  const gee = await ndviDesdeGee(latNum, lngNum)
  if (gee) return NextResponse.json(gee)

  console.error("[NDVI]", lastError, { ornlCaido, gee: Boolean(leerGee()) })
  return NextResponse.json(
    {
      error: ornlCaido
        ? "Servicio MODIS (ORNL) no responde. Configura GEE_SERVICE_ACCOUNT_B64 como respaldo o reintenta más tarde."
        : lastError,
    },
    { status: 502 },
  )
}
