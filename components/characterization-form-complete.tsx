"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { LocationPicker } from "./location-picker"
import { SignaturePad } from "./signature-pad"
import { PhotoUpload } from "./photo-upload"
import { saveCaracterizacion } from "@/lib/db/indexed-db"
import { 
  User, 
  MapPin, 
  Mountain, 
  Droplets,
  AlertTriangle,
  Sprout, 
  Wallet, 
  FileCheck,
  ChevronLeft,
  ChevronRight,
  Send,
  Loader2,
  Home,
  Camera,
  FileSignature
} from "lucide-react"
import { ThemeToggle } from "./theme-toggle"
import { ConnectionStatus } from "./connection-status"
import { SyncButton } from "./sync-button"
import { UserProfile } from "./user-profile"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import Link from "next/link"

// Municipios de Santander (sin duplicados)
const municipiosSantander = [...new Set([
  "Bucaramanga", "Floridablanca", "Giron", "Piedecuesta", "Barrancabermeja",
  "San Gil", "Socorro", "Barbosa", "Velez", "Malaga", "Lebrija", "Rionegro",
  "Cimitarra", "Puerto Wilches", "Sabana de Torres", "San Vicente de Chucuri",
  "El Playon", "Zapatoca", "Charala", "Oiba", "Puente Nacional", "Simacota",
  "Barichara", "Villanueva", "Curiti", "Aratoca", "Mogotes", "Onzaga",
  "San Joaquin", "Coromoro", "Encino", "Ocamonte", "Valle de San Jose",
  "Paramo", "Cerrito", "Pinchote", "Cabrera", "Guadalupe", "Guaca",
  "San Andres", "Macaravita", "Capitanejo", "Carcasi", "San Miguel",
  "Molagavita", "Enciso", "Concepcion", "Los Santos", "Gambita",
  "Suaita", "Guepsa", "Chipatá", "Jesus Maria", "Albania", "Sucre",
  "Bolivar", "El Carmen de Chucuri", "Landazuri", "El Penon",
  "Contratacion", "Galan", "Hato", "Palmas del Socorro", "Confines",
  "Guavata", "Chipata", "Aguada", "La Paz", "Santa Helena del Opon",
  "Puerto Parra", "Betulia", "Tona", "Matanza", "Surata", "California",
  "Vetas", "Charta", "El Carmen"
])].sort()

// Pasos del formulario
const steps = [
  { id: 1, title: "Datos Visita", icon: User, description: "Información del técnico y visita" },
  { id: 2, title: "Beneficiario", icon: User, description: "Datos personales del productor" },
  { id: 3, title: "Predio", icon: MapPin, description: "Ubicación y tenencia del predio" },
  { id: 4, title: "Caracterización", icon: Mountain, description: "Características físicas del predio" },
  { id: 5, title: "Agua y Riesgos", icon: Droplets, description: "Abastecimiento y riesgos" },
  { id: 6, title: "Área Productiva", icon: Sprout, description: "Producción y comercialización" },
  { id: 7, title: "Info. Financiera", icon: Wallet, description: "Ingresos, egresos y activos" },
  { id: 8, title: "Fotos y Firma", icon: Camera, description: "Evidencia fotográfica y firma" },
  { id: 9, title: "Autorización", icon: FileCheck, description: "Consentimiento y envío" },
]

// Tipos
interface FormData {
  // 1. Datos de la visita
  visita: {
    fechaVisita: string
    nombreTecnico: string
    codigoFormulario: string
    versionFormulario: string
    fechaEmisionFormulario: string
  }
  // 2. Datos del beneficiario
  beneficiario: {
    nombres: string
    apellidos: string
    tipoDocumento: string
    numeroDocumento: string
    edad: number | null
    telefono: string
    correo: string
    ocupacionPrincipal: string
  }
  // 3. Datos del predio
  predio: {
    nombrePredio: string
    departamento: string
    municipio: string
    vereda: string
    direccion: string
    codigoCatastral: string
    documentoTenencia: string
    tipoTenencia: string
    tipoTenenciaOtro: string
    coordenadaX: string
    coordenadaY: string
    latitud: number
    longitud: number
    altitudMsnm: number | null
    viveEnPredio: string
    tieneVivienda: boolean
    areaTotalHectareas: number | null
    areaProductivaHectareas: number | null
    cultivosExistentes: string
  }
  // 4. Caracterización del predio
  caracterizacion: {
    rutaAcceso: string
    distanciaKm: number | null
    tiempoAcceso: string
    temperaturaCelsius: number | null
    mesesLluvia: string
    topografia: string
    coberturaBosque: boolean
    coberturaCultivos: boolean
    coberturaPastos: boolean
    coberturaRastrojo: boolean
  }
  // 5. Abastecimiento de agua
  abastecimientoAgua: {
    nacimientoManantial: boolean
    rioQuebrada: boolean
    pozo: boolean
    acueductoRural: boolean
    canalDistritoRiego: boolean
    jagueyReservorio: boolean
    aguaLluvia: boolean
    otraFuente: string
  }
  // 6. Riesgos del predio
  riesgos: {
    inundacion: boolean
    sequia: boolean
    viento: boolean
    helada: boolean
    otrosRiesgos: string
  }
  // 7. Área productiva
  areaProductiva: {
    sistemaProductivo: string
    caracterizacionCultivo: string
    cantidadProduccion: string
    estadoCultivo: string
    tieneInfraestructuraProcesamiento: boolean
    estructuras: string
    interesadoPrograma: boolean
    dondeComercializa: string
    ingresoMensualVentas: number | null
  }
  // 8. Información financiera
  infoFinanciera: {
    ingresosMensualesAgropecuaria: number | null
    ingresosMensualesOtros: number | null
    egresosMensuales: number | null
    activosTotales: number | null
    activosAgropecuaria: number | null
    pasivosTotales: number | null
  }
  // 9. Fotos y firma
  archivos: {
    fotoBeneficiario: string
    foto1Url: string
    foto2Url: string
    firmaProductorUrl: string
  }
  // 10. Autorizaciones
  autorizaciones: {
    autorizacionDatosPersonales: boolean
    autorizacionConsultaCrediticia: boolean
  }
  // Observaciones generales
  observaciones: string
}

