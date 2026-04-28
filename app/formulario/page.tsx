import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { CharacterizationFormComplete } from "@/components/characterization-form-complete"

export default async function FormularioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("rol, numero_documento")
      .eq("id", user.id)
      .single()

    // Si es agricultor, verificamos si ya tiene un formulario activo
    if (profile?.rol === "agricultor") {
      // Buscar por número de documento (más confiable que el correo).
      // Fallback a correo si el perfil aún no tiene número de documento guardado.
      const numDoc = (profile as { numero_documento?: string | null }).numero_documento
      let benefQuery = supabase.from("beneficiarios").select("id")
      benefQuery = numDoc
        ? benefQuery.eq("numero_documento", numDoc)
        : benefQuery.eq("correo", user.email)

      const { data: beneficiarios } = await benefQuery

      if (beneficiarios && beneficiarios.length > 0) {
        const benefIds = beneficiarios.map((b: { id: string }) => b.id)
        const { data: caracterizacionesActivas } = await supabase
          .from("caracterizaciones")
          .select("id")
          .in("id_beneficiario", benefIds)
          .not("estado", "in", '("RECHAZADO","CANCELADO")')

        if (caracterizacionesActivas && caracterizacionesActivas.length > 0) {
          // Ya tiene un formulario activo, se redirige al dashboard
          redirect("/dashboard")
        }
      }
    }
  }

  return <CharacterizationFormComplete />
}
