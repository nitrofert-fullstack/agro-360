import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { consultarAnalisisSuelos } from "@/lib/datos-abiertos/suelos"

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const municipio = searchParams.get("municipio") ?? undefined
  const departamento = searchParams.get("departamento") ?? undefined
  const cultivo = searchParams.get("cultivo") ?? undefined

  if (!municipio && !departamento && !cultivo) {
    return NextResponse.json(
      { error: "Indica al menos municipio, departamento o cultivo." },
      { status: 400 },
    )
  }

  try {
    const resumen = await consultarAnalisisSuelos({ municipio, departamento, cultivo })
    return NextResponse.json(resumen, {
      headers: { "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400" },
    })
  } catch (err) {
    console.error("[Suelos]", err)
    return NextResponse.json({ error: "No se pudo consultar análisis ICA." }, { status: 502 })
  }
}
