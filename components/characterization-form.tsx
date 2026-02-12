"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LocationPicker } from "./location-picker"
import { saveCaracterizacion, type CaracterizacionLocal } from "@/lib/db/indexed-db"
import { 
  User, 
  MapPin, 
  Mountain, 
  Sprout, 
  Wallet, 
  FileCheck,
  ChevronLeft,
  ChevronRight,
  Send,
  Loader2,
  Home,
  Cloud,
  WifiOff
} from "lucide-react"
import { ThemeToggle } from "./theme-toggle"
import { ConnectionStatus } from "./connection-status"
import { SyncButton } from "./sync-button"
import { useAuth } from "@/hooks/use-auth"
import Link from "next/link"

type FormData = Omit<CaracterizacionLocal, 'id' | 'radicadoLocal' | 'radicadoOficial' | 'estado' | 'fechaRegistro' | 'fechaSincronizacion' | 'fechaActualizacion' | 'intentosSincronizacion' | 'ultimoErrorSincronizacion' | 'asesorId' | 'asesorEmail'>

const initialFormData: FormData = {
  datosTecnico: {
    nombreTecnico: "",
    fecha: new Date().toISOString().split("T")[0],
    departamento: "Santander",
    municipio: "",
    corregimiento: "",
    vereda: "",
  },
  informacionFamiliar: {
    nombreProductor: "",
    tipoDocumento: "CC",
    numeroDocumento: "",
    genero: "Masculino",
    fechaNacimiento: "",
    estadoCivil: "",
    telefono: "",
    email: "",
    nivelEducativo: "",
    grupoEtnico: "",
    discapacidad: "",
    tipoDiscapacidad: "",
    perteneceAsociacion: "",
    nombreAsociacion: "",
    numeroPersonasHogar: 1,
    personasMayores60: 0,
    personasMenores18: 0,
  },
  datosPredio: {
    nombrePredio: "",
    tipoTenencia: "",
    areaTotal: 0,
    areaCultivada: 0,
    tipoUbicacion: "punto",
    latitud: 7.1254,
    longitud: -73.1198,
    altitud: 0,
    fuenteAgua: "",
    accesoVial: "",
    distanciaCabecera: 0,
  },
  descripcionFisica: {
    topografia: "",
    tipoSuelo: "",
    erosion: "",
    drenaje: "",
    coberturaVegetal: "",
  },
  areaProductiva: {
    cultivoPrincipal: "",
    areaCultivoPrincipal: 0,
    cultivosSecundarios: [],
    sistemasProduccion: [],
    tieneGanado: false,
    tipoGanado: "",
    cantidadGanado: 0,
  },
  infoFinanciera: {
    ingresosMensuales: "",
    fuentesIngreso: [],
    accesoCredito: false,
    entidadCredito: "",
    montoCredito: 0,
    recibeSubsidios: false,
    tipoSubsidios: [],
  },
  autorizacion: {
    autorizaTratamientoDatos: false,
    firmaDigital: "",
    fechaAutorizacion: "",
  },
  documentoProductor: "",
  nombreProductor: "",
}

const steps = [
  { id: 1, title: "Datos Tecnico", icon: User },
  { id: 2, title: "Informacion Familiar", icon: User },
  { id: 3, title: "Datos del Predio", icon: MapPin },
  { id: 4, title: "Descripcion Fisica", icon: Mountain },
  { id: 5, title: "Area Productiva", icon: Sprout },
  { id: 6, title: "Info. Financiera", icon: Wallet },
  { id: 7, title: "Autorizacion", icon: FileCheck },
]

const municipiosSantander = [
  "Bucaramanga", "Floridablanca", "Giron", "Piedecuesta", "Barrancabermeja",
  "San Gil", "Socorro", "Velez", "Barbosa", "Puente Nacional", "Charala",
  "Malaga", "Lebrija", "Rionegro", "Cimitarra", "Puerto Wilches", "Sabana de Torres",
  "San Vicente de Chucuri", "Zapatoca", "Oiba", "Guepsa", "Villanueva"
]

