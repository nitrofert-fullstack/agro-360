import { Suspense } from "react"
import InvitationClient from "./InvitationClient"

export default function Page() {
  return (
    <Suspense fallback={<div>Cargando…</div>}>
      <InvitationClient />
    </Suspense>
  )
}