const initialFormData: FormData = {
  visita: {
    fechaVisita: new Date().toISOString().split("T")[0],
    nombreTecnico: "",
    codigoFormulario: "",
    versionFormulario: "1.0",
    fechaEmisionFormulario: new Date().toISOString().split("T")[0],
  },
  beneficiario: {
    nombres: "",
    apellidos: "",
    tipoDocumento: "CC",
    numeroDocumento: "",
    edad: null,
    telefono: "",
    correo: "",
    ocupacionPrincipal: "",
  },
  predio: {
    nombrePredio: "",
    departamento: "Santander",
    municipio: "",
    vereda: "",
    direccion: "",
    codigoCatastral: "",
    documentoTenencia: "",
    tipoTenencia: "",
    tipoTenenciaOtro: "",
    coordenadaX: "",
    coordenadaY: "",
    latitud: 7.1254,
    longitud: -73.1198,
    altitudMsnm: null,
    viveEnPredio: "",
    tieneVivienda: false,
    areaTotalHectareas: null,
    areaProductivaHectareas: null,
    cultivosExistentes: "",
  },
  caracterizacion: {
    rutaAcceso: "",
    distanciaKm: null,
    tiempoAcceso: "",
    temperaturaCelsius: null,
    mesesLluvia: "",
    topografia: "",
    coberturaBosque: false,
    coberturaCultivos: false,
    coberturaPastos: false,
    coberturaRastrojo: false,
  },
  abastecimientoAgua: {
    nacimientoManantial: false,
    rioQuebrada: false,
    pozo: false,
    acueductoRural: false,
    canalDistritoRiego: false,
    jagueyReservorio: false,
    aguaLluvia: false,
    otraFuente: "",
  },
  riesgos: {
    inundacion: false,
    sequia: false,
    viento: false,
    helada: false,
    otrosRiesgos: "",
  },
  areaProductiva: {
    sistemaProductivo: "",
    caracterizacionCultivo: "",
    cantidadProduccion: "",
    estadoCultivo: "",
    tieneInfraestructuraProcesamiento: false,
    estructuras: "",
    interesadoPrograma: false,
    dondeComercializa: "",
    ingresoMensualVentas: null,
  },
  infoFinanciera: {
    ingresosMensualesAgropecuaria: null,
    ingresosMensualesOtros: null,
    egresosMensuales: null,
    activosTotales: null,
    activosAgropecuaria: null,
    pasivosTotales: null,
  },
  archivos: {
    fotoBeneficiario: "",
    foto1Url: "",
    foto2Url: "",
    firmaProductorUrl: "",
  },
  autorizaciones: {
    autorizacionDatosPersonales: false,
    autorizacionConsultaCrediticia: false,
  },
  observaciones: "",
}

// Tipos de errores
interface ValidationErrors {
  [key: string]: string
}

