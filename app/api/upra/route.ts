import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { consultarUpra } from "@/lib/datos-abiertos/upra"

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const tema = (searchParams.get("tema") || "").trim()
  const filtro = searchParams.get("filtro") ?? undefined

  if (!tema) {
    return NextResponse.json({ error: "Indica un tema UPRA." }, { status: 400 })
  }

  try {
    const resumen = await consultarUpra({ tema, filtro })
    return NextResponse.json(resumen, {
      headers: { "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400" },
    })
  } catch (err) {
    console.error("[UPRA]", err)
    return NextResponse.json({ error: "No se pudo consultar UPRA." }, { status: 502 })
  }
}
