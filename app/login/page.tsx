// Alias de /auth/login — redirige para no romper enlaces externos
import { redirect } from "next/navigation"

export default function LoginPage() {
  redirect("/auth/login")
}
