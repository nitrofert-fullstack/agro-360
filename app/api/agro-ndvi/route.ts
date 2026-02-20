import { NextRequest, NextResponse } from 'next/server'

const AGRO_BASE = 'https://api.agromonitoring.com/agro/1.0'
const API_KEY   = process.env.AGRO_API_KEY!

// GET /api/agro-ndvi?polyid=XXX&start=1700000000&end=1710000000
// start y end son unix timestamps en segundos
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const polyid = searchParams.get('polyid')
  const start  = searchParams.get('start')
  const end    = searchParams.get('end')

  if (!polyid || !start || !end) {
    return NextResponse.json(
      { error: 'Faltan parámetros: polyid, start, end' },
      { status: 400 }
    )
  }

  const url = `${AGRO_BASE}/ndvi/history?polyid=${polyid}&start=${start}&end=${end}&appid=${API_KEY}`
  const res  = await fetch(url)
  const data = await res.json()

  return NextResponse.json(data, { status: res.status })
}
