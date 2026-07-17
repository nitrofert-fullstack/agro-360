"use client"

import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"
import { AppLayout } from "@/components/app-layout"

const AdminDashboard = dynamic(
  () => import("@/components/admin-dashboard").then((m) => m.AdminDashboard),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
  }
)

export default function EstadisticasPage() {
  return (
    <AppLayout>
      <AdminDashboard />
    </AppLayout>
  )
}