export function CharacterizationForm() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [savedRadicado, setSavedRadicado] = useState<string | null>(null)
  const [newCultivo, setNewCultivo] = useState({ nombre: "", area: 0, produccion: 0, destino: "" })
  const [newActividad, setNewActividad] = useState({ tipo: "", cantidad: 0, destino: "" })

  const updateFormData = <K extends keyof FormData>(
    section: K,
    field: keyof FormData[K],
    value: FormData[K][keyof FormData[K]]
  ) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }))
  }

  const toggleArrayItem = <K extends keyof FormData>(
    section: K,
    field: keyof FormData[K],
    item: string
  ) => {
    setFormData((prev) => {
      const currentArray = prev[section][field] as string[]
      const newArray = currentArray.includes(item)
        ? currentArray.filter((i) => i !== item)
        : [...currentArray, item]
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: newArray,
        },
      }
    })
  }

  const addCultivo = () => {
    if (!newCultivo.nombre) return
    setFormData((prev) => ({
      ...prev,
      areaProductiva: {
        ...prev.areaProductiva,
        cultivosPrincipales: [...prev.areaProductiva.cultivosPrincipales, newCultivo],
      },
    }))
    setNewCultivo({ nombre: "", area: 0, produccion: 0, destino: "" })
  }

  const removeCultivo = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      areaProductiva: {
        ...prev.areaProductiva,
        cultivosPrincipales: prev.areaProductiva.cultivosPrincipales.filter((_, i) => i !== index),
      },
    }))
  }

  const addActividad = () => {
    if (!newActividad.tipo) return
    setFormData((prev) => ({
      ...prev,
      areaProductiva: {
        ...prev.areaProductiva,
        actividadesPecuarias: [...prev.areaProductiva.actividadesPecuarias, newActividad],
      },
    }))
    setNewActividad({ tipo: "", cantidad: 0, destino: "" })
  }

  const removeActividad = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      areaProductiva: {
        ...prev.areaProductiva,
        actividadesPecuarias: prev.areaProductiva.actividadesPecuarias.filter((_, i) => i !== index),
      },
    }))
  }

  const handleSubmit = async () => {
    if (!formData.autorizacion.autorizaTratamientoDatos) {
      alert("Debe autorizar el tratamiento de datos para continuar")
      return
    }

    setIsSubmitting(true)
    try {
      // Prepare data for IndexedDB
      const dataToSave = {
        ...formData,
        documentoProductor: formData.informacionFamiliar.numeroDocumento,
        nombreProductor: formData.informacionFamiliar.nombreProductor,
        asesorId: user?.id,
        asesorEmail: user?.email,
        autorizacion: {
          ...formData.autorizacion,
          fechaAutorizacion: new Date().toISOString(),
        },
      }
      
      // Save to IndexedDB (works offline!)
      const saved = await saveCaracterizacion(dataToSave)
      setSavedRadicado(saved.radicadoLocal)
      
      // Navigate to success page with radicado
      router.push(`/exito?radicado=${saved.radicadoLocal}`)
    } catch (error) {
      console.error("Error saving:", error)
      alert("Error al guardar. Intente nuevamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Sprout className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground md:text-xl">AgroSantander360</h1>
              <p className="hidden text-sm text-muted-foreground sm:block">Caracterizacion Predial</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-foreground">Paso {currentStep} de {steps.length}</p>
              <p className="text-xs text-muted-foreground">{steps[currentStep - 1].title}</p>
            </div>
            {/* Mobile step indicator */}
            <div className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 sm:hidden">
              <span className="text-sm font-bold text-primary">{currentStep}</span>
              <span className="text-xs text-muted-foreground">/ {steps.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <ConnectionStatus showLabel={false} className="hidden sm:flex" />
              <SyncButton variant="compact" />
              <Button variant="outline" size="icon" asChild className="h-10 w-10 bg-transparent">
                <Link href="/">
                  <Home className="h-4 w-4" />
                </Link>
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Progress Steps - Horizontal scrollable on mobile */}
      <div className="border-b border-border bg-card/50">
        <div className="mx-auto max-w-7xl px-4 py-3 md:px-6">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:justify-center md:gap-2">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = step.id === currentStep
              const isCompleted = step.id < currentStep
              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex min-w-[60px] flex-shrink-0 flex-col items-center gap-1.5 rounded-lg p-2 transition-all md:min-w-[90px] md:p-3 ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : isCompleted
                        ? "text-primary/70 hover:bg-primary/5"
                        : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full transition-all md:h-10 md:w-10 ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md"
                        : isCompleted
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? (
                      <svg className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <Icon className="h-4 w-4 md:h-5 md:w-5" />
                    )}
                  </div>
                  <span className="hidden text-[10px] font-medium md:block md:text-xs">{step.title}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Form Content - Full width with max constraint */}
      <main className="mx-auto max-w-7xl px-4 py-4 md:px-6 md:py-8">
        {/* Step 1: Datos Tecnico */}
        {currentStep === 1 && (
          <Card className="border-0 shadow-lg md:border">
            <CardHeader className="pb-4 md:pb-6">
              <CardTitle className="flex items-center gap-3 text-lg md:text-xl">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                Datos del Tecnico
              </CardTitle>
              <CardDescription className="text-sm">Informacion del tecnico que realiza la caracterizacion</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 md:space-y-6">
              {/* Row 1: Tecnico name, Fecha, Municipio */}
              <div className="grid gap-4 md:grid-cols-3 md:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nombreTecnico" className="text-sm font-medium">Nombre del Tecnico *</Label>
                  <Input
                    id="nombreTecnico"
                    value={formData.datosTecnico.nombreTecnico}
                    onChange={(e) => updateFormData("datosTecnico", "nombreTecnico", e.target.value)}
                    placeholder="Nombre completo"
                    className="h-11 text-base md:h-10 md:text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fecha" className="text-sm font-medium">Fecha *</Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={formData.datosTecnico.fecha}
                    onChange={(e) => updateFormData("datosTecnico", "fecha", e.target.value)}
                    className="h-11 text-base md:h-10 md:text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="municipio" className="text-sm font-medium">Municipio *</Label>
                  <Select
                    value={formData.datosTecnico.municipio}
                    onValueChange={(value) => updateFormData("datosTecnico", "municipio", value)}
                  >
                    <SelectTrigger className="h-11 text-base md:h-10 md:text-sm">
                      <SelectValue placeholder="Seleccione municipio" />
                    </SelectTrigger>
                    <SelectContent>
                      {municipiosSantander.map((m) => (
                        <SelectItem key={m} value={m} className="text-base md:text-sm">{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: Departamento, Corregimiento, Vereda */}
              <div className="grid gap-4 md:grid-cols-3 md:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="departamento" className="text-sm font-medium">Departamento</Label>
                  <Input
                    id="departamento"
                    value={formData.datosTecnico.departamento}
                    disabled
                    className="h-11 text-base md:h-10 md:text-sm bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="corregimiento" className="text-sm font-medium">Corregimiento</Label>
                  <Input
                    id="corregimiento"
                    value={formData.datosTecnico.corregimiento}
                    onChange={(e) => updateFormData("datosTecnico", "corregimiento", e.target.value)}
                    placeholder="Corregimiento (opcional)"
                    className="h-11 text-base md:h-10 md:text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vereda" className="text-sm font-medium">Vereda *</Label>
                  <Input
                    id="vereda"
                    value={formData.datosTecnico.vereda}
                    onChange={(e) => updateFormData("datosTecnico", "vereda", e.target.value)}
                    placeholder="Nombre de la vereda"
                    className="h-11 text-base md:h-10 md:text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Informacion Familiar */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Informacion del Productor y Familia
              </CardTitle>
              <CardDescription>Datos personales del productor o representante del predio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Nombre completo - Full width */}
              <div className="space-y-2">
                <Label htmlFor="nombreProductor">Nombre Completo del Productor *</Label>
                <Input
                  id="nombreProductor"
                  value={formData.informacionFamiliar.nombreProductor}
                  onChange={(e) => updateFormData("informacionFamiliar", "nombreProductor", e.target.value)}
                  placeholder="Nombre completo"
                />
              </div>
              
              {/* Documento - 3 columns */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="tipoDocumento">Tipo de Documento *</Label>
                  <Select
                    value={formData.informacionFamiliar.tipoDocumento}
                    onValueChange={(value) => updateFormData("informacionFamiliar", "tipoDocumento", value as "CC" | "TI" | "CE" | "Pasaporte")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CC">Cedula de Ciudadania</SelectItem>
                      <SelectItem value="TI">Tarjeta de Identidad</SelectItem>
                      <SelectItem value="CE">Cedula de Extranjeria</SelectItem>
                      <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="numeroDocumento">Numero de Documento *</Label>
                  <Input
                    id="numeroDocumento"
                    value={formData.informacionFamiliar.numeroDocumento}
                    onChange={(e) => updateFormData("informacionFamiliar", "numeroDocumento", e.target.value)}
                    placeholder="Numero de documento"
                  />
                </div>
              </div>
              
              {/* Personal info - 3 columns */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="genero">Genero</Label>
                  <Select
                    value={formData.informacionFamiliar.genero}
                    onValueChange={(value) => updateFormData("informacionFamiliar", "genero", value as "Masculino" | "Femenino" | "Otro")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Femenino">Femenino</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fechaNacimiento">Fecha de Nacimiento</Label>
                  <Input
                    id="fechaNacimiento"
                    type="date"
                    value={formData.informacionFamiliar.fechaNacimiento}
                    onChange={(e) => updateFormData("informacionFamiliar", "fechaNacimiento", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estadoCivil">Estado Civil</Label>
                  <Select
                    value={formData.informacionFamiliar.estadoCivil}
                    onValueChange={(value) => updateFormData("informacionFamiliar", "estadoCivil", value as "Soltero" | "Casado" | "Union Libre" | "Viudo" | "Divorciado")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Soltero">Soltero/a</SelectItem>
                      <SelectItem value="Casado">Casado/a</SelectItem>
                      <SelectItem value="Union Libre">Union Libre</SelectItem>
                      <SelectItem value="Viudo">Viudo/a</SelectItem>
                      <SelectItem value="Divorciado">Divorciado/a</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="etnia">Grupo Etnico</Label>
                  <Select
                    value={formData.informacionFamiliar.etnia}
                    onValueChange={(value) => updateFormData("informacionFamiliar", "etnia", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ninguno">Ninguno</SelectItem>
                      <SelectItem value="Indigena">Indigena</SelectItem>
                      <SelectItem value="Afrodescendiente">Afrodescendiente</SelectItem>
                      <SelectItem value="Raizal">Raizal</SelectItem>
                      <SelectItem value="ROM">ROM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nivelEducativo">Nivel Educativo</Label>
                  <Select
                    value={formData.informacionFamiliar.nivelEducativo}
                    onValueChange={(value) => updateFormData("informacionFamiliar", "nivelEducativo", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ninguno">Ninguno</SelectItem>
                      <SelectItem value="Primaria incompleta">Primaria incompleta</SelectItem>
                      <SelectItem value="Primaria completa">Primaria completa</SelectItem>
                      <SelectItem value="Secundaria incompleta">Secundaria incompleta</SelectItem>
                      <SelectItem value="Secundaria completa">Secundaria completa</SelectItem>
                      <SelectItem value="Tecnico">Tecnico</SelectItem>
                      <SelectItem value="Tecnologico">Tecnologico</SelectItem>
                      <SelectItem value="Profesional">Profesional</SelectItem>
                      <SelectItem value="Posgrado">Posgrado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="telefono">Telefono *</Label>
                  <Input
                    id="telefono"
                    type="tel"
                    value={formData.informacionFamiliar.telefono}
                    onChange={(e) => updateFormData("informacionFamiliar", "telefono", e.target.value)}
                    placeholder="Numero de telefono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="correo">Correo Electronico</Label>
                  <Input
                    id="correo"
                    type="email"
                    value={formData.informacionFamiliar.correo}
                    onChange={(e) => updateFormData("informacionFamiliar", "correo", e.target.value)}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="actividadPrincipal">Actividad Principal</Label>
                <Input
                  id="actividadPrincipal"
                  value={formData.informacionFamiliar.actividadPrincipal}
                  onChange={(e) => updateFormData("informacionFamiliar", "actividadPrincipal", e.target.value)}
                  placeholder="Ej: Agricultor, Ganadero, etc."
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="personasHogar">Personas en el Hogar</Label>
                  <Input
                    id="personasHogar"
                    type="number"
                    min={1}
                    value={formData.informacionFamiliar.personasHogar}
                    onChange={(e) => updateFormData("informacionFamiliar", "personasHogar", parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="menoresEdad">Menores de Edad</Label>
                  <Input
                    id="menoresEdad"
                    type="number"
                    min={0}
                    value={formData.informacionFamiliar.menoresEdad}
                    onChange={(e) => updateFormData("informacionFamiliar", "menoresEdad", parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adultosMayores">Adultos Mayores</Label>
                  <Input
                    id="adultosMayores"
                    type="number"
                    min={0}
                    value={formData.informacionFamiliar.adultosMayores}
                    onChange={(e) => updateFormData("informacionFamiliar", "adultosMayores", parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="personasDiscapacidad">Con Discapacidad</Label>
                  <Input
                    id="personasDiscapacidad"
                    type="number"
                    min={0}
                    value={formData.informacionFamiliar.personasDiscapacidad}
                    onChange={(e) => updateFormData("informacionFamiliar", "personasDiscapacidad", parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Datos del Predio */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Datos del Predio
              </CardTitle>
              <CardDescription>Informacion de ubicacion y caracteristicas del predio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombrePredio">Nombre del Predio *</Label>
                <Input
                  id="nombrePredio"
                  value={formData.datosPredio.nombrePredio}
                  onChange={(e) => updateFormData("datosPredio", "nombrePredio", e.target.value)}
                  placeholder="Nombre o como se conoce el predio"
                />
              </div>

              <div className="space-y-2">
                <Label>Ubicacion del Predio *</Label>
                <p className="text-sm text-muted-foreground">
                  Marque un punto o dibuje el poligono del predio en el mapa
                </p>
                <LocationPicker
                  onLocationChange={(data) => {
                    setFormData((prev) => ({
                      ...prev,
                      datosPredio: {
                        ...prev.datosPredio,
                        latitud: data.latitud,
                        longitud: data.longitud,
                        poligono: data.poligono,
                        tipoUbicacion: data.tipoUbicacion,
                      },
                    }))
                  }}
                  initialLocation={{
                    latitud: formData.datosPredio.latitud,
                    longitud: formData.datosPredio.longitud,
                    poligono: formData.datosPredio.poligono,
                    tipoUbicacion: formData.datosPredio.tipoUbicacion,
                  }}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="areaTotal">Area Total (Hectareas) *</Label>
                  <Input
                    id="areaTotal"
                    type="number"
                    step="0.01"
                    min={0}
                    value={formData.datosPredio.areaTotal}
                    onChange={(e) => updateFormData("datosPredio", "areaTotal", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="areaProductiva">Area Productiva (Hectareas)</Label>
                  <Input
                    id="areaProductiva"
                    type="number"
                    step="0.01"
                    min={0}
                    value={formData.datosPredio.areaProductiva}
                    onChange={(e) => updateFormData("datosPredio", "areaProductiva", parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="tenencia">Tipo de Tenencia *</Label>
                  <Select
                    value={formData.datosPredio.tenencia}
                    onValueChange={(value) => updateFormData("datosPredio", "tenencia", value as "Propia" | "Arrendada" | "Comodato" | "Posesion" | "Otra")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Propia">Propia</SelectItem>
                      <SelectItem value="Arrendada">Arrendada</SelectItem>
                      <SelectItem value="Comodato">Comodato</SelectItem>
                      <SelectItem value="Posesion">Posesion</SelectItem>
                      <SelectItem value="Otra">Otra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tiempoTenencia">Tiempo de Tenencia</Label>
                  <Input
                    id="tiempoTenencia"
                    value={formData.datosPredio.tiempoTenencia}
                    onChange={(e) => updateFormData("datosPredio", "tiempoTenencia", e.target.value)}
                    placeholder="Ej: 5 anos"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="documentoTenencia">Documento de Tenencia</Label>
                  <Input
                    id="documentoTenencia"
                    value={formData.datosPredio.documentoTenencia}
                    onChange={(e) => updateFormData("datosPredio", "documentoTenencia", e.target.value)}
                    placeholder="Ej: Escritura, Contrato"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Descripcion Fisica */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mountain className="h-5 w-5 text-primary" />
                Descripcion Fisica del Predio
              </CardTitle>
              <CardDescription>Caracteristicas fisicas y ambientales del terreno</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="topografia">Topografia *</Label>
                  <Select
                    value={formData.descripcionFisica.topografia}
                    onValueChange={(value) => updateFormData("descripcionFisica", "topografia", value as "Plana" | "Ondulada" | "Quebrada" | "Escarpada")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Plana">Plana (0-3%)</SelectItem>
                      <SelectItem value="Ondulada">Ondulada (3-12%)</SelectItem>
                      <SelectItem value="Quebrada">Quebrada (12-25%)</SelectItem>
                      <SelectItem value="Escarpada">Escarpada (mas de 25%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipoSuelo">Tipo de Suelo</Label>
                  <Input
                    id="tipoSuelo"
                    value={formData.descripcionFisica.tipoSuelo}
                    onChange={(e) => updateFormData("descripcionFisica", "tipoSuelo", e.target.value)}
                    placeholder="Ej: Arcilloso, Franco, Arenoso"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cobertura Vegetal</Label>
                <div className="flex flex-wrap gap-2">
                  {["Bosque natural", "Rastrojo", "Pastos", "Cultivos", "Zona erosionada"].map((item) => (
                    <Button
                      key={item}
                      type="button"
                      variant={formData.descripcionFisica.coberturaVegetal.includes(item) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleArrayItem("descripcionFisica", "coberturaVegetal", item)}
                    >
                      {item}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Fuentes de Agua</Label>
                <div className="flex flex-wrap gap-2">
                  {["Rio", "Quebrada", "Nacimiento", "Pozo", "Acueducto", "Distrito de riego", "Ninguna"].map((item) => (
                    <Button
                      key={item}
                      type="button"
                      variant={formData.descripcionFisica.fuentesAgua.includes(item) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleArrayItem("descripcionFisica", "fuentesAgua", item)}
                    >
                      {item}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Riesgos Naturales</Label>
                <div className="flex flex-wrap gap-2">
                  {["Inundacion", "Deslizamiento", "Sequia", "Heladas", "Incendios", "Ninguno"].map((item) => (
                    <Button
                      key={item}
                      type="button"
                      variant={formData.descripcionFisica.riesgosNaturales.includes(item) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleArrayItem("descripcionFisica", "riesgosNaturales", item)}
                    >
                      {item}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="viaAcceso">Via de Acceso Principal</Label>
                  <Select
                    value={formData.descripcionFisica.viaAcceso}
                    onValueChange={(value) => updateFormData("descripcionFisica", "viaAcceso", value as "Pavimentada" | "Destapada" | "Trocha" | "Fluvial")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pavimentada">Pavimentada</SelectItem>
                      <SelectItem value="Destapada">Destapada</SelectItem>
                      <SelectItem value="Trocha">Trocha</SelectItem>
                      <SelectItem value="Fluvial">Fluvial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="distanciaCabecera">Distancia a Cabecera Municipal (km)</Label>
                  <Input
                    id="distanciaCabecera"
                    type="number"
                    step="0.1"
                    min={0}
                    value={formData.descripcionFisica.distanciaCabecera}
                    onChange={(e) => updateFormData("descripcionFisica", "distanciaCabecera", parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Area Productiva */}
        {currentStep === 5 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sprout className="h-5 w-5 text-primary" />
                Area Productiva
              </CardTitle>
              <CardDescription>Cultivos, actividades pecuarias y sistemas productivos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Cultivos */}
              <div className="space-y-3">
                <Label>Cultivos Principales</Label>
                <div className="rounded-lg border border-border p-3">
                  <div className="grid gap-2 sm:grid-cols-5">
                    <Input
                      placeholder="Cultivo"
                      value={newCultivo.nombre}
                      onChange={(e) => setNewCultivo({ ...newCultivo, nombre: e.target.value })}
                    />
                    <Input
                      type="number"
                      placeholder="Area (ha)"
                      value={newCultivo.area || ""}
                      onChange={(e) => setNewCultivo({ ...newCultivo, area: parseFloat(e.target.value) || 0 })}
                    />
                    <Input
                      type="number"
                      placeholder="Produccion (kg)"
                      value={newCultivo.produccion || ""}
                      onChange={(e) => setNewCultivo({ ...newCultivo, produccion: parseFloat(e.target.value) || 0 })}
                    />
                    <Input
                      placeholder="Destino"
                      value={newCultivo.destino}
                      onChange={(e) => setNewCultivo({ ...newCultivo, destino: e.target.value })}
                    />
                    <Button type="button" onClick={addCultivo}>Agregar</Button>
                  </div>
                </div>
                {formData.areaProductiva.cultivosPrincipales.length > 0 && (
                  <div className="space-y-2">
                    {formData.areaProductiva.cultivosPrincipales.map((cultivo, index) => (
                      <div key={index} className="flex items-center justify-between rounded-md bg-muted p-2">
                        <span className="text-sm">
                          {cultivo.nombre} - {cultivo.area}ha - {cultivo.produccion}kg - {cultivo.destino}
                        </span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeCultivo(index)}>
                          Eliminar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actividades Pecuarias */}
              <div className="space-y-3">
                <Label>Actividades Pecuarias</Label>
                <div className="rounded-lg border border-border p-3">
                  <div className="grid gap-2 sm:grid-cols-4">
                    <Input
                      placeholder="Tipo (Bovinos, Aves...)"
                      value={newActividad.tipo}
                      onChange={(e) => setNewActividad({ ...newActividad, tipo: e.target.value })}
                    />
                    <Input
                      type="number"
                      placeholder="Cantidad"
                      value={newActividad.cantidad || ""}
                      onChange={(e) => setNewActividad({ ...newActividad, cantidad: parseInt(e.target.value) || 0 })}
                    />
                    <Input
                      placeholder="Destino"
                      value={newActividad.destino}
                      onChange={(e) => setNewActividad({ ...newActividad, destino: e.target.value })}
                    />
                    <Button type="button" onClick={addActividad}>Agregar</Button>
                  </div>
                </div>
                {formData.areaProductiva.actividadesPecuarias.length > 0 && (
                  <div className="space-y-2">
                    {formData.areaProductiva.actividadesPecuarias.map((actividad, index) => (
                      <div key={index} className="flex items-center justify-between rounded-md bg-muted p-2">
                        <span className="text-sm">
                          {actividad.tipo} - {actividad.cantidad} - {actividad.destino}
                        </span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeActividad(index)}>
                          Eliminar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sistemas Productivos */}
              <div className="space-y-2">
                <Label>Sistemas Productivos</Label>
                <div className="flex flex-wrap gap-2">
                  {["Monocultivo", "Policultivo", "Agroforestal", "Silvopastoril", "Acuicola", "Organico"].map((item) => (
                    <Button
                      key={item}
                      type="button"
                      variant={formData.areaProductiva.sistemasProductivos.includes(item) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleArrayItem("areaProductiva", "sistemasProductivos", item)}
                    >
                      {item}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Practicas Sostenibles */}
              <div className="space-y-2">
                <Label>Practicas Sostenibles</Label>
                <div className="flex flex-wrap gap-2">
                  {["Compostaje", "Control biologico", "Rotacion de cultivos", "Conservacion de suelos", "Captacion de agua lluvia", "Energia renovable", "Ninguna"].map((item) => (
                    <Button
                      key={item}
                      type="button"
                      variant={formData.areaProductiva.practicasSostenibles.includes(item) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleArrayItem("areaProductiva", "practicasSostenibles", item)}
                    >
                      {item}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 6: Informacion Financiera */}
        {currentStep === 6 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Informacion Financiera
              </CardTitle>
              <CardDescription>Ingresos, fuentes de financiamiento y asociatividad</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ingresosMensuales">Rango de Ingresos Mensuales</Label>
                <Select
                  value={formData.informacionFinanciera.ingresosMensuales}
                  onValueChange={(value) => updateFormData("informacionFinanciera", "ingresosMensuales", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un rango" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Menos de 1 SMMLV">Menos de 1 SMMLV</SelectItem>
                    <SelectItem value="1-2 SMMLV">1-2 SMMLV</SelectItem>
                    <SelectItem value="2-3 SMMLV">2-3 SMMLV</SelectItem>
                    <SelectItem value="3-5 SMMLV">3-5 SMMLV</SelectItem>
                    <SelectItem value="Mas de 5 SMMLV">Mas de 5 SMMLV</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fuentes de Ingreso</Label>
                <div className="flex flex-wrap gap-2">
                  {["Venta de productos agricolas", "Venta de productos pecuarios", "Jornal", "Arriendo", "Pensiones", "Remesas", "Otro"].map((item) => (
                    <Button
                      key={item}
                      type="button"
                      variant={formData.informacionFinanciera.fuentesIngreso.includes(item) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleArrayItem("informacionFinanciera", "fuentesIngreso", item)}
                    >
                      {item}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="accesoCredito"
                    checked={formData.informacionFinanciera.accesoCredito}
                    onCheckedChange={(checked) => updateFormData("informacionFinanciera", "accesoCredito", !!checked)}
                  />
                  <Label htmlFor="accesoCredito">Tiene acceso a credito?</Label>
                </div>
                {formData.informacionFinanciera.accesoCredito && (
                  <Input
                    placeholder="Entidad de credito"
                    value={formData.informacionFinanciera.entidadCredito || ""}
                    onChange={(e) => updateFormData("informacionFinanciera", "entidadCredito", e.target.value)}
                  />
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="perteneceAsociacion"
                    checked={formData.informacionFinanciera.perteneceAsociacion}
                    onCheckedChange={(checked) => updateFormData("informacionFinanciera", "perteneceAsociacion", !!checked)}
                  />
                  <Label htmlFor="perteneceAsociacion">Pertenece a alguna asociacion?</Label>
                </div>
                {formData.informacionFinanciera.perteneceAsociacion && (
                  <Input
                    placeholder="Nombre de la asociacion"
                    value={formData.informacionFinanciera.nombreAsociacion || ""}
                    onChange={(e) => updateFormData("informacionFinanciera", "nombreAsociacion", e.target.value)}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 7: Autorizacion */}
        {currentStep === 7 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-primary" />
                Autorizacion de Tratamiento de Datos
              </CardTitle>
              <CardDescription>Consentimiento para el tratamiento de datos personales</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Autorizo de manera voluntaria, previa, explicita, informada e inequivoca a AgroSantander360 
                  para tratar mis datos personales de acuerdo con la Ley 1581 de 2012 y sus decretos reglamentarios. 
                  Entiendo que mis datos seran utilizados unicamente para fines de caracterizacion predial, 
                  analisis agropecuario y gestion de programas de apoyo al sector rural.
                </p>
                <br />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Declaro que la informacion suministrada es veraz y autorizo su verificacion. 
                  Conozco que puedo ejercer mis derechos de acceso, correccion, actualizacion y supresion 
                  de datos personales mediante solicitud escrita.
                </p>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-border p-4">
                <Checkbox
                  id="autorizacionDatos"
                  checked={formData.autorizacionDatos}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, autorizacionDatos: !!checked }))}
                  className="mt-1"
                />
                <Label htmlFor="autorizacionDatos" className="text-sm leading-relaxed cursor-pointer">
                  He leido y acepto la politica de tratamiento de datos personales. Autorizo el uso de mi 
                  informacion para los fines descritos anteriormente.
                </Label>
              </div>

              {!formData.autorizacionDatos && (
                <p className="text-sm text-destructive">
                  * Debe aceptar la autorizacion para enviar el formulario
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons - Sticky on mobile */}
        <div className="sticky bottom-0 -mx-4 mt-6 border-t border-border bg-card/95 px-4 py-4 backdrop-blur-md md:relative md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
          <div className="flex items-center justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="h-12 flex-1 gap-2 bg-transparent text-base md:h-10 md:flex-none md:text-sm"
            >
              <ChevronLeft className="h-5 w-5 md:h-4 md:w-4" />
              <span>Anterior</span>
            </Button>

            {currentStep < steps.length ? (
              <Button 
                type="button" 
                onClick={nextStep} 
                className="h-12 flex-1 gap-2 text-base md:h-10 md:flex-none md:text-sm"
              >
                <span>Siguiente</span>
                <ChevronRight className="h-5 w-5 md:h-4 md:w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!formData.autorizacionDatos || isSubmitting}
                className="h-12 flex-1 gap-2 text-base md:h-10 md:flex-none md:text-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin md:h-4 md:w-4" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 md:h-4 md:w-4" />
                    <span>Enviar</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