// Validadores
const validateEmail = (email: string): boolean => {
  if (!email) return true // Email no es obligatorio
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

const validatePhone = (phone: string): boolean => {
  if (!phone) return false
  const re = /^[0-9]{7,10}$/
  return re.test(phone.replace(/\s/g, ''))
}

const validateDocument = (doc: string): boolean => {
  if (!doc) return false
  const re = /^[0-9]{6,12}$/
  return re.test(doc.replace(/\s/g, ''))
}

export function CharacterizationFormComplete() {
  const router = useRouter()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [showErrors, setShowErrors] = useState(false)

  // Helper para actualizar campos anidados
  const updateField = (section: keyof FormData, field: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] as Record<string, unknown>),
        [field]: value,
      },
    }))
    // Limpiar error del campo cuando se modifica
    if (errors[`${section}.${field}`]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[`${section}.${field}`]
        return newErrors
      })
    }
  }

  // Validacion por paso
  const validateStep = (step: number): ValidationErrors => {
    const stepErrors: ValidationErrors = {}
    
    switch (step) {
      case 1: // Datos Visita
        if (!formData.visita.fechaVisita) stepErrors['visita.fechaVisita'] = 'La fecha de visita es requerida'
        if (!formData.visita.nombreTecnico.trim()) stepErrors['visita.nombreTecnico'] = 'El nombre del tecnico es requerido'
        break
        
      case 2: // Beneficiario
        if (!formData.beneficiario.nombres.trim()) stepErrors['beneficiario.nombres'] = 'Los nombres son requeridos'
        if (!formData.beneficiario.apellidos.trim()) stepErrors['beneficiario.apellidos'] = 'Los apellidos son requeridos'
        if (!formData.beneficiario.tipoDocumento) stepErrors['beneficiario.tipoDocumento'] = 'El tipo de documento es requerido'
        if (!validateDocument(formData.beneficiario.numeroDocumento)) stepErrors['beneficiario.numeroDocumento'] = 'Numero de documento invalido (6-12 digitos)'
        if (!validatePhone(formData.beneficiario.telefono)) stepErrors['beneficiario.telefono'] = 'Telefono invalido (7-10 digitos)'
        if (formData.beneficiario.correo && !validateEmail(formData.beneficiario.correo)) stepErrors['beneficiario.correo'] = 'Correo electronico invalido'
        break
        
      case 3: // Predio
        if (!formData.predio.nombrePredio.trim()) stepErrors['predio.nombrePredio'] = 'El nombre del predio es requerido'
        if (!formData.predio.municipio) stepErrors['predio.municipio'] = 'El municipio es requerido'
        if (!formData.predio.vereda.trim()) stepErrors['predio.vereda'] = 'La vereda es requerida'
        if (!formData.predio.tipoTenencia) stepErrors['predio.tipoTenencia'] = 'El tipo de tenencia es requerido'
        if (formData.predio.areaTotalHectareas !== null && formData.predio.areaTotalHectareas < 0) stepErrors['predio.areaTotalHectareas'] = 'El area no puede ser negativa'
        break
        
      case 4: // Caracterizacion
        if (!formData.caracterizacion.topografia) stepErrors['caracterizacion.topografia'] = 'La topografia es requerida'
        break
        
      case 5: // Agua y Riesgos
        // Al menos una fuente de agua debe estar seleccionada
        const tieneAgua = formData.abastecimientoAgua.nacimientoManantial ||
          formData.abastecimientoAgua.rioQuebrada ||
          formData.abastecimientoAgua.pozo ||
          formData.abastecimientoAgua.acueductoRural ||
          formData.abastecimientoAgua.canalDistritoRiego ||
          formData.abastecimientoAgua.jagueyReservorio ||
          formData.abastecimientoAgua.aguaLluvia ||
          formData.abastecimientoAgua.otraFuente.trim()
        if (!tieneAgua) stepErrors['abastecimientoAgua'] = 'Debe seleccionar al menos una fuente de agua'
        break
        
      case 6: // Area Productiva
        if (!formData.areaProductiva.sistemaProductivo.trim()) stepErrors['areaProductiva.sistemaProductivo'] = 'El sistema productivo es requerido'
        break
        
      case 7: // Info Financiera
        // Campos opcionales pero si se llenan deben ser numeros positivos
        if (formData.infoFinanciera.ingresosMensualesAgropecuaria !== null && formData.infoFinanciera.ingresosMensualesAgropecuaria < 0) {
          stepErrors['infoFinanciera.ingresosMensualesAgropecuaria'] = 'Los ingresos no pueden ser negativos'
        }
        break
        
      case 8: // Fotos y Firma
        if (!formData.archivos.firmaProductorUrl) stepErrors['archivos.firmaProductorUrl'] = 'La firma del productor es requerida'
        break
        
      case 9: // Autorizacion
        if (!formData.autorizaciones.autorizacionDatosPersonales) stepErrors['autorizaciones.autorizacionDatosPersonales'] = 'Debe autorizar el tratamiento de datos personales'
        break
    }
    
    return stepErrors
  }

  // Navegación con validacion
  const nextStep = () => {
    const stepErrors = validateStep(currentStep)
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      setShowErrors(true)
      return
    }
    setShowErrors(false)
    setErrors({})
    if (currentStep < steps.length) setCurrentStep(currentStep + 1)
  }
  
  const prevStep = () => {
    setShowErrors(false)
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  // Enviar formulario
  const handleSubmit = async () => {
    if (!formData.autorizaciones.autorizacionDatosPersonales) {
      toast.error("Debe autorizar el tratamiento de datos personales para continuar")
      return
    }

    setIsSubmitting(true)
    try {
      // Estructura que coincide con las tablas de la BD
      const dataToSave = {
        // Metadata
        documentoProductor: formData.beneficiario.numeroDocumento,
        nombreProductor: `${formData.beneficiario.nombres} ${formData.beneficiario.apellidos}`,
        asesorId: user?.id,
        asesorEmail: user?.email,
        observaciones: formData.observaciones,
        
        // 1. Datos de la visita (tabla visitas)
        visita: {
          fechaVisita: formData.visita.fechaVisita,
          nombreTecnico: formData.visita.nombreTecnico,
          departamento: formData.predio.departamento,
          municipio: formData.predio.municipio,
          corregimiento: '',
          vereda: formData.predio.vereda,
          objetivo: 'Caracterizacion predial',
          observaciones: formData.observaciones,
        },
        
        // 2. Datos del beneficiario (tabla beneficiarios)
        beneficiario: {
          tipoDocumento: formData.beneficiario.tipoDocumento,
          numeroDocumento: formData.beneficiario.numeroDocumento,
          primerNombre: formData.beneficiario.nombres.split(' ').filter(Boolean)[0] || '',
          segundoNombre: formData.beneficiario.nombres.split(' ').filter(Boolean)[1] || null,
          primerApellido: formData.beneficiario.apellidos.split(' ').filter(Boolean)[0] || '',
          segundoApellido: formData.beneficiario.apellidos.split(' ').filter(Boolean)[1] || null,
          edad: formData.beneficiario.edad,
          telefono: formData.beneficiario.telefono,
          email: formData.beneficiario.correo,
          ocupacionPrincipal: formData.beneficiario.ocupacionPrincipal,
          municipio: formData.predio.municipio,
          vereda: formData.predio.vereda,
        },
        
        // 3. Datos del predio (tabla predios)
        predio: {
          nombrePredio: formData.predio.nombrePredio,
          tipoTenencia: formData.predio.tipoTenencia,
          tipoTenenciaOtro: formData.predio.tipoTenenciaOtro,
          documentoTenencia: formData.predio.documentoTenencia,
          areaTotalHectareas: formData.predio.areaTotalHectareas,
          areaProductivaHectareas: formData.predio.areaProductivaHectareas,
          latitud: formData.predio.latitud,
          longitud: formData.predio.longitud,
          altitudMsnm: formData.predio.altitudMsnm,
          direccion: formData.predio.direccion,
          codigoCatastral: formData.predio.codigoCatastral,
          coordenadaX: formData.predio.coordenadaX,
          coordenadaY: formData.predio.coordenadaY,
          viveEnPredio: formData.predio.viveEnPredio,
          tieneVivienda: formData.predio.tieneVivienda,
          cultivosExistentes: formData.predio.cultivosExistentes,
        },
        
        // 4. Caracterizacion del predio (tabla caracterizacion_predio)
        caracterizacion: {
          ruta_acceso: formData.caracterizacion.rutaAcceso,
          distancia_km: formData.caracterizacion.distanciaKm,
          tiempo_acceso: formData.caracterizacion.tiempoAcceso,
          temperatura_celsius: formData.caracterizacion.temperaturaCelsius,
          meses_lluvia: formData.caracterizacion.mesesLluvia,
          topografia: formData.caracterizacion.topografia,
          cobertura_bosque: formData.caracterizacion.coberturaBosque,
          cobertura_cultivos: formData.caracterizacion.coberturaCultivos,
          cobertura_pastos: formData.caracterizacion.coberturaPastos,
          cobertura_rastrojo: formData.caracterizacion.coberturaRastrojo,
        },
        
        // 5. Agua y riesgos (tablas abastecimiento_agua y riesgos_predio)
        aguaRiesgos: {
          // Abastecimiento agua
          tipoFuenteAgua: [
            formData.abastecimientoAgua.nacimientoManantial && 'Nacimiento/Manantial',
            formData.abastecimientoAgua.rioQuebrada && 'Rio/Quebrada',
            formData.abastecimientoAgua.pozo && 'Pozo',
            formData.abastecimientoAgua.acueductoRural && 'Acueducto rural',
            formData.abastecimientoAgua.canalDistritoRiego && 'Canal distrito riego',
            formData.abastecimientoAgua.jagueyReservorio && 'Jagüey/Reservorio',
            formData.abastecimientoAgua.aguaLluvia && 'Agua lluvia',
          ].filter(Boolean).join(', ') || formData.abastecimientoAgua.otraFuente || null,
          disponibilidadAgua: 'Permanente',
          tieneConcesion: false,
          nacimientoManantial: formData.abastecimientoAgua.nacimientoManantial,
          rioQuebrada: formData.abastecimientoAgua.rioQuebrada,
          pozo: formData.abastecimientoAgua.pozo,
          acueductoRural: formData.abastecimientoAgua.acueductoRural,
          canalDistritoRiego: formData.abastecimientoAgua.canalDistritoRiego,
          jagueyReservorio: formData.abastecimientoAgua.jagueyReservorio,
          aguaLluvia: formData.abastecimientoAgua.aguaLluvia,
          otraFuente: formData.abastecimientoAgua.otraFuente || null,
          // Riesgos
          inundacion: formData.riesgos.inundacion,
          sequia: formData.riesgos.sequia,
          viento: formData.riesgos.viento,
          helada: formData.riesgos.helada,
          otrosRiesgos: formData.riesgos.otrosRiesgos || null,
          riesgos: [
            formData.riesgos.inundacion && { tipo: 'Inundacion', nivel: 'Medio' },
            formData.riesgos.sequia && { tipo: 'Sequia', nivel: 'Medio' },
            formData.riesgos.viento && { tipo: 'Viento', nivel: 'Medio' },
            formData.riesgos.helada && { tipo: 'Helada', nivel: 'Medio' },
            formData.riesgos.otrosRiesgos && { tipo: formData.riesgos.otrosRiesgos, nivel: 'Medio' },
          ].filter(Boolean),
        },
        
        // 6. Area productiva (tabla area_productiva)
        areaProductiva: {
          sistemaProductivo: formData.areaProductiva.sistemaProductivo,
          caracterizacionCultivo: formData.areaProductiva.caracterizacionCultivo,
          cantidadProduccion: formData.areaProductiva.cantidadProduccion,
          estadoCultivo: formData.areaProductiva.estadoCultivo,
          tieneInfraestructuraProcesamiento: formData.areaProductiva.tieneInfraestructuraProcesamiento,
          estructuras: formData.areaProductiva.estructuras,
          interesadoPrograma: formData.areaProductiva.interesadoPrograma,
          dondeComercializa: formData.areaProductiva.dondeComercializa,
          ingresoMensualVentas: formData.areaProductiva.ingresoMensualVentas,
        },
        
        // 7. Informacion financiera (tabla informacion_financiera)
        infoFinanciera: {
          ingresosMensuales: String(formData.infoFinanciera.ingresosMensualesAgropecuaria || 0),
          ingresosMensualesAgropecuaria: formData.infoFinanciera.ingresosMensualesAgropecuaria,
          ingresosMensualesOtros: formData.infoFinanciera.ingresosMensualesOtros,
          egresosMensuales: formData.infoFinanciera.egresosMensuales,
          activosTotales: formData.infoFinanciera.activosTotales,
          activosAgropecuaria: formData.infoFinanciera.activosAgropecuaria,
          pasivosTotales: formData.infoFinanciera.pasivosTotales,
          fuentesIngreso: ['Actividad agropecuaria'],
          accesoCredito: false,
        },
        
        // 8. Archivos
        archivos: {
          fotoBeneficiario: formData.archivos.fotoBeneficiario,
          foto1Url: formData.archivos.foto1Url,
          foto2Url: formData.archivos.foto2Url,
          firmaProductorUrl: formData.archivos.firmaProductorUrl,
        },
        fotoProductorUrl: formData.archivos.fotoBeneficiario,
        fotoPredioUrl: formData.archivos.foto1Url,
        
        // 9. Autorizacion
        autorizacion: {
          autorizaTratamientoDatos: formData.autorizaciones.autorizacionDatosPersonales,
          firmaDigital: formData.archivos.firmaProductorUrl,
          fechaAutorizacion: new Date().toISOString(),
        },
        fotoProductor: formData.archivos.fotoBeneficiario,
      }
      
      const saved = await saveCaracterizacion(dataToSave)
      toast.success("Caracterizacion guardada exitosamente", {
        description: `Radicado: ${saved.radicadoLocal}`,
        duration: 4000,
      })
      router.push(`/exito?radicado=${saved.radicadoLocal}`)
    } catch (error) {
      console.error("Error saving:", error)
      toast.error("Error al guardar el formulario", {
        description: "Intente nuevamente. Si el problema persiste, descargue un respaldo.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Renderizar paso actual
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card className="border-border/50 bg-card/95 backdrop-blur-md">
            <CardHeader className="border-b border-border/30 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Datos de la Visita</CardTitle>
                  <CardDescription>Información del técnico y formulario</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="fechaVisita">Fecha de Visita <span className="text-red-500">*</span></Label>
                  <Input
                    id="fechaVisita"
                    type="date"
                    value={formData.visita.fechaVisita}
                    onChange={(e) => updateField("visita", "fechaVisita", e.target.value)}
                    className={`h-11 ${errors['visita.fechaVisita'] ? 'border-red-500' : ''}`}
                  />
                  {errors['visita.fechaVisita'] && <p className="text-sm text-red-500">{errors['visita.fechaVisita']}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nombreTecnico">Nombre del Tecnico <span className="text-red-500">*</span></Label>
                  <Input
                    id="nombreTecnico"
                    value={formData.visita.nombreTecnico}
                    onChange={(e) => updateField("visita", "nombreTecnico", e.target.value)}
                    placeholder="Nombre completo del tecnico"
                    className={`h-11 ${errors['visita.nombreTecnico'] ? 'border-red-500' : ''}`}
                  />
                  {errors['visita.nombreTecnico'] && <p className="text-sm text-red-500">{errors['visita.nombreTecnico']}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="codigoFormulario">Código Formulario</Label>
                  <Input
                    id="codigoFormulario"
                    value={formData.visita.codigoFormulario}
                    onChange={(e) => updateField("visita", "codigoFormulario", e.target.value)}
                    placeholder="Ej: FORM-001"
                    className="h-11"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="versionFormulario">Versión Formulario</Label>
                  <Input
                    id="versionFormulario"
                    value={formData.visita.versionFormulario}
                    onChange={(e) => updateField("visita", "versionFormulario", e.target.value)}
                    placeholder="Ej: 1.0"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fechaEmisionFormulario">Fecha Emisión Formulario</Label>
                  <Input
                    id="fechaEmisionFormulario"
                    type="date"
                    value={formData.visita.fechaEmisionFormulario}
                    onChange={(e) => updateField("visita", "fechaEmisionFormulario", e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case 2:
        return (
          <Card className="border-border/50 bg-card/95 backdrop-blur-md">
            <CardHeader className="border-b border-border/30 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Datos del Beneficiario</CardTitle>
                  <CardDescription>Información personal del núcleo familiar</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Alerta de errores */}
              {showErrors && Object.keys(errors).length > 0 && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-red-700 dark:text-red-400 text-sm font-medium">Por favor corrija los siguientes errores:</p>
                  <ul className="text-red-600 dark:text-red-400 text-sm mt-2 list-disc list-inside">
                    {Object.values(errors).map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nombres">Nombres <span className="text-red-500">*</span></Label>
                  <Input
                    id="nombres"
                    value={formData.beneficiario.nombres}
                    onChange={(e) => updateField("beneficiario", "nombres", e.target.value)}
                    placeholder="Nombres del beneficiario"
                    className={`h-11 ${errors['beneficiario.nombres'] ? 'border-red-500' : ''}`}
                  />
                  {errors['beneficiario.nombres'] && <p className="text-sm text-red-500">{errors['beneficiario.nombres']}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellidos">Apellidos <span className="text-red-500">*</span></Label>
                  <Input
                    id="apellidos"
                    value={formData.beneficiario.apellidos}
                    onChange={(e) => updateField("beneficiario", "apellidos", e.target.value)}
                    placeholder="Apellidos del beneficiario"
                    className={`h-11 ${errors['beneficiario.apellidos'] ? 'border-red-500' : ''}`}
                  />
                  {errors['beneficiario.apellidos'] && <p className="text-sm text-red-500">{errors['beneficiario.apellidos']}</p>}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="tipoDocumento">Tipo Documento <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.beneficiario.tipoDocumento}
                    onValueChange={(value) => updateField("beneficiario", "tipoDocumento", value)}
                  >
                    <SelectTrigger className={`h-11 ${errors['beneficiario.tipoDocumento'] ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder="Seleccione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CC">Cedula de Ciudadania</SelectItem>
                      <SelectItem value="CE">Cedula de Extranjeria</SelectItem>
                      <SelectItem value="TI">Tarjeta de Identidad</SelectItem>
                      <SelectItem value="PAS">Pasaporte</SelectItem>
                      <SelectItem value="NIT">NIT</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors['beneficiario.tipoDocumento'] && <p className="text-sm text-red-500">{errors['beneficiario.tipoDocumento']}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numeroDocumento">Numero Documento <span className="text-red-500">*</span></Label>
                  <Input
                    id="numeroDocumento"
                    value={formData.beneficiario.numeroDocumento}
                    onChange={(e) => updateField("beneficiario", "numeroDocumento", e.target.value)}
                    placeholder="Numero de documento"
                    className={`h-11 ${errors['beneficiario.numeroDocumento'] ? 'border-red-500' : ''}`}
                  />
                  {errors['beneficiario.numeroDocumento'] && <p className="text-sm text-red-500">{errors['beneficiario.numeroDocumento']}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edad">Edad</Label>
                  <Input
                    id="edad"
                    type="number"
                    min="0"
                    max="120"
                    value={formData.beneficiario.edad || ""}
                    onChange={(e) => updateField("beneficiario", "edad", e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Anos"
                    className="h-11"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="telefono">Telefono <span className="text-red-500">*</span></Label>
                  <Input
                    id="telefono"
                    value={formData.beneficiario.telefono}
                    onChange={(e) => updateField("beneficiario", "telefono", e.target.value)}
                    placeholder="Numero de contacto (7-10 digitos)"
                    className={`h-11 ${errors['beneficiario.telefono'] ? 'border-red-500' : ''}`}
                  />
                  {errors['beneficiario.telefono'] && <p className="text-sm text-red-500">{errors['beneficiario.telefono']}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="correo">Correo Electronico</Label>
                  <Input
                    id="correo"
                    type="email"
                    value={formData.beneficiario.correo}
                    onChange={(e) => updateField("beneficiario", "correo", e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ocupacionPrincipal">Ocupación Principal</Label>
                  <Input
                    id="ocupacionPrincipal"
                    value={formData.beneficiario.ocupacionPrincipal}
                    onChange={(e) => updateField("beneficiario", "ocupacionPrincipal", e.target.value)}
                    placeholder="Ej: Agricultor"
                    className="h-11"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case 3:
        return (
          <Card className="border-border/50 bg-card/95 backdrop-blur-md">
            <CardHeader className="border-b border-border/30 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Datos del Predio</CardTitle>
                  <CardDescription>Ubicación y tenencia del predio</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Alerta de errores */}
              {showErrors && Object.keys(errors).length > 0 && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-red-700 dark:text-red-400 text-sm font-medium">Por favor corrija los siguientes errores:</p>
                  <ul className="text-red-600 dark:text-red-400 text-sm mt-2 list-disc list-inside">
                    {Object.values(errors).map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="nombrePredio">Nombre del Predio <span className="text-red-500">*</span></Label>
                  <Input
                    id="nombrePredio"
                    value={formData.predio.nombrePredio}
                    onChange={(e) => updateField("predio", "nombrePredio", e.target.value)}
                    placeholder="Nombre del predio"
                    className={`h-11 ${errors['predio.nombrePredio'] ? 'border-red-500' : ''}`}
                  />
                  {errors['predio.nombrePredio'] && <p className="text-sm text-red-500">{errors['predio.nombrePredio']}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="departamento">Departamento</Label>
                  <Input
                    id="departamento"
                    value={formData.predio.departamento}
                    disabled
                    className="h-11 bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="municipio">Municipio <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.predio.municipio}
                    onValueChange={(value) => updateField("predio", "municipio", value)}
                  >
                    <SelectTrigger className={`h-11 ${errors['predio.municipio'] ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder="Seleccione municipio" />
                    </SelectTrigger>
                    <SelectContent>
                      {municipiosSantander.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors['predio.municipio'] && <p className="text-sm text-red-500">{errors['predio.municipio']}</p>}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="vereda">Vereda <span className="text-red-500">*</span></Label>
                  <Input
                    id="vereda"
                    value={formData.predio.vereda}
                    onChange={(e) => updateField("predio", "vereda", e.target.value)}
                    placeholder="Nombre de la vereda"
                    className={`h-11 ${errors['predio.vereda'] ? 'border-red-500' : ''}`}
                  />
                  {errors['predio.vereda'] && <p className="text-sm text-red-500">{errors['predio.vereda']}</p>}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input
                    id="direccion"
                    value={formData.predio.direccion}
                    onChange={(e) => updateField("predio", "direccion", e.target.value)}
                    placeholder="Dirección del predio"
                    className="h-11"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="codigoCatastral">Código Catastral / Matrícula</Label>
                  <Input
                    id="codigoCatastral"
                    value={formData.predio.codigoCatastral}
                    onChange={(e) => updateField("predio", "codigoCatastral", e.target.value)}
                    placeholder="Número predial"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipoTenencia">Tipo de Tenencia <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.predio.tipoTenencia}
                    onValueChange={(value) => updateField("predio", "tipoTenencia", value)}
                  >
                    <SelectTrigger className={`h-11 ${errors['predio.tipoTenencia'] ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder="Seleccione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Propia">Propia</SelectItem>
                      <SelectItem value="Posesion">Posesion</SelectItem>
                      <SelectItem value="Arriendo">Arriendo</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors['predio.tipoTenencia'] && <p className="text-sm text-red-500">{errors['predio.tipoTenencia']}</p>}
                </div>
                {formData.predio.tipoTenencia === "Otro" && (
                  <div className="space-y-2">
                    <Label htmlFor="tipoTenenciaOtro">Especifique</Label>
                    <Input
                      id="tipoTenenciaOtro"
                      value={formData.predio.tipoTenenciaOtro}
                      onChange={(e) => updateField("predio", "tipoTenenciaOtro", e.target.value)}
                      placeholder="Otro tipo de tenencia"
                      className="h-11"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="documentoTenencia">Documento de Tenencia</Label>
                  <Input
                    id="documentoTenencia"
                    value={formData.predio.documentoTenencia}
                    onChange={(e) => updateField("predio", "documentoTenencia", e.target.value)}
                    placeholder="Documento que acredita"
                    className="h-11"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="areaTotalHectareas">Área Total (ha)</Label>
                  <Input
                    id="areaTotalHectareas"
                    type="number"
                    step="0.01"
                    value={formData.predio.areaTotalHectareas || ""}
                    onChange={(e) => updateField("predio", "areaTotalHectareas", e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="Hectáreas"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="areaProductivaHectareas">Área Productiva (ha)</Label>
                  <Input
                    id="areaProductivaHectareas"
                    type="number"
                    step="0.01"
                    value={formData.predio.areaProductivaHectareas || ""}
                    onChange={(e) => updateField("predio", "areaProductivaHectareas", e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="Hectáreas"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="altitudMsnm">Altitud (msnm)</Label>
                  <Input
                    id="altitudMsnm"
                    type="number"
                    value={formData.predio.altitudMsnm || ""}
                    onChange={(e) => updateField("predio", "altitudMsnm", e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="Metros sobre nivel del mar"
                    className="h-11"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="viveEnPredio">¿Vive en el Predio?</Label>
                  <Select
                    value={formData.predio.viveEnPredio}
                    onValueChange={(value) => updateField("predio", "viveEnPredio", value)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Seleccione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Si">Sí</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                      <SelectItem value="Cerca">Cerca</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 pt-8">
                  <Checkbox
                    id="tieneVivienda"
                    checked={formData.predio.tieneVivienda}
                    onCheckedChange={(checked) => updateField("predio", "tieneVivienda", checked)}
                  />
                  <Label htmlFor="tieneVivienda">El predio tiene vivienda</Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cultivosExistentes">Cultivos Existentes</Label>
                <Textarea
                  id="cultivosExistentes"
                  value={formData.predio.cultivosExistentes}
                  onChange={(e) => updateField("predio", "cultivosExistentes", e.target.value)}
                  placeholder="Descripción de los cultivos actuales en el predio"
                  rows={3}
                />
              </div>
              
              {/* Mapa de ubicación */}
              <div className="space-y-2">
                <Label>Ubicación del Predio</Label>
                <LocationPicker
                  onLocationChange={(loc) => {
                    setFormData(prev => ({
                      ...prev,
                      predio: {
                        ...prev.predio,
                        latitud: loc.latitud,
                        longitud: loc.longitud,
                      }
                    }))
                  }}
                  initialLocation={{
                    latitud: formData.predio.latitud,
                    longitud: formData.predio.longitud,
                    tipoUbicacion: "punto",
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )

      case 4:
        return (
          <Card className="border-border/50 bg-card/95 backdrop-blur-md">
            <CardHeader className="border-b border-border/30 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Mountain className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Caracterización del Predio</CardTitle>
                  <CardDescription>Características físicas y acceso</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Alerta de errores */}
              {showErrors && Object.keys(errors).length > 0 && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-red-700 dark:text-red-400 text-sm font-medium">Por favor corrija los siguientes errores:</p>
                  <ul className="text-red-600 dark:text-red-400 text-sm mt-2 list-disc list-inside">
                    {Object.values(errors).map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="rutaAcceso">Ruta de Acceso desde el Casco Urbano</Label>
                <Textarea
                  id="rutaAcceso"
                  value={formData.caracterizacion.rutaAcceso}
                  onChange={(e) => updateField("caracterizacion", "rutaAcceso", e.target.value)}
                  placeholder="Describa la ruta de acceso al predio"
                  rows={3}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="distanciaKm">Distancia (km)</Label>
                  <Input
                    id="distanciaKm"
                    type="number"
                    step="0.1"
                    value={formData.caracterizacion.distanciaKm || ""}
                    onChange={(e) => updateField("caracterizacion", "distanciaKm", e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="Kilómetros"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tiempoAcceso">Tiempo de Acceso</Label>
                  <Input
                    id="tiempoAcceso"
                    value={formData.caracterizacion.tiempoAcceso}
                    onChange={(e) => updateField("caracterizacion", "tiempoAcceso", e.target.value)}
                    placeholder="Ej: 30 minutos"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="temperaturaCelsius">Temperatura Promedio (°C)</Label>
                  <Input
                    id="temperaturaCelsius"
                    type="number"
                    step="0.1"
                    value={formData.caracterizacion.temperaturaCelsius || ""}
                    onChange={(e) => updateField("caracterizacion", "temperaturaCelsius", e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="Grados"
                    className="h-11"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="mesesLluvia">Meses de Lluvia</Label>
                  <Input
                    id="mesesLluvia"
                    value={formData.caracterizacion.mesesLluvia}
                    onChange={(e) => updateField("caracterizacion", "mesesLluvia", e.target.value)}
                    placeholder="Ej: Marzo, Abril, Mayo, Octubre, Noviembre"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="topografia">Topografia <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.caracterizacion.topografia}
                    onValueChange={(value) => updateField("caracterizacion", "topografia", value)}
                  >
                    <SelectTrigger className={`h-11 ${errors['caracterizacion.topografia'] ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder="Seleccione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0-25% Plana">0-25% Plana</SelectItem>
                      <SelectItem value="26-50% Inclinada">26-50% Inclinada</SelectItem>
                      <SelectItem value="51%> Pendiente">51%{'>'} Pendiente</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors['caracterizacion.topografia'] && <p className="text-sm text-red-500">{errors['caracterizacion.topografia']}</p>}
                </div>
              </div>
              
              {/* Cobertura vegetal */}
              <div className="space-y-3">
                <Label>Cobertura Vegetal</Label>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="coberturaBosque"
                      checked={formData.caracterizacion.coberturaBosque}
                      onCheckedChange={(checked) => updateField("caracterizacion", "coberturaBosque", checked)}
                    />
                    <Label htmlFor="coberturaBosque">Bosque</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="coberturaCultivos"
                      checked={formData.caracterizacion.coberturaCultivos}
                      onCheckedChange={(checked) => updateField("caracterizacion", "coberturaCultivos", checked)}
                    />
                    <Label htmlFor="coberturaCultivos">Cultivos</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="coberturaPastos"
                      checked={formData.caracterizacion.coberturaPastos}
                      onCheckedChange={(checked) => updateField("caracterizacion", "coberturaPastos", checked)}
                    />
                    <Label htmlFor="coberturaPastos">Pastos</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="coberturaRastrojo"
                      checked={formData.caracterizacion.coberturaRastrojo}
                      onCheckedChange={(checked) => updateField("caracterizacion", "coberturaRastrojo", checked)}
                    />
                    <Label htmlFor="coberturaRastrojo">Rastrojo</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case 5:
        return (
          <Card className="border-border/50 bg-card/95 backdrop-blur-md">
            <CardHeader className="border-b border-border/30 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Droplets className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Agua y Riesgos</CardTitle>
                  <CardDescription>Fuentes de agua y riesgos identificados</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Alerta de errores */}
              {showErrors && Object.keys(errors).length > 0 && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-red-700 dark:text-red-400 text-sm font-medium">Por favor corrija los siguientes errores:</p>
                  <ul className="text-red-600 dark:text-red-400 text-sm mt-2 list-disc list-inside">
                    {Object.values(errors).map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}
              {/* Abastecimiento de agua */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Fuentes de Abastecimiento de Agua <span className="text-red-500">*</span></Label>
                {errors['abastecimientoAgua'] && <p className="text-sm text-red-500">{errors['abastecimientoAgua']}</p>}
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="nacimientoManantial"
                      checked={formData.abastecimientoAgua.nacimientoManantial}
                      onCheckedChange={(checked) => updateField("abastecimientoAgua", "nacimientoManantial", checked)}
                    />
                    <Label htmlFor="nacimientoManantial">Nacimiento/Manantial</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="rioQuebrada"
                      checked={formData.abastecimientoAgua.rioQuebrada}
                      onCheckedChange={(checked) => updateField("abastecimientoAgua", "rioQuebrada", checked)}
                    />
                    <Label htmlFor="rioQuebrada">Río/Quebrada</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="pozo"
                      checked={formData.abastecimientoAgua.pozo}
                      onCheckedChange={(checked) => updateField("abastecimientoAgua", "pozo", checked)}
                    />
                    <Label htmlFor="pozo">Pozo</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="acueductoRural"
                      checked={formData.abastecimientoAgua.acueductoRural}
                      onCheckedChange={(checked) => updateField("abastecimientoAgua", "acueductoRural", checked)}
                    />
                    <Label htmlFor="acueductoRural">Acueducto Rural</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="canalDistritoRiego"
                      checked={formData.abastecimientoAgua.canalDistritoRiego}
                      onCheckedChange={(checked) => updateField("abastecimientoAgua", "canalDistritoRiego", checked)}
                    />
                    <Label htmlFor="canalDistritoRiego">Canal/Distrito Riego</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="jagueyReservorio"
                      checked={formData.abastecimientoAgua.jagueyReservorio}
                      onCheckedChange={(checked) => updateField("abastecimientoAgua", "jagueyReservorio", checked)}
                    />
                    <Label htmlFor="jagueyReservorio">Jagüey/Reservorio</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="aguaLluvia"
                      checked={formData.abastecimientoAgua.aguaLluvia}
                      onCheckedChange={(checked) => updateField("abastecimientoAgua", "aguaLluvia", checked)}
                    />
                    <Label htmlFor="aguaLluvia">Agua Lluvia</Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otraFuente">Otra Fuente</Label>
                  <Input
                    id="otraFuente"
                    value={formData.abastecimientoAgua.otraFuente}
                    onChange={(e) => updateField("abastecimientoAgua", "otraFuente", e.target.value)}
                    placeholder="Especifique otra fuente de agua"
                    className="h-11"
                  />
                </div>
              </div>
              
              {/* Riesgos */}
              <div className="space-y-3">
                <Label className="text-base font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Riesgos Identificados
                </Label>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="inundacion"
                      checked={formData.riesgos.inundacion}
                      onCheckedChange={(checked) => updateField("riesgos", "inundacion", checked)}
                    />
                    <Label htmlFor="inundacion">Inundación</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="sequia"
                      checked={formData.riesgos.sequia}
                      onCheckedChange={(checked) => updateField("riesgos", "sequia", checked)}
                    />
                    <Label htmlFor="sequia">Sequía</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="viento"
                      checked={formData.riesgos.viento}
                      onCheckedChange={(checked) => updateField("riesgos", "viento", checked)}
                    />
                    <Label htmlFor="viento">Vientos Fuertes</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="helada"
                      checked={formData.riesgos.helada}
                      onCheckedChange={(checked) => updateField("riesgos", "helada", checked)}
                    />
                    <Label htmlFor="helada">Heladas</Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otrosRiesgos">Otros Riesgos</Label>
                  <Textarea
                    id="otrosRiesgos"
                    value={formData.riesgos.otrosRiesgos}
                    onChange={(e) => updateField("riesgos", "otrosRiesgos", e.target.value)}
                    placeholder="Describa otros riesgos identificados"
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case 6:
        return (
          <Card className="border-border/50 bg-card/95 backdrop-blur-md">
            <CardHeader className="border-b border-border/30 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sprout className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Área Productiva</CardTitle>
                  <CardDescription>Producción y comercialización</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Alerta de errores */}
              {showErrors && Object.keys(errors).length > 0 && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-red-700 dark:text-red-400 text-sm font-medium">Por favor corrija los siguientes errores:</p>
                  <ul className="text-red-600 dark:text-red-400 text-sm mt-2 list-disc list-inside">
                    {Object.values(errors).map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sistemaProductivo">Sistema Productivo <span className="text-red-500">*</span></Label>
                  <Input
                    id="sistemaProductivo"
                    value={formData.areaProductiva.sistemaProductivo}
                    onChange={(e) => updateField("areaProductiva", "sistemaProductivo", e.target.value)}
                    placeholder="Ej: Cafe, Cacao, Ganaderia"
                    className={`h-11 ${errors['areaProductiva.sistemaProductivo'] ? 'border-red-500' : ''}`}
                  />
                  {errors['areaProductiva.sistemaProductivo'] && <p className="text-sm text-red-500">{errors['areaProductiva.sistemaProductivo']}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estadoCultivo">Estado del Cultivo</Label>
                  <Select
                    value={formData.areaProductiva.estadoCultivo}
                    onValueChange={(value) => updateField("areaProductiva", "estadoCultivo", value)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Seleccione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tecnificado">Tecnificado</SelectItem>
                      <SelectItem value="En mal estado">En mal estado</SelectItem>
                      <SelectItem value="NS/NR">NS/NR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="caracterizacionCultivo">Caracterización del Cultivo</Label>
                <Textarea
                  id="caracterizacionCultivo"
                  value={formData.areaProductiva.caracterizacionCultivo}
                  onChange={(e) => updateField("areaProductiva", "caracterizacionCultivo", e.target.value)}
                  placeholder="Describa las características del cultivo"
                  rows={3}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cantidadProduccion">Cantidad de Producción</Label>
                  <Input
                    id="cantidadProduccion"
                    value={formData.areaProductiva.cantidadProduccion}
                    onChange={(e) => updateField("areaProductiva", "cantidadProduccion", e.target.value)}
                    placeholder="Ej: 500 kg/mes"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ingresoMensualVentas">Ingreso Mensual por Ventas ($)</Label>
                  <Input
                    id="ingresoMensualVentas"
                    type="number"
                    value={formData.areaProductiva.ingresoMensualVentas || ""}
                    onChange={(e) => updateField("areaProductiva", "ingresoMensualVentas", e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="Pesos colombianos"
                    className="h-11"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3 pt-2">
                  <Checkbox
                    id="tieneInfraestructuraProcesamiento"
                    checked={formData.areaProductiva.tieneInfraestructuraProcesamiento}
                    onCheckedChange={(checked) => updateField("areaProductiva", "tieneInfraestructuraProcesamiento", checked)}
                  />
                  <Label htmlFor="tieneInfraestructuraProcesamiento">Tiene infraestructura de procesamiento</Label>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <Checkbox
                    id="interesadoPrograma"
                    checked={formData.areaProductiva.interesadoPrograma}
                    onCheckedChange={(checked) => updateField("areaProductiva", "interesadoPrograma", checked)}
                  />
                  <Label htmlFor="interesadoPrograma">Interesado en AgroSantander360</Label>
                </div>
              </div>
              {formData.areaProductiva.tieneInfraestructuraProcesamiento && (
                <div className="space-y-2">
                  <Label htmlFor="estructuras">Describa las Estructuras</Label>
                  <Textarea
                    id="estructuras"
                    value={formData.areaProductiva.estructuras}
                    onChange={(e) => updateField("areaProductiva", "estructuras", e.target.value)}
                    placeholder="Describa la infraestructura de procesamiento"
                    rows={2}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="dondeComercializa">¿Dónde Comercializa?</Label>
                <Textarea
                  id="dondeComercializa"
                  value={formData.areaProductiva.dondeComercializa}
                  onChange={(e) => updateField("areaProductiva", "dondeComercializa", e.target.value)}
                  placeholder="Lugares de comercialización (mercado local, asociación, exportación, etc.)"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        )

      case 7:
        return (
          <Card className="border-border/50 bg-card/95 backdrop-blur-md">
            <CardHeader className="border-b border-border/30 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Información Financiera</CardTitle>
                  <CardDescription>Ingresos, egresos y activos</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="ingresosMensualesAgropecuaria">Ingresos Agropecuarios ($)</Label>
                  <Input
                    id="ingresosMensualesAgropecuaria"
                    type="number"
                    value={formData.infoFinanciera.ingresosMensualesAgropecuaria || ""}
                    onChange={(e) => updateField("infoFinanciera", "ingresosMensualesAgropecuaria", e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="Mensuales"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ingresosMensualesOtros">Otros Ingresos ($)</Label>
                  <Input
                    id="ingresosMensualesOtros"
                    type="number"
                    value={formData.infoFinanciera.ingresosMensualesOtros || ""}
                    onChange={(e) => updateField("infoFinanciera", "ingresosMensualesOtros", e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="Mensuales"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="egresosMensuales">Egresos Mensuales ($)</Label>
                  <Input
                    id="egresosMensuales"
                    type="number"
                    value={formData.infoFinanciera.egresosMensuales || ""}
                    onChange={(e) => updateField("infoFinanciera", "egresosMensuales", e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="Mensuales"
                    className="h-11"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="activosTotales">Activos Totales ($)</Label>
                  <Input
                    id="activosTotales"
                    type="number"
                    value={formData.infoFinanciera.activosTotales || ""}
                    onChange={(e) => updateField("infoFinanciera", "activosTotales", e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="Total de activos"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="activosAgropecuaria">Activos Agropecuarios ($)</Label>
                  <Input
                    id="activosAgropecuaria"
                    type="number"
                    value={formData.infoFinanciera.activosAgropecuaria || ""}
                    onChange={(e) => updateField("infoFinanciera", "activosAgropecuaria", e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="Activos agropecuarios"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pasivosTotales">Pasivos Totales ($)</Label>
                  <Input
                    id="pasivosTotales"
                    type="number"
                    value={formData.infoFinanciera.pasivosTotales || ""}
                    onChange={(e) => updateField("infoFinanciera", "pasivosTotales", e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="Total de deudas"
                    className="h-11"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case 8:
        return (
          <Card className="border-border/50 bg-card/95 backdrop-blur-md">
            <CardHeader className="border-b border-border/30 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Fotos y Firma</CardTitle>
                  <CardDescription>Evidencia fotográfica y firma del productor</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Alerta de errores */}
              {showErrors && Object.keys(errors).length > 0 && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-red-700 dark:text-red-400 text-sm font-medium">Por favor corrija los siguientes errores:</p>
                  <ul className="text-red-600 dark:text-red-400 text-sm mt-2 list-disc list-inside">
                    {Object.values(errors).map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}
              {/* Foto del beneficiario */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Foto del Beneficiario</Label>
                <PhotoUpload
                  onPhotoCapture={(dataUrl) => updateField("archivos", "fotoBeneficiario", dataUrl)}
                  currentPhoto={formData.archivos.fotoBeneficiario}
                  label="Foto del Productor"
                />
              </div>

              {/* Fotos del predio */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <Label className="text-base font-medium">Foto 1 del Predio</Label>
                  <PhotoUpload
                    onPhotoCapture={(dataUrl) => updateField("archivos", "foto1Url", dataUrl)}
                    currentPhoto={formData.archivos.foto1Url}
                    label="Foto 1"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-base font-medium">Foto 2 del Predio</Label>
                  <PhotoUpload
                    onPhotoCapture={(dataUrl) => updateField("archivos", "foto2Url", dataUrl)}
                    currentPhoto={formData.archivos.foto2Url}
                    label="Foto 2"
                  />
                </div>
              </div>

              {/* Firma del productor */}
              <div className="space-y-3">
                <Label className="text-base font-medium flex items-center gap-2">
                  <FileSignature className="h-5 w-5" />
                  Firma del Productor <span className="text-red-500">*</span>
                </Label>
                <SignaturePad
                  onSignatureChange={(dataUrl) => updateField("archivos", "firmaProductorUrl", dataUrl)}
                  currentSignature={formData.archivos.firmaProductorUrl}
                />
                {errors['archivos.firmaProductorUrl'] && <p className="text-sm text-red-500">{errors['archivos.firmaProductorUrl']}</p>}
              </div>
            </CardContent>
          </Card>
        )

      case 9:
        return (
          <Card className="border-border/50 bg-card/95 backdrop-blur-md">
            <CardHeader className="border-b border-border/30 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <FileCheck className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Autorización y Envío</CardTitle>
                  <CardDescription>Consentimiento para tratamiento de datos</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Alerta de errores */}
              {showErrors && Object.keys(errors).length > 0 && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-red-700 dark:text-red-400 text-sm font-medium">Por favor corrija los siguientes errores:</p>
                  <ul className="text-red-600 dark:text-red-400 text-sm mt-2 list-disc list-inside">
                    {Object.values(errors).map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}
              {/* Observaciones */}
              <div className="space-y-2">
                <Label htmlFor="observaciones">Observaciones Generales</Label>
                <Textarea
                  id="observaciones"
                  value={formData.observaciones}
                  onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                  placeholder="Observaciones adicionales sobre la visita"
                  rows={4}
                />
              </div>

              {/* Autorizaciones */}
              <div className={`space-y-4 rounded-lg border p-4 ${errors['autorizaciones.autorizacionDatosPersonales'] ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : 'border-border/50 bg-muted/30'}`}>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="autorizacionDatosPersonales"
                    checked={formData.autorizaciones.autorizacionDatosPersonales}
                    onCheckedChange={(checked) => updateField("autorizaciones", "autorizacionDatosPersonales", checked)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="autorizacionDatosPersonales" className="font-medium">
                      Autorizacion de Tratamiento de Datos Personales <span className="text-red-500">*</span>
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Autorizo el tratamiento de mis datos personales conforme a la Ley 1581 de 2012 
                      y demas normas concordantes, para los fines del proyecto AgroSantander360.
                    </p>
                    {errors['autorizaciones.autorizacionDatosPersonales'] && <p className="text-sm text-red-500 mt-2">{errors['autorizaciones.autorizacionDatosPersonales']}</p>}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="autorizacionConsultaCrediticia"
                    checked={formData.autorizaciones.autorizacionConsultaCrediticia}
                    onCheckedChange={(checked) => updateField("autorizaciones", "autorizacionConsultaCrediticia", checked)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="autorizacionConsultaCrediticia" className="font-medium">
                      Autorización de Consulta Crediticia
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Autorizo la consulta de mi historial crediticio en las centrales de riesgo 
                      para la evaluación de posibles beneficios del programa.
                    </p>
                  </div>
                </div>
              </div>

              {/* Resumen */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <h4 className="font-medium text-primary mb-2">Resumen del Formulario</h4>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <p><strong>Beneficiario:</strong> {formData.beneficiario.nombres} {formData.beneficiario.apellidos}</p>
                  <p><strong>Documento:</strong> {formData.beneficiario.tipoDocumento} {formData.beneficiario.numeroDocumento}</p>
                  <p><strong>Municipio:</strong> {formData.predio.municipio}, {formData.predio.departamento}</p>
                  <p><strong>Predio:</strong> {formData.predio.nombrePredio || "Sin nombre"}</p>
                  <p><strong>Técnico:</strong> {formData.visita.nombreTecnico}</p>
                </div>
              </div>

              {/* Botón de envío */}
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.autorizaciones.autorizacionDatosPersonales}
                className="w-full h-12 text-base"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-5 w-5" />
                    Guardar Caracterización
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Sprout className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">AgroSantander360</h1>
              <p className="text-xs text-muted-foreground">Caracterización Predial</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span className="hidden sm:inline">Paso {currentStep} de {steps.length}</span>
            <span className="sm:hidden">{currentStep}/{steps.length}</span>
            <span className="mx-2 hidden sm:inline">|</span>
            <span className="hidden sm:inline">{steps[currentStep - 1].title}</span>
          </div>
          <div className="flex items-center gap-2">
            <ConnectionStatus showLabel={false} className="hidden sm:flex" />
            <SyncButton variant="compact" />
            <Button variant="outline" size="icon" asChild className="h-9 w-9">
              <Link href="/dashboard">
                <Home className="h-4 w-4" />
              </Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="sticky top-16 z-40 border-b border-border/40 bg-background/95 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
            {steps.map((step) => {
              const Icon = step.icon
              const isActive = step.id === currentStep
              const isCompleted = step.id < currentStep
              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex flex-col items-center gap-1 min-w-[60px] p-2 rounded-lg transition-colors ${
                    isActive ? "bg-primary/10" : isCompleted ? "bg-muted" : ""
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isCompleted
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className={`text-[10px] text-center leading-tight ${isActive ? "font-medium" : ""}`}>
                    {step.title}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-4 py-6">
        {renderStep()}

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>

          {currentStep < steps.length && (
            <Button onClick={nextStep} className="gap-2">
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </main>
    </div>
  )
}
