"use client"

import Link from "next/link"
import { CheckCircle, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Registro exitoso</CardTitle>
          <CardDescription>
            Tu cuenta ha sido creada correctamente
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Mail className="h-5 w-5" />
              <span className="text-sm">Revisa tu correo electronico</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Te hemos enviado un enlace de confirmacion. 
              Haz clic en el para activar tu cuenta.
            </p>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-3">
          <Button asChild className="w-full">
            <Link href="/auth/login">Ir a iniciar sesion</Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            ¿No recibiste el correo? Revisa tu carpeta de spam.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
