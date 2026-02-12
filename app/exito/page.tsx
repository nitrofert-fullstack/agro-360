import { Suspense } from "react"
import ExitoClient from "./ExitoClient"

export default function Page() {
  return (
    <Suspense fallback={<div>Cargando…</div>}>
      <ExitoClient />
    </Suspense>
  )
}