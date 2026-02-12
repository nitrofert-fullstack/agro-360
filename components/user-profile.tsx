"use client"

import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { LogOut, User, Settings, FileText } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useState } from "react"

export function UserProfile() {
  const { user, profile, isAuthenticated, signOut, loading } = useAuth()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  if (loading) {
    return (
      <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
    )
  }

  if (!isAuthenticated) {
    return (
      <Button 
        asChild 
        variant="outline" 
        size="sm"
        className="gap-2"
      >
        <Link href="/auth/login">
          Iniciar sesión
        </Link>
      </Button>
    )
  }

  const initials = profile?.nombre_completo
    ? profile.nombre_completo
        .split(" ")
        .map(n => n[0])
        .join("")
        .toUpperCase()
    : user?.email?.[0].toUpperCase() || "U"

  const handleLogout = async () => {
    setIsLoggingOut(true)
    const { error } = await signOut()
    if (!error) {
      router.push("/auth/login")
    }
    setIsLoggingOut(false)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="gap-2 px-2"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`}
              alt={profile?.nombre_completo}
            />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-sm font-medium leading-none">
              {profile?.nombre_completo || user?.email?.split("@")[0]}
            </span>
            <span className="text-xs text-muted-foreground">
              {profile?.rol === "admin" ? "Administrador" : "Asesor"}
            </span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="px-2 py-1.5 text-sm">
          <p className="font-medium">{profile?.nombre_completo}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild>
          <Link href="/formulario" className="cursor-pointer gap-2">
            <FileText className="h-4 w-4" />
            Registrar formulario
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link href="/profile" className="cursor-pointer gap-2">
            <User className="h-4 w-4" />
            Mi perfil
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer gap-2">
            <Settings className="h-4 w-4" />
            Configuración
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="cursor-pointer gap-2 text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          {isLoggingOut ? "Cerrando..." : "Cerrar sesión"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
