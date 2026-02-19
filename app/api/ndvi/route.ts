import { NextRequest, NextResponse } from 'next/server'

/**
 * MODIS MOD13Q1: composites de 16 días comenzando en DOY 001, 017, 033, 049…
 * La API ORNL DAAC requiere fechas que coincidan con esos períodos exactos.
 * Se retroceden al menos 20 días para garantizar que los datos estén procesados.
 */
function getModisDateRange(): { startDate: string; endDate: string } {
  const date = new Date()
  date.setDate(date.getDate() - 70) // retroceder para asegurar disponibilidad

  const year = date.getFullYear()
  const yearStart = new Date(year, 0, 1)
  const doy = Math.floor((date.getTime() - yearStart.getTime()) / 86400000) + 1

  // Alinear al inicio del período de 16 días (1, 17, 33, 49 …)
  const periodStart = Math.floor((doy - 1) / 16) * 16 + 1
  const periodEnd = Math.min(periodStart + 15, 365)

  const fmt = (d: number) => `A${year}${String(d).padStart(3, '0')}`
  return { startDate: fmt(periodStart), endDate: fmt(periodEnd) }
}

function interpretNDVI(ndvi: number): { interpretacion: string; color: string } {
  if (ndvi < 0)   return { interpretacion: 'Agua / Suelo desnudo',           color: '#ef4444' }
  if (ndvi < 0.2) return { interpretacion: 'Vegetación muy escasa',           color: '#f97316' }
  if (ndvi < 0.4) return { interpretacion: 'Vegetación moderada',             color: '#eab308' }
  if (ndvi < 0.6) return { interpretacion: 'Vegetación saludable',            color: '#84cc16' }
  return             { interpretacion: 'Vegetación densa / muy saludable',    color: '#22c55e' }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Latitud y longitud requeridas' }, { status: 400 })
  }

  const latNum = parseFloat(lat)
  const lngNum = parseFloat(lng)
  if (isNaN(latNum) || isNaN(lngNum)) {
    return NextResponse.json({ error: 'Coordenadas inválidas' }, { status: 400 })
  }

  const { startDate, endDate } = getModisDateRange()

  try {
    const url =
      `https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset` +
      `?latitude=${latNum}&longitude=${lngNum}` +
      `&startDate=${startDate}&endDate=${endDate}` +
      `&kmAboveBelow=0&kmLeftRight=0`

    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`MODIS ${res.status}: ${body.slice(0, 120)}`)
    }

    const data = await res.json()
    const subsets: any[] = data?.subset ?? []

    if (!subsets.length) {
      throw new Error('Sin datos para esta ubicación y período')
    }

    // Buscar el subset de NDVI (banda "250m 16 days NDVI")
    const ndviSubset =
      subsets.find((s: any) => s.band?.toLowerCase().includes('ndvi')) ?? subsets[0]

    if (!ndviSubset?.data?.length) {
      throw new Error('Sin datos NDVI disponibles')
    }

    // Fill value MODIS = -3000 → ignorar
    const rawValue = ndviSubset.data.find((v: number) => v > -3000) ?? null
    if (rawValue === null) {
      throw new Error('Sin píxeles válidos (cobertura de nubes)')
    }

    const ndvi = rawValue / 10000 // escala MODIS
    const fecha = ndviSubset.calendar_date ?? startDate
    const { interpretacion, color } = interpretNDVI(ndvi)

    return NextResponse.json({
      ndvi: Math.round(ndvi * 1000) / 1000,
      interpretacion,
      color,
      fecha,
    })
  } catch (err) {
    console.error('[NDVI MODIS]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al obtener NDVI' },
      { status: 500 }
    )
  }
}
