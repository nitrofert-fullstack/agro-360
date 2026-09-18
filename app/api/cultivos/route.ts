import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { consultarTopCultivos } from "@/lib/datos-abiertos/cultivos"

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const municipio = searchParams.get("municipio") ?? undefined
  const departamento = searchParams.get("departamento") ?? undefined

  if (!municipio && !departamento) {
    return NextResponse.json(
      { error: "Indica al menos municipio o departamento." },
      { status: 400 },
    )
  }

  try {
    const resumen = await consultarTopCultivos({ municipio, departamento })
    return NextResponse.json(resumen, {
      headers: { "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400" },
    })
  } catch (err) {
    console.error("[Cultivos]", err)
    return NextResponse.json({ error: "No se pudo consultar EVA." }, { status: 502 })
  }
}
