"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
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
import { generateCaracterizacionPDF, pdfFromFormData } from "@/lib/generate-pdf"
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
  FileSignature,
  Lock,
  Info,
  CheckCircle,
  Cloud,
  Download,
  Plus,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ThemeToggle } from "./theme-toggle"
import { UserProfile } from "./user-profile"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import Link from "next/link"
import { Turnstile } from "@marsidev/react-turnstile"
import { LegalDocumentModal, LEGAL_DOCUMENTS } from "./legal-document-modal"

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
    fechaNacimiento: string
    edad: number | null
    genero: string
    personasACargo: number | null
    telefono: string
    correo: string
    ocupacionPrincipal: string
  }
  // 2b. Contacto secundario / acudiente
  contactoSecundario: {
    nombre: string
    telefono: string
    parentesco: string
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
    poligono?: [number, number][]
    tipoUbicacion?: 'punto' | 'poligono'
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
    fotoDocFrontalUrl: string
    fotoDocTraseraUrl: string
  }
  // 10. Autorizaciones
  autorizaciones: {
    autorizacionDatosPersonales: boolean
    autorizacionConsultaCrediticia: boolean
    autorizacionAvisoPrivacidad: boolean
    autorizacionUsoImagen: boolean
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
    fechaNacimiento: "",
    edad: null,
    genero: "",
    personasACargo: null,
    telefono: "",
    correo: "",
    ocupacionPrincipal: "",
  },
  contactoSecundario: {
    nombre: "",
    telefono: "",
    parentesco: "",
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
    fotoDocFrontalUrl: "",
    fotoDocTraseraUrl: "",
  },
  autorizaciones: {
    autorizacionDatosPersonales: false,
    autorizacionConsultaCrediticia: false,
    autorizacionAvisoPrivacidad: false,
    autorizacionUsoImagen: false,
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

const calcularEdad = (fechaNacimiento: string): number | null => {
  if (!fechaNacimiento) return null
  const dob = new Date(fechaNacimiento)
  if (isNaN(dob.getTime())) return null
  const today = new Date()
  const age = Math.floor((today.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  return age >= 0 && age <= 120 ? age : null
}

// Bloquea caracteres no numéricos en campos de solo dígitos
const soloNumeros = (e: React.KeyboardEvent<HTMLInputElement>) => {
  const permitidos = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Enter', 'Home', 'End']
  if (!permitidos.includes(e.key) && !/^\d$/.test(e.key) && !e.ctrlKey && !e.metaKey) {
    e.preventDefault()
  }
}

export function CharacterizationFormComplete({
  initialData,
  isEdit = false,
  visitaId,
}: {
  initialData?: Partial<FormData>
  isEdit?: boolean
  visitaId?: string
} = {}) {
  const router = useRouter()
  const { user, profile, isAuthenticated } = useAuth()
  const isAsesor = isAuthenticated && (profile?.rol === 'asesor' || profile?.rol === 'admin')
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<FormData>(() => {
    if (initialData) {
      // Merge con deep fusion base para asegurar la estructura
      return { ...initialFormData, ...initialData } as FormData
    }
    return initialFormData
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submitLock = useRef(false)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [showErrors, setShowErrors] = useState(false)
  const [submittedData, setSubmittedData] = useState<{ radicado: string; sincronizado: boolean } | null>(null)
  const [edadManual, setEdadManual] = useState(false)

  // Turnstile token (solo requerido para usuarios no autenticados como asesor)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const captchaValid = isAsesor || !!turnstileToken

  // Estado de modales legales (null = ninguno abierto)
  const [legalModalOpen, setLegalModalOpen] = useState<keyof typeof LEGAL_DOCUMENTS | null>(null)

  // Autocompletar desde documento previo (solo cuando está logueado)
  const [buscandoDocumento, setBuscandoDocumento] = useState(false)
  const buscarBeneficiarioPorDocumento = async (documento: string) => {
    if (!isAuthenticated || documento.length < 6) return
    setBuscandoDocumento(true)
    try {
      const res = await fetch(`/api/beneficiario?documento=${encodeURIComponent(documento)}`)
      if (!res.ok) return
      const data = await res.json()
      if (!data.encontrado) return
      const b = data.beneficiario
      setFormData(prev => ({
        ...prev,
        beneficiario: {
          ...prev.beneficiario,
          tipoDocumento: b.tipoDocumento || prev.beneficiario.tipoDocumento,
          nombres: b.nombres || prev.beneficiario.nombres,
          apellidos: b.apellidos || prev.beneficiario.apellidos,
          fechaNacimiento: b.fechaNacimiento || prev.beneficiario.fechaNacimiento,
          edad: b.edad ?? prev.beneficiario.edad,
          genero: b.genero || prev.beneficiario.genero,
          personasACargo: b.personasACargo ?? prev.beneficiario.personasACargo,
          telefono: b.telefono || prev.beneficiario.telefono,
          correo: b.correo || prev.beneficiario.correo,
          ocupacionPrincipal: b.ocupacionPrincipal || prev.beneficiario.ocupacionPrincipal,
        },
        contactoSecundario: {
          nombre: b.contactoSecundario?.nombre || prev.contactoSecundario.nombre,
          telefono: b.contactoSecundario?.telefono || prev.contactoSecundario.telefono,
          parentesco: b.contactoSecundario?.parentesco || prev.contactoSecundario.parentesco,
        },
        ...(b.ultimoPredio && {
          predio: {
            ...prev.predio,
            municipio: b.ultimoPredio.municipio || prev.predio.municipio,
            departamento: b.ultimoPredio.departamento || prev.predio.departamento,
            vereda: b.ultimoPredio.vereda || prev.predio.vereda,
          },
        }),
      }))
      toast.info('Datos autocompletados', {
        description: 'Se encontró un registro previo con este documento y se completaron los campos.',
        duration: 4000,
      })
    } catch {
      // Silenciar errores de red
    } finally {
      setBuscandoDocumento(false)
    }
  }

  // Auto-llenar nombre del técnico si el usuario autenticado es asesor o admin
  useEffect(() => {
    if (isAsesor && profile?.nombre_completo) {
      setFormData(prev => ({
        ...prev,
        visita: {
          ...prev.visita,
          nombreTecnico: profile.nombre_completo,
        },
      }))
    }
  }, [isAsesor, profile?.nombre_completo])

  // Auto-calcular edad desde la fecha de nacimiento (solo si el usuario no la editó manualmente)
  useEffect(() => {
    if (edadManual) return
    const edad = calcularEdad(formData.beneficiario.fechaNacimiento)
    if (edad !== null) {
      setFormData(prev => ({
        ...prev,
        beneficiario: { ...prev.beneficiario, edad },
      }))
    }
  }, [formData.beneficiario.fechaNacimiento, edadManual])

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
        // nombreTecnico solo requerido si hay un asesor logueado (se auto-completa)
        // Si el usuario llena el formulario solo, el campo es opcional
        break

      case 2: // Beneficiario
        if (!formData.beneficiario.nombres.trim()) stepErrors['beneficiario.nombres'] = 'Los nombres son requeridos'
        if (!formData.beneficiario.apellidos.trim()) stepErrors['beneficiario.apellidos'] = 'Los apellidos son requeridos'
        if (!formData.beneficiario.tipoDocumento) stepErrors['beneficiario.tipoDocumento'] = 'El tipo de documento es requerido'
        if (!validateDocument(formData.beneficiario.numeroDocumento)) stepErrors['beneficiario.numeroDocumento'] = 'Número de documento inválido (6-12 dígitos)'
        if (!validatePhone(formData.beneficiario.telefono)) stepErrors['beneficiario.telefono'] = 'Teléfono inválido (7-10 dígitos)'
        if (formData.beneficiario.correo && !validateEmail(formData.beneficiario.correo)) stepErrors['beneficiario.correo'] = 'Correo electrónico inválido'
        break

      case 3: // Predio
        if (!formData.predio.nombrePredio.trim()) stepErrors['predio.nombrePredio'] = 'El nombre del predio es requerido'
        if (!formData.predio.municipio) stepErrors['predio.municipio'] = 'El municipio es requerido'
        if (!formData.predio.vereda.trim()) stepErrors['predio.vereda'] = 'La vereda es requerida'
        if (!formData.predio.tipoTenencia) stepErrors['predio.tipoTenencia'] = 'El tipo de tenencia es requerido'
        if (formData.predio.areaTotalHectareas !== null && formData.predio.areaTotalHectareas < 0) stepErrors['predio.areaTotalHectareas'] = 'El area no puede ser negativa'
        if (!formData.predio.tipoUbicacion) stepErrors['predio.ubicacion'] = 'Debes marcar la ubicación del predio en el mapa'
        break

      case 4: // Caracterizacion
        if (!formData.caracterizacion.topografia) stepErrors['caracterizacion.topografia'] = 'La topografía es requerida'
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
        if (!formData.autorizaciones.autorizacionAvisoPrivacidad) stepErrors['autorizaciones.autorizacionAvisoPrivacidad'] = 'Debe confirmar que ha leído el Aviso de Privacidad y la Política de Tratamiento de Datos'
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

  // Navegar a un paso específico (desde la barra de progreso)
  const goToStep = (targetStep: number) => {
    // Siempre permite ir hacia atrás
    if (targetStep <= currentStep) {
      setShowErrors(false)
      setErrors({})
      setCurrentStep(targetStep)
      return
    }
    // Para ir adelante, validar todos los pasos intermedios
    for (let s = currentStep; s < targetStep; s++) {
      const stepErrors = validateStep(s)
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors)
        setShowErrors(true)
        setCurrentStep(s)
        toast.error(`Completa el paso ${s}: ${steps[s - 1].title}`, {
          description: 'Debes llenar los campos requeridos antes de avanzar',
        })
        return
      }
    }
    setShowErrors(false)
    setErrors({})
    setCurrentStep(targetStep)
  }

  // Validar TODOS los pasos del formulario
  const validateAllSteps = (): { valid: boolean; firstErrorStep: number; errors: ValidationErrors } => {
    const allErrors: ValidationErrors = {}
    let firstErrorStep = 0
    for (let s = 1; s <= steps.length; s++) {
      const stepErrors = validateStep(s)
      if (Object.keys(stepErrors).length > 0 && firstErrorStep === 0) {
        firstErrorStep = s
      }
      Object.assign(allErrors, stepErrors)
    }
    return { valid: Object.keys(allErrors).length === 0, firstErrorStep, errors: allErrors }
  }

  // Enviar formulario — cualquiera puede guardar (público → sync-public, asesor → sync)
  const handleSubmit = async () => {
    if (submitLock.current) return
    submitLock.current = true
    // Validar captcha (solo para usuarios no autenticados como asesor)
    if (!captchaValid) {
      submitLock.current = false
      toast.error('Verificación incorrecta', { description: 'Por favor responde correctamente la pregunta de seguridad.' })
      return
    }

    // Validar TODOS los pasos antes de guardar
    const validation = validateAllSteps()
    if (!validation.valid) {
      setErrors(validation.errors)
      setShowErrors(true)
      if (validation.firstErrorStep > 0) {
        setCurrentStep(validation.firstErrorStep)
        toast.error(`Hay campos sin completar en el paso ${validation.firstErrorStep}: ${steps[validation.firstErrorStep - 1].title}`, {
          description: 'Completa todos los campos requeridos antes de enviar',
          duration: 5000,
        })
      }
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
          nombreTecnico: formData.visita.nombreTecnico.trim() || 'Sin asesor',
          codigoFormulario: formData.visita.codigoFormulario,
          versionFormulario: formData.visita.versionFormulario,
          fechaEmisionFormulario: formData.visita.fechaEmisionFormulario,
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
          segundoNombre: formData.beneficiario.nombres.split(' ').filter(Boolean)[1] || undefined,
          primerApellido: formData.beneficiario.apellidos.split(' ').filter(Boolean)[0] || '',
          segundoApellido: formData.beneficiario.apellidos.split(' ').filter(Boolean)[1] || undefined,
          fechaNacimiento: formData.beneficiario.fechaNacimiento || undefined,
          edad: formData.beneficiario.edad ?? undefined,
          telefono: formData.beneficiario.telefono || undefined,
          email: formData.beneficiario.correo || undefined,
          ocupacionPrincipal: formData.beneficiario.ocupacionPrincipal || undefined,
          genero: formData.beneficiario.genero || undefined,
          personasACargo: formData.beneficiario.personasACargo ?? undefined,
          // Contacto secundario
          nombreContactoSecundario: formData.contactoSecundario.nombre || undefined,
          telefonoSecundario: formData.contactoSecundario.telefono || undefined,
          parentescoContactoSecundario: formData.contactoSecundario.parentesco || undefined,
        },

        // 3. Datos del predio (tabla predios)
        predio: {
          nombrePredio: formData.predio.nombrePredio,
          departamento: formData.predio.departamento,
          municipio: formData.predio.municipio,
          vereda: formData.predio.vereda,
          tipoTenencia: formData.predio.tipoTenencia,
          tipoTenenciaOtro: formData.predio.tipoTenenciaOtro,
          documentoTenencia: formData.predio.documentoTenencia,
          areaTotalHectareas: formData.predio.areaTotalHectareas ?? undefined,
          areaProductivaHectareas: formData.predio.areaProductivaHectareas ?? undefined,
          latitud: formData.predio.latitud,
          longitud: formData.predio.longitud,
          poligono: formData.predio.poligono,
          tipoUbicacion: formData.predio.tipoUbicacion,
          altitudMsnm: formData.predio.altitudMsnm ?? undefined,
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
          rutaAcceso: formData.caracterizacion.rutaAcceso,
          distanciaKm: formData.caracterizacion.distanciaKm ?? undefined,
          tiempoAcceso: formData.caracterizacion.tiempoAcceso,
          temperaturaCelsius: formData.caracterizacion.temperaturaCelsius ?? undefined,
          mesesLluvia: formData.caracterizacion.mesesLluvia,
          topografia: formData.caracterizacion.topografia,
          coberturaBosque: formData.caracterizacion.coberturaBosque,
          coberturaCultivos: formData.caracterizacion.coberturaCultivos,
          coberturaPastos: formData.caracterizacion.coberturaPastos,
          coberturaRastrojo: formData.caracterizacion.coberturaRastrojo,
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
          ].filter(Boolean).join(', ') || formData.abastecimientoAgua.otraFuente || undefined,
          disponibilidadAgua: 'Permanente',
          tieneConcesion: false,
          nacimientoManantial: formData.abastecimientoAgua.nacimientoManantial,
          rioQuebrada: formData.abastecimientoAgua.rioQuebrada,
          pozo: formData.abastecimientoAgua.pozo,
          acueductoRural: formData.abastecimientoAgua.acueductoRural,
          canalDistritoRiego: formData.abastecimientoAgua.canalDistritoRiego,
          jagueyReservorio: formData.abastecimientoAgua.jagueyReservorio,
          aguaLluvia: formData.abastecimientoAgua.aguaLluvia,
          otraFuente: formData.abastecimientoAgua.otraFuente || undefined,
          // Riesgos
          inundacion: formData.riesgos.inundacion,
          sequia: formData.riesgos.sequia,
          viento: formData.riesgos.viento,
          helada: formData.riesgos.helada,
          otrosRiesgos: formData.riesgos.otrosRiesgos || undefined,
          riesgos: [
            formData.riesgos.inundacion ? { tipo: 'Inundación', nivel: 'Medio' } : null,
            formData.riesgos.sequia ? { tipo: 'Sequía', nivel: 'Medio' } : null,
            formData.riesgos.viento ? { tipo: 'Viento', nivel: 'Medio' } : null,
            formData.riesgos.helada ? { tipo: 'Helada', nivel: 'Medio' } : null,
            formData.riesgos.otrosRiesgos ? { tipo: formData.riesgos.otrosRiesgos, nivel: 'Medio' } : null,
          ].filter((r): r is { tipo: string; nivel: string } => r !== null),
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
          ingresoMensualVentas: formData.areaProductiva.ingresoMensualVentas ?? undefined,
        },

        // 7. Informacion financiera (tabla informacion_financiera)
        infoFinanciera: {
          ingresosMensuales: String(formData.infoFinanciera.ingresosMensualesAgropecuaria || 0),
          ingresosMensualesAgropecuaria: formData.infoFinanciera.ingresosMensualesAgropecuaria ?? undefined,
          ingresosMensualesOtros: formData.infoFinanciera.ingresosMensualesOtros ?? undefined,
          egresosMensuales: formData.infoFinanciera.egresosMensuales ?? undefined,
          activosTotales: formData.infoFinanciera.activosTotales ?? undefined,
          activosAgropecuaria: formData.infoFinanciera.activosAgropecuaria ?? undefined,
          pasivosTotales: formData.infoFinanciera.pasivosTotales ?? undefined,
          fuentesIngreso: ['Actividad agropecuaria'],
          accesoCredito: false,
        },

        // 8. Archivos
        archivos: {
          fotoBeneficiario: formData.archivos.fotoBeneficiario,
          foto1Url: formData.archivos.foto1Url,
          foto2Url: formData.archivos.foto2Url,
          firmaProductorUrl: formData.archivos.firmaProductorUrl,
          fotoDocFrontalUrl: formData.archivos.fotoDocFrontalUrl,
          fotoDocTraseraUrl: formData.archivos.fotoDocTraseraUrl,
        },

        // 9. Autorizacion
        autorizacion: {
          autorizaTratamientoDatos: formData.autorizaciones.autorizacionDatosPersonales,
          autorizaConsultaCrediticia: formData.autorizaciones.autorizacionConsultaCrediticia,
          autorizaAvisoPrivacidad: formData.autorizaciones.autorizacionAvisoPrivacidad,
          autorizaUsoImagen: formData.autorizaciones.autorizacionUsoImagen,
          firmaDigital: formData.archivos.firmaProductorUrl,
          fechaAutorizacion: new Date().toISOString(),
        },
      }

      // Edición: usa endpoint dedicado de actualización
      if (isEdit && visitaId) {
        const res = await fetch('/api/actualizar-formulario', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visitaId, datos: dataToSave }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Error al actualizar formulario')
        }
        toast.success('Formulario actualizado correctamente', {
          description: 'Se han guardado los cambios.',
          duration: 5000,
        })
        setSubmittedData({ radicado: formData.visita.codigoFormulario || '', sincronizado: true })
        setTimeout(() => router.push('/dashboard'), 2000)
        return
      }

      // Creación: enviar directo al servidor
      const payload = {
        ...dataToSave,
        autorizaciones: formData.autorizaciones,
        ...(!isAsesor && { turnstileToken }),
      }

      const res = await fetch('/api/caracterizaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al enviar el formulario')
      }

      const result = await res.json()
      const radicadoOficial = result.radicadoOficial || ''
      const tieneCorreo = !!formData.beneficiario.correo
      const emailMsg = tieneCorreo
        ? 'Recibirás un correo con la confirmación.'
        : ''
      toast.success('Formulario enviado correctamente', {
        description: `Radicado: ${radicadoOficial}. ${emailMsg}`.trim(),
        duration: 6000,
      })
      setSubmittedData({ radicado: radicadoOficial, sincronizado: true })
    } catch (error) {
      console.error('Error guardando:', error)
      toast.error('No se pudo enviar el formulario', {
        description: error instanceof Error ? error.message : 'Verifica tu conexión e inténtalo de nuevo.',
        duration: 6000,
      })
    } finally {
      setIsSubmitting(false)
      submitLock.current = false
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
                  <Label htmlFor="nombreTecnico" className="flex items-center gap-2">
                    Nombre del Asesor
                    {isAsesor ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">
                        <Lock className="h-3 w-3" />
                        Auto-completado
                      </span>
                    ) : (
                      <span className="text-xs font-normal text-muted-foreground">(Opcional)</span>
                    )}
                  </Label>
                  <Input
                    id="nombreTecnico"
                    value={formData.visita.nombreTecnico}
                    onChange={(e) => !isAsesor && updateField("visita", "nombreTecnico", e.target.value)}
                    placeholder={isAsesor ? "" : "Nombre del asesor o dejarlo en blanco"}
                    readOnly={isAsesor}
                    className={`h-11 ${errors['visita.nombreTecnico'] ? 'border-red-500' : ''} ${isAsesor ? 'bg-muted cursor-not-allowed' : ''}`}
                  />
                  {isAsesor ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Nombre cargado automáticamente.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Si llenas este formulario sin la ayuda de un asesor, puedes dejar este campo en blanco.
                    </p>
                  )}
                  {errors['visita.nombreTecnico'] && <p className="text-sm text-red-500">{errors['visita.nombreTecnico']}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="codigoFormulario" className="flex items-center gap-2">
                    Código Formulario
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">
                      <Lock className="h-3 w-3" />
                      Auto-generado
                    </span>
                  </Label>
                  <Input
                    id="codigoFormulario"
                    value={formData.visita.codigoFormulario || "Se asignará al guardar"}
                    readOnly
                    className="h-11 cursor-default bg-muted/50 text-muted-foreground"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="versionFormulario">Versión Formulario</Label>
                  <Input
                    id="versionFormulario"
                    value={formData.visita.versionFormulario}
                    readOnly
                    className="h-11 cursor-default bg-muted/50 text-muted-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fechaEmisionFormulario">Fecha Emisión Formulario</Label>
                  <Input
                    id="fechaEmisionFormulario"
                    type="date"
                    value={formData.visita.fechaEmisionFormulario}
                    readOnly
                    className="h-11 cursor-default bg-muted/50 text-muted-foreground"
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
                  <Label htmlFor="numeroDocumento" className="flex items-center gap-2">
                    Numero Documento <span className="text-red-500">*</span>
                    {buscandoDocumento && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                  </Label>
                  <Input
                    id="numeroDocumento"
                    inputMode="numeric"
                    value={formData.beneficiario.numeroDocumento}
                    onChange={(e) => updateField("beneficiario", "numeroDocumento", e.target.value.replace(/\D/g, ''))}
                    onBlur={(e) => buscarBeneficiarioPorDocumento(e.target.value)}
                    onKeyDown={soloNumeros}
                    placeholder="Solo digitos (6-12 digitos)"
                    className={`h-11 ${errors['beneficiario.numeroDocumento'] ? 'border-red-500' : ''}`}
                  />
                  {isAuthenticated && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Si el agricultor tiene registros previos, los campos se autocompletarán al salir de este campo.
                    </p>
                  )}
                  {errors['beneficiario.numeroDocumento'] && <p className="text-sm text-red-500">{errors['beneficiario.numeroDocumento']}</p>}
                </div>
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
              </div>
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
                  <Label htmlFor="fechaNacimiento">Fecha de Nacimiento</Label>
                  <Input
                    id="fechaNacimiento"
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    value={formData.beneficiario.fechaNacimiento}
                    onChange={(e) => updateField("beneficiario", "fechaNacimiento", e.target.value)}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">Calcula la edad automaticamente</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edad">Edad (años)</Label>
                  <Input
                    id="edad"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="120"
                    value={formData.beneficiario.edad !== null ? formData.beneficiario.edad : ""}
                    onChange={(e) => {
                      setEdadManual(true)
                      updateField("beneficiario", "edad", e.target.value !== "" ? parseInt(e.target.value) : null)
                    }}
                    placeholder="Ej: 45"
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.beneficiario.fechaNacimiento ? "Calculada desde la fecha de nacimiento (editable)" : "Ingrese la edad manualmente"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono">Telefono <span className="text-red-500">*</span></Label>
                  <Input
                    id="telefono"
                    inputMode="numeric"
                    value={formData.beneficiario.telefono}
                    onChange={(e) => updateField("beneficiario", "telefono", e.target.value.replace(/\D/g, ''))}
                    onKeyDown={soloNumeros}
                    placeholder="7-10 digitos"
                    className={`h-11 ${errors['beneficiario.telefono'] ? 'border-red-500' : ''}`}
                  />
                  {errors['beneficiario.telefono'] && <p className="text-sm text-red-500">{errors['beneficiario.telefono']}</p>}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="genero">Género</Label>
                  <Select
                    value={formData.beneficiario.genero}
                    onValueChange={(value) => updateField("beneficiario", "genero", value)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Seleccione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Femenino">Femenino</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                      <SelectItem value="Prefiero no decir">Prefiero no decir</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="personasACargo">Personas a cargo</Label>
                  <Input
                    id="personasACargo"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="20"
                    value={formData.beneficiario.personasACargo ?? ""}
                    onChange={(e) => updateField("beneficiario", "personasACargo", e.target.value !== "" ? parseInt(e.target.value) : null)}
                    placeholder="Ej: 3"
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">Número de personas que dependen económicamente del beneficiario</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="correo">Correo Electrónico</Label>
                  <Input
                    id="correo"
                    type="email"
                    inputMode="email"
                    value={formData.beneficiario.correo}
                    onChange={(e) => updateField("beneficiario", "correo", e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className={`h-11 ${errors['beneficiario.correo'] ? 'border-red-500' : ''}`}
                  />
                  {errors['beneficiario.correo'] && <p className="text-sm text-red-500">{errors['beneficiario.correo']}</p>}
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Al proporcionar el correo recibirás credenciales de acceso al sistema.
                  </p>
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

              {/* Contacto secundario / Acudiente */}
              <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium">Contacto Secundario / Acudiente <span className="text-xs font-normal text-muted-foreground">(Opcional)</span></h4>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="contactoNombre">Nombre completo</Label>
                    <Input
                      id="contactoNombre"
                      value={formData.contactoSecundario.nombre}
                      onChange={(e) => updateField("contactoSecundario", "nombre", e.target.value)}
                      placeholder="Nombre del contacto secundario"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactoParentesco">Parentesco</Label>
                    <Input
                      id="contactoParentesco"
                      value={formData.contactoSecundario.parentesco}
                      onChange={(e) => updateField("contactoSecundario", "parentesco", e.target.value)}
                      placeholder="Ej: Cónyuge, Hijo, Hermano"
                      className="h-11"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contactoTelefono">Teléfono del contacto</Label>
                    <Input
                      id="contactoTelefono"
                      inputMode="numeric"
                      value={formData.contactoSecundario.telefono}
                      onChange={(e) => updateField("contactoSecundario", "telefono", e.target.value.replace(/\D/g, ''))}
                      onKeyDown={soloNumeros}
                      placeholder="7-10 dígitos"
                      className="h-11"
                    />
                  </div>
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
                      <SelectItem value="Posesion">Posesión</SelectItem>
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
                    inputMode="decimal"
                    min="0"
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
                    inputMode="decimal"
                    min="0"
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
                    inputMode="numeric"
                    min="0"
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
                <Label>
                  Ubicación del Predio <span className="text-destructive">*</span>
                </Label>
                <LocationPicker
                  onLocationChange={(loc) => {
                    setFormData(prev => ({
                      ...prev,
                      predio: {
                        ...prev.predio,
                        latitud: loc.latitud,
                        longitud: loc.longitud,
                        poligono: loc.poligono,
                        tipoUbicacion: loc.tipoUbicacion,
                      }
                    }))
                  }}
                  initialLocation={{
                    latitud: formData.predio.latitud,
                    longitud: formData.predio.longitud,
                    poligono: formData.predio.poligono,
                    tipoUbicacion: formData.predio.tipoUbicacion || "punto",
                  }}
                />
                {errors['predio.ubicacion'] && (
                  <p className="text-sm text-destructive">{errors['predio.ubicacion']}</p>
                )}
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
                    inputMode="decimal"
                    min="0"
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
                    inputMode="decimal"
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
                  <Label htmlFor="topografia">Topografía <span className="text-red-500">*</span></Label>
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
                      <SelectItem value="51%> Pendiente">{">"} 51% Pendiente pronunciada</SelectItem>
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
                    inputMode="numeric"
                    min="0"
                    value={formData.areaProductiva.ingresoMensualVentas || ""}
                    onChange={(e) => updateField("areaProductiva", "ingresoMensualVentas", e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="Pesos colombianos"
                    className="h-11"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Checkbox
                  id="tieneInfraestructuraProcesamiento"
                  checked={formData.areaProductiva.tieneInfraestructuraProcesamiento}
                  onCheckedChange={(checked) => updateField("areaProductiva", "tieneInfraestructuraProcesamiento", checked)}
                />
                <Label htmlFor="tieneInfraestructuraProcesamiento">Tiene infraestructura de procesamiento</Label>
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
                  <CardDescription>Ingresos, egresos y activos — todos los valores deben ser <strong>mensuales</strong></CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="ingresosMensualesAgropecuaria">Ingresos Agropecuarios/mes ($)</Label>
                  <Input
                    id="ingresosMensualesAgropecuaria"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={formData.infoFinanciera.ingresosMensualesAgropecuaria ?? ""}
                    onChange={(e) => updateField("infoFinanciera", "ingresosMensualesAgropecuaria", e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="Mensuales"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ingresosMensualesOtros">Otros Ingresos/mes ($)</Label>
                  <Input
                    id="ingresosMensualesOtros"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={formData.infoFinanciera.ingresosMensualesOtros ?? ""}
                    onChange={(e) => updateField("infoFinanciera", "ingresosMensualesOtros", e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="Mensuales"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="egresosMensuales">Egresos/mes ($)</Label>
                  <Input
                    id="egresosMensuales"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={formData.infoFinanciera.egresosMensuales ?? ""}
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
                    inputMode="numeric"
                    min="0"
                    value={formData.infoFinanciera.activosTotales ?? ""}
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
                    inputMode="numeric"
                    min="0"
                    value={formData.infoFinanciera.activosAgropecuaria ?? ""}
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
                    inputMode="numeric"
                    min="0"
                    value={formData.infoFinanciera.pasivosTotales ?? ""}
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

              {/* Fotos del documento de identidad */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Documento de Identidad</Label>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <Label className="text-sm text-muted-foreground">Frontal del documento</Label>
                    <PhotoUpload
                      onPhotoCapture={(dataUrl) => updateField("archivos", "fotoDocFrontalUrl", dataUrl)}
                      currentPhoto={formData.archivos.fotoDocFrontalUrl}
                      label="Foto frontal del documento"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm text-muted-foreground">Reverso del documento</Label>
                    <PhotoUpload
                      onPhotoCapture={(dataUrl) => updateField("archivos", "fotoDocTraseraUrl", dataUrl)}
                      currentPhoto={formData.archivos.fotoDocTraseraUrl}
                      label="Foto reverso del documento"
                    />
                  </div>
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

              {/* Autorizaciones (4 checks legales COA) */}
              <div className="space-y-3">
                {/* 1. Datos personales (obligatorio) */}
                <div className={`rounded-lg border p-4 ${errors['autorizaciones.autorizacionDatosPersonales'] ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : 'border-border/50 bg-muted/30'}`}>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="autorizacionDatosPersonales"
                      checked={formData.autorizaciones.autorizacionDatosPersonales}
                      onCheckedChange={(checked) => updateField("autorizaciones", "autorizacionDatosPersonales", checked)}
                    />
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="autorizacionDatosPersonales" className="font-medium">
                        Autorización de Tratamiento de Datos Personales <span className="text-red-500">*</span>
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Autorizo a COA el tratamiento de mis datos personales conforme a la Ley 1581 de 2012,
                        incluyendo su transferencia a la entidad pública contratante.
                      </p>
                      <button
                        type="button"
                        onClick={() => setLegalModalOpen("autorizacionTratamientoDatos")}
                        className="text-sm text-primary underline hover:text-primary/80 mt-1"
                      >
                        Ver documento completo
                      </button>
                      {errors['autorizaciones.autorizacionDatosPersonales'] && <p className="text-sm text-red-500 mt-2">{errors['autorizaciones.autorizacionDatosPersonales']}</p>}
                    </div>
                  </div>
                </div>

                {/* 2. Aviso de privacidad / Política (obligatorio) */}
                <div className={`rounded-lg border p-4 ${errors['autorizaciones.autorizacionAvisoPrivacidad'] ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : 'border-border/50 bg-muted/30'}`}>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="autorizacionAvisoPrivacidad"
                      checked={formData.autorizaciones.autorizacionAvisoPrivacidad}
                      onCheckedChange={(checked) => updateField("autorizaciones", "autorizacionAvisoPrivacidad", checked)}
                    />
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="autorizacionAvisoPrivacidad" className="font-medium">
                        He leído el Aviso de Privacidad y la Política de Tratamiento de Datos <span className="text-red-500">*</span>
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Declaro conocer la Política de Tratamiento de Datos de COA y mis derechos como titular.
                      </p>
                      <div className="flex flex-wrap gap-3 mt-1">
                        <button
                          type="button"
                          onClick={() => setLegalModalOpen("avisoPrivacidad")}
                          className="text-sm text-primary underline hover:text-primary/80"
                        >
                          Ver Aviso de Privacidad
                        </button>
                        <button
                          type="button"
                          onClick={() => setLegalModalOpen("politicaTratamientoDatos")}
                          className="text-sm text-primary underline hover:text-primary/80"
                        >
                          Ver Política completa
                        </button>
                      </div>
                      {errors['autorizaciones.autorizacionAvisoPrivacidad'] && <p className="text-sm text-red-500 mt-2">{errors['autorizaciones.autorizacionAvisoPrivacidad']}</p>}
                    </div>
                  </div>
                </div>

                {/* 3. Consulta crediticia (opcional) */}
                <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="autorizacionConsultaCrediticia"
                      checked={formData.autorizaciones.autorizacionConsultaCrediticia}
                      onCheckedChange={(checked) => {
                        updateField("autorizaciones", "autorizacionConsultaCrediticia", checked)
                        updateField("areaProductiva", "interesadoPrograma", checked)
                      }}
                    />
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="autorizacionConsultaCrediticia" className="font-medium">
                        Autorización de Consulta Crediticia <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Autorizo la consulta de mi historial crediticio en centrales de riesgo para la evaluación
                        de opciones de financiación. También expreso mi interés en acompañamiento crediticio.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4. Uso de imagen (opcional) */}
                <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="autorizacionUsoImagen"
                      checked={formData.autorizaciones.autorizacionUsoImagen}
                      onCheckedChange={(checked) => updateField("autorizaciones", "autorizacionUsoImagen", checked)}
                    />
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="autorizacionUsoImagen" className="font-medium">
                        Autorización de Uso de Imagen <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Autorizo a COA el uso público de mi imagen en las fotografías que se capturen durante esta visita,
                        para materiales publicitarios, redes sociales y comunicaciones de COA.
                      </p>
                      <button
                        type="button"
                        onClick={() => setLegalModalOpen("autorizacionUsoImagen")}
                        className="text-sm text-primary underline hover:text-primary/80 mt-1"
                      >
                        Ver documento completo
                      </button>
                    </div>
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

              {/* Verificación de seguridad Cloudflare Turnstile (solo para no asesores) */}
              {!isAsesor && (
                <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-3">
                  <Label className="font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Verificación de seguridad <span className="text-red-500">*</span>
                  </Label>
                  <Turnstile
                    siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
                    onSuccess={(token) => setTurnstileToken(token)}
                    onExpire={() => setTurnstileToken(null)}
                    onError={() => setTurnstileToken(null)}
                    options={{ theme: "auto", language: "es" }}
                  />
                  {!turnstileToken && (
                    <p className="text-xs text-muted-foreground">Completa la verificación para poder enviar el formulario.</p>
                  )}
                </div>
              )}

              {/* Botón de envío */}
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.autorizaciones.autorizacionDatosPersonales || !formData.autorizaciones.autorizacionAvisoPrivacidad || !captchaValid}
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

  // Pantalla de éxito — renderizada inline (funciona sin conexión)
  if (submittedData) {
    const handleDownloadPDF = () => {
      const pdfData = pdfFromFormData(
        formData,
        submittedData.radicado,
        'INICIADO'
      )
      generateCaracterizacionPDF(pdfData)
    }
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <header className="border-b border-border bg-card/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/icons/icon-192x192.png" alt="Agro360" width={36} height={36} className="rounded-lg" />
              <span className="text-lg font-semibold">Agro360</span>
            </Link>
            </div>
        </header>
        <main className="mx-auto max-w-2xl px-4 py-12">
          <Card className="text-center">
            <CardHeader className="pb-4">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
              <CardTitle className="text-2xl">
                ¡Registrado!
              </CardTitle>
              <CardDescription>
                El formulario se envió correctamente al servidor.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                <p className="mb-1 text-xs text-muted-foreground">Radicado oficial</p>
                <code className="font-mono text-xs text-muted-foreground">{submittedData.radicado}</code>
              </div>

              <div className="space-y-3">
                <Alert className="border-green-500/20 bg-green-500/5">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-foreground">
                    Tu registro fue recibido por el servidor y está disponible en el sistema.
                  </AlertDescription>
                </Alert>
                {!isAuthenticated && formData.beneficiario.correo && (
                  <Alert className="border-primary/20 bg-primary/5">
                    <Info className="h-4 w-4 text-primary" />
                    <AlertDescription className="text-foreground">
                      Se enviará un correo a <strong>{formData.beneficiario.correo}</strong> con tus credenciales de acceso para consultar tus registros.
                    </AlertDescription>
                  </Alert>
                )}
                {!isAuthenticated && !formData.beneficiario.correo && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Para acceder a tus registros en el futuro,{" "}
                      <Link href="/registro" className="text-primary underline font-medium">
                        crea una cuenta de agricultor
                      </Link>{" "}
                      con el mismo correo que usarías.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-center">
                <button
                  onClick={() => { setSubmittedData(null); setFormData(initialFormData); setCurrentStep(1) }}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo Formulario
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted/50"
                >
                  <Download className="h-4 w-4" />
                  Descargar PDF
                </button>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted/50"
                >
                  <Home className="h-4 w-4" />
                  Dashboard
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Image src="/icons/icon-192x192.png" alt="Agro360" width={36} height={36} className="rounded-lg" />
            <div>
              <h1 className="text-lg font-semibold">Agro360</h1>
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
            {!isAuthenticated && (
              <Button variant="outline" size="sm" asChild className="hidden sm:flex gap-1.5 text-xs">
                <Link href={`/auth/login?redirectTo=/formulario`}>
                  <User className="h-3.5 w-3.5" />
                  Asesor: Inicia sesión
                </Link>
              </Button>
            )}
            <Button variant="outline" size="icon" asChild className="h-9 w-9">
              <Link href={isAuthenticated ? "/dashboard" : "/"}>
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
                  onClick={() => goToStep(step.id)}
                  className={`flex flex-col items-center gap-1 min-w-[60px] p-2 rounded-lg transition-colors ${isActive ? "bg-primary/10" : isCompleted ? "bg-muted" : ""
                    }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${isActive
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
        {isAsesor && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800/60 dark:bg-green-900/20 dark:text-green-300">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Estás registrando como asesor <strong>{profile?.nombre_completo}</strong>. Tu nombre se ha completado automáticamente y quedará asociado a esta caracterización.
            </span>
          </div>
        )}
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

      {/* Modal de documentos legales */}
      {legalModalOpen && (
        <LegalDocumentModal
          open={legalModalOpen !== null}
          onOpenChange={(open) => !open && setLegalModalOpen(null)}
          title={LEGAL_DOCUMENTS[legalModalOpen].title}
          description={LEGAL_DOCUMENTS[legalModalOpen].description}
          documentUrl={LEGAL_DOCUMENTS[legalModalOpen].url}
          showAcceptButton={false}
          beneficiarioNombre={`${formData.beneficiario.nombres} ${formData.beneficiario.apellidos}`.trim() || undefined}
          beneficiarioDoc={formData.beneficiario.numeroDocumento || undefined}
          fechaFormulario={formData.visita.fechaVisita
            ? new Date(formData.visita.fechaVisita + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : undefined}
          beneficiarioFirma={formData.archivos.firmaProductorUrl || undefined}
        />
      )}
    </div>
  )
}
