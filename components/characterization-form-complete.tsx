"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
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
  Check,
  Cloud,
  Download,
  Plus,
  ChevronsUpDown,
  WifiOff,
  CloudUpload,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ThemeToggle } from "./theme-toggle"
import { UserProfile } from "./user-profile"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import Link from "next/link"
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile"
import { LegalDocumentModal, LEGAL_DOCUMENTS } from "./legal-document-modal"
import { savePendingForm } from "@/lib/offline-db"
import { useOfflineSync } from "@/hooks/use-offline-sync"
import { OfflineSyncBanner } from "./offline-sync-banner"

// Los 87 municipios oficiales de Santander (DANE), ordenados alfabéticamente
const municipiosSantander = [
  "Aguada", "Albania", "Aratoca", "Barbosa", "Barichara", "Barrancabermeja",
  "Betulia", "Bolívar", "Bucaramanga", "Cabrera", "California", "Capitanejo",
  "Carcasí", "Cepitá", "Cerrito", "Charalá", "Charta", "Chima", "Chipatá",
  "Cimitarra", "Concepción", "Confines", "Contratación", "Coromoro", "Curití",
  "El Carmen de Chucurí", "El Guacamayo", "El Peñón", "El Playón", "Encino",
  "Enciso", "Florián", "Floridablanca", "Galán", "Gámbita", "Girón", "Guaca", "Guadalupe",
  "Guapotá", "Guavatá", "Güepsa", "Hato", "Jesús María", "Jordán",
  "La Belleza", "La Paz", "Landázuri", "Lebrija", "Los Santos", "Macaravita",
  "Málaga", "Matanza", "Mogotes", "Molagavita", "Ocamonte", "Oiba", "Onzaga",
  "Palmar", "Palmas del Socorro", "Páramo", "Piedecuesta", "Pinchote",
  "Puente Nacional", "Puerto Parra", "Puerto Wilches", "Rionegro",
  "Sabana de Torres", "San Andrés", "San Benito", "San Gil", "San Joaquín",
  "San José de Miranda", "San Miguel", "San Vicente de Chucurí",
  "Santa Bárbara", "Santa Helena del Opón", "Simacota", "Socorro", "Suaita",
  "Sucre", "Suratá", "Tona", "Valle de San José", "Vélez", "Vetas",
  "Villanueva", "Zapatoca",
]

// Cultivos para "sistema productivo actual"
const cultivosSantander = [
  "Aguacate", "Ahuyama", "Ajo", "Arracacha", "Arroz", "Arveja",
  "Banano", "Cacao", "Café", "Caña panelera", "Cebada", "Cebolla",
  "Cítricos", "Fique", "Fríjol", "Frutales", "Granadilla", "Guanabana",
  "Guayaba", "Hortalizas", "Lechuga", "Limón", "Maíz", "Mandarina",
  "Mango", "Maracuyá", "Mora", "Naranja", "Palma de aceite", "Papa",
  "Patilla", "Pepino", "Piña", "Plátano", "Sorgo", "Tabaco", "Tomate",
  "Trigo", "Yacón", "Yuca", "Zanahoria", "Otro",
]

// Cultivos de interés en el programa (orden alfabético)
const cultivosPrograma = [
  "Cacao", "Café", "Caña panelera", "Fique",
  "Limón tahití", "Mora", "Palma africana", "Plátano",
]

// Tipos de tenencia (orden alfabético) — sin constraint en BD
const tiposTenencia = [
  "Aparcería",
  "Arrendamiento",
  "Asignación por cabildo indígena",
  "Asignación por comunidad afrodescendiente",
  "Comodato",
  "Derechos de uso",
  "Posesión o falsa tradición",
  "Predio del cónyuge",
  "Propiedad",
  "Usufructo",
]

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
    asociacion: string
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
    sistemaProductivoInteres: string
    hectareasSiembraNueva: number | null
    hectareasRenovacion: number | null
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
    asociacion: "",
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
    sistemaProductivoInteres: "",
    hectareasSiembraNueva: null,
    hectareasRenovacion: null,
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
  // El sync global lo maneja AutoSync (layout). Aquí solo necesitamos isOnline y el conteo
  // para el banner del formulario, sin crear una segunda instancia que cause envíos dobles.
  const { isOnline, pendingCount, isSyncing, syncPending, refreshCount } = useOfflineSync(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [stepDirection, setStepDirection] = useState(1)
  const [formData, setFormData] = useState<FormData>(() => {
    if (initialData) {
      // Deep merge: secciones del initialData reemplazan las del default,
      // pero cualquier campo faltante dentro de cada sección usa el default
      return {
        visita:             { ...initialFormData.visita,             ...(initialData.visita             ?? {}) },
        beneficiario:       { ...initialFormData.beneficiario,       ...(initialData.beneficiario       ?? {}) },
        contactoSecundario: { ...initialFormData.contactoSecundario, ...(initialData.contactoSecundario ?? {}) },
        predio:             { ...initialFormData.predio,             ...(initialData.predio             ?? {}) },
        caracterizacion:    { ...initialFormData.caracterizacion,    ...(initialData.caracterizacion    ?? {}) },
        abastecimientoAgua: { ...initialFormData.abastecimientoAgua, ...(initialData.abastecimientoAgua ?? {}) },
        riesgos:            { ...initialFormData.riesgos,            ...(initialData.riesgos            ?? {}) },
        areaProductiva:     { ...initialFormData.areaProductiva,     ...(initialData.areaProductiva     ?? {}) },
        infoFinanciera:     { ...initialFormData.infoFinanciera,     ...(initialData.infoFinanciera     ?? {}) },
        archivos:           { ...initialFormData.archivos,           ...(initialData.archivos           ?? {}) },
        autorizaciones:     { ...initialFormData.autorizaciones,     ...(initialData.autorizaciones     ?? {}) },
        observaciones:      initialData.observaciones ?? initialFormData.observaciones,
      } as FormData
    }
    return initialFormData
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submitLock = useRef(false)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [showErrors, setShowErrors] = useState(false)
  const [submittedData, setSubmittedData] = useState<{ radicado: string; sincronizado: boolean } | null>(null)
  const [edadManual, setEdadManual] = useState(false)

  const errorBannerRef = useRef<HTMLDivElement>(null)

  // Scroll al inicio + foco en primer input editable al cambiar de paso
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    const timer = setTimeout(() => {
      const first = document.querySelector<HTMLElement>(
        'main input:not([disabled]):not([readonly]):not([type="hidden"]):not([type="date"]):not([type="number"]), main textarea:not([disabled])'
      )
      first?.focus({ preventScroll: true })
    }, 360)
    return () => clearTimeout(timer)
  }, [currentStep])

  // Scroll al banner de errores cuando aparecen
  useEffect(() => {
    if (showErrors && Object.keys(errors).length > 0) {
      const timer = setTimeout(() => {
        errorBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 80)
      return () => clearTimeout(timer)
    }
  }, [showErrors, errors])

  // Turnstile token (solo requerido para usuarios no autenticados como asesor)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileInstance>(null)
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""
  // Si el siteKey no está configurado, o el usuario está autenticado, se omite la verificación
  const captchaValid = isAuthenticated || isAsesor || !turnstileSiteKey || !!turnstileToken

  // Estado de modales legales (null = ninguno abierto)
  const [legalModalOpen, setLegalModalOpen] = useState<keyof typeof LEGAL_DOCUMENTS | null>(null)

  // Desactivar temporalmente la autorización de consulta crediticia
  const SHOW_CONSULTA_CREDITICIA = false

  // Estados para comboboxes con búsqueda
  const [municipioOpen, setMunicipioOpen] = useState(false)
  const [tenenciaOpen, setTenenciaOpen] = useState(false)
  const [sistemaProductivoOpen, setSistemaProductivoOpen] = useState(false)
  const [sistemaIntereOpen, setSistemaIntereOpen] = useState(false)

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
          asociacion: b.asociacion || prev.beneficiario.asociacion,
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

  // Pre-llenar datos del beneficiario para agricultores autenticados (formulario nuevo)
  useEffect(() => {
    if (!isAuthenticated || isAsesor || isEdit || !profile) return

    const palabras = (profile.nombre_completo || '').trim().split(/\s+/).filter(Boolean)
    let nombres = '', apellidos = ''
    if (palabras.length >= 4) {
      const mitad = Math.ceil(palabras.length / 2)
      nombres = palabras.slice(0, mitad).join(' ')
      apellidos = palabras.slice(mitad).join(' ')
    } else if (palabras.length === 3) {
      nombres = palabras[0]
      apellidos = palabras.slice(1).join(' ')
    } else if (palabras.length === 2) {
      nombres = palabras[0]
      apellidos = palabras[1]
    } else {
      nombres = palabras[0] || ''
    }

    setFormData(prev => ({
      ...prev,
      beneficiario: {
        ...prev.beneficiario,
        ...(nombres        && { nombres }),
        ...(apellidos      && { apellidos }),
        ...(profile.numero_documento && { numeroDocumento: profile.numero_documento }),
        ...(user?.email    && { correo: user.email }),
        ...(profile.telefono && { telefono: profile.telefono }),
      },
    }))
  }, [isAuthenticated, isAsesor, isEdit, profile?.id])

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
        if (!formData.autorizaciones.autorizacionAvisoPrivacidad) stepErrors['autorizaciones.autorizacionAvisoPrivacidad'] = 'Debe confirmar que ha leído la Política de Tratamiento de Datos'
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
    if (currentStep < steps.length) { setStepDirection(1); setCurrentStep(currentStep + 1) }
  }

  const prevStep = () => {
    setShowErrors(false)
    if (currentStep > 1) { setStepDirection(-1); setCurrentStep(currentStep - 1) }
  }

  // Navegar a un paso específico (desde la barra de progreso)
  const goToStep = (targetStep: number) => {
    // Siempre permite ir hacia atrás
    if (targetStep <= currentStep) {
      setStepDirection(-1)
      setShowErrors(false)
      setErrors({})
      setCurrentStep(targetStep)
      return
    }
    setStepDirection(1)
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

  // Validar pasos del formulario hasta maxStep (inclusive)
  const validateAllSteps = (maxStep = steps.length): { valid: boolean; firstErrorStep: number; errors: ValidationErrors } => {
    const allErrors: ValidationErrors = {}
    let firstErrorStep = 0
    for (let s = 1; s <= maxStep; s++) {
      const stepErrors = validateStep(s)
      if (Object.keys(stepErrors).length > 0 && firstErrorStep === 0) {
        firstErrorStep = s
      }
      Object.assign(allErrors, stepErrors)
    }
    return { valid: Object.keys(allErrors).length === 0, firstErrorStep, errors: allErrors }
  }

  // Helper: mostrar errores de validación y navegar al paso con el primer error
  const handleValidationError = (validation: { firstErrorStep: number; errors: ValidationErrors }) => {
    setErrors(validation.errors)
    setShowErrors(true)
    if (validation.firstErrorStep > 0) {
      setCurrentStep(validation.firstErrorStep)
      toast.error(
        `Hay campos sin completar en el paso ${validation.firstErrorStep}: ${steps[validation.firstErrorStep - 1].title}`,
        { description: 'Completa todos los campos requeridos antes de enviar', duration: 5000 }
      )
    }
  }

  // Enviar formulario
  const handleSubmit = async () => {
    if (submitLock.current) return

    // ── Fase 1: Validaciones por modo (síncronas, sin bloquear el botón) ──────
    // Las validaciones no adquieren el lock. Si fallan, el usuario puede corregir
    // y reintentar sin que el botón quede bloqueado.

    if (isEdit && visitaId) {
      // Edición: solo validar pasos 1-8 (datos del formulario).
      // El paso 9 (autorizaciones) ya está guardado en la BD y no se re-valida.
      const validation = validateAllSteps(8)
      if (!validation.valid) { handleValidationError(validation); return }

    } else if (!isOnline) {
      // Sin conexión: solo asesores pueden guardar localmente.
      if (!isAsesor) {
        toast.error('Sin conexión', { description: 'Se requiere conexión a internet para enviar el formulario.' })
        return
      }
      // Validar pasos 1-9 (sin captcha — no aplica offline).
      const validation = validateAllSteps()
      if (!validation.valid) { handleValidationError(validation); return }

    } else {
      // Online, creación nueva: captcha solo para usuarios NO autenticados.
      if (!isAuthenticated && !isAsesor && turnstileSiteKey && !turnstileToken) {
        toast.error('Verificación de seguridad', { description: 'Completa la verificación de seguridad antes de enviar.' })
        return
      }
      const validation = validateAllSteps()
      if (!validation.valid) { handleValidationError(validation); return }
    }

    // ── Fase 2: Envío (adquirir lock y marcar como enviando) ─────────────────
    submitLock.current = true
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
          asociacion: formData.beneficiario.asociacion || undefined,
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
          sistemaProductivoInteres: formData.areaProductiva.sistemaProductivoInteres,
          hectareasSiembraNueva: formData.areaProductiva.hectareasSiembraNueva ?? undefined,
          hectareasRenovacion: formData.areaProductiva.hectareasRenovacion ?? undefined,
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

      // Creación: modo offline (asesor guardando localmente)
      if (!isOnline) {
        const payload = {
          ...dataToSave,
          autorizaciones: formData.autorizaciones,
          offlineSync: true,
        }
        const localId = await savePendingForm(payload as Record<string, unknown>)
        await refreshCount()
        toast.success('Formulario guardado localmente', {
          description: 'Se sincronizará automáticamente cuando recuperes la conexión.',
          duration: 6000,
        })
        setSubmittedData({ radicado: localId, sincronizado: false })
        return
      }

      // Creación: enviar al servidor (online)
      const payload = {
        ...dataToSave,
        autorizaciones: formData.autorizaciones,
        ...(!isAuthenticated && !isAsesor && turnstileToken && { turnstileToken }),
      }

      let res: Response
      try {
        res = await fetch('/api/caracterizaciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } catch {
        // Error de red: si es asesor, guardar localmente como fallback
        if (!isAsesor) {
          throw new Error('No hay conexión a internet. Verifica tu red e inténtalo de nuevo.')
        }
        const offlinePayload = { ...payload, offlineSync: true }
        const localId = await savePendingForm(offlinePayload as Record<string, unknown>)
        await refreshCount()
        toast.success('Formulario guardado localmente', {
          description: 'Se sincronizará automáticamente cuando recuperes la conexión.',
          duration: 6000,
        })
        setSubmittedData({ radicado: localId, sincronizado: false })
        return
      }

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
      // Resetear Turnstile: cada token es de un solo uso. Si el envío falló,
      // el token ya fue consumido por el servidor y no puede reutilizarse.
      turnstileRef.current?.reset()
      setTurnstileToken(null)
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="fechaVisita">Fecha de Visita <span className="text-red-500">*</span></Label>
                  <Input
                    id="fechaVisita"
                    type="date"
                    value={formData.visita.fechaVisita}
                    onChange={(e) => updateField("visita", "fechaVisita", e.target.value)}
                    className={`h-11 ${errors['visita.fechaVisita'] ? 'border-red-500' : ''}`}
                  />
                  {errors['visita.fechaVisita'] && <p role="alert" className="text-sm text-red-500">{errors['visita.fechaVisita']}</p>}
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
                  {errors['visita.nombreTecnico'] && <p role="alert" className="text-sm text-red-500">{errors['visita.nombreTecnico']}</p>}
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
                  {errors['beneficiario.numeroDocumento'] && <p role="alert" className="text-sm text-red-500">{errors['beneficiario.numeroDocumento']}</p>}
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
                  {errors['beneficiario.tipoDocumento'] && <p role="alert" className="text-sm text-red-500">{errors['beneficiario.tipoDocumento']}</p>}
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
                  {errors['beneficiario.nombres'] && <p role="alert" className="text-sm text-red-500">{errors['beneficiario.nombres']}</p>}
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
                  {errors['beneficiario.apellidos'] && <p role="alert" className="text-sm text-red-500">{errors['beneficiario.apellidos']}</p>}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                  {errors['beneficiario.telefono'] && <p role="alert" className="text-sm text-red-500">{errors['beneficiario.telefono']}</p>}
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
                      <SelectItem value="Hombre">Hombre</SelectItem>
                      <SelectItem value="Mujer">Mujer</SelectItem>
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
                  {errors['beneficiario.correo'] && <p role="alert" className="text-sm text-red-500">{errors['beneficiario.correo']}</p>}
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

              <div className="space-y-2">
                <Label htmlFor="asociacion">¿Pertenece a una asociación, cooperativa o federación? ¿Cuál?</Label>
                <Input
                  id="asociacion"
                  value={formData.beneficiario.asociacion}
                  onChange={(e) => updateField("beneficiario", "asociacion", e.target.value)}
                  placeholder="Nombre de la asociación, cooperativa o federación (opcional)"
                  className="h-11"
                />
              </div>

              {/* Contacto secundario / Acudiente */}
              <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium">Contacto Secundario / Acudiente <span className="text-xs font-normal text-muted-foreground">(Opcional)</span></h4>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="nombrePredio">Nombre del Predio <span className="text-red-500">*</span></Label>
                  <Input
                    id="nombrePredio"
                    value={formData.predio.nombrePredio}
                    onChange={(e) => updateField("predio", "nombrePredio", e.target.value)}
                    placeholder="Nombre del predio"
                    className={`h-11 ${errors['predio.nombrePredio'] ? 'border-red-500' : ''}`}
                  />
                  {errors['predio.nombrePredio'] && <p role="alert" className="text-sm text-red-500">{errors['predio.nombrePredio']}</p>}
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
                  <Label>Municipio <span className="text-red-500">*</span></Label>
                  <Popover open={municipioOpen} onOpenChange={setMunicipioOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={municipioOpen}
                        className={`w-full h-11 justify-between font-normal ${errors['predio.municipio'] ? 'border-red-500' : ''}`}
                      >
                        {formData.predio.municipio || "Seleccione municipio"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar municipio..." />
                        <CommandList>
                          <CommandEmpty>No se encontró el municipio.</CommandEmpty>
                          <CommandGroup>
                            {municipiosSantander.map((m) => (
                              <CommandItem
                                key={m}
                                value={m}
                                onSelect={(val) => {
                                  updateField("predio", "municipio", val)
                                  setMunicipioOpen(false)
                                }}
                              >
                                <Check className={`mr-2 h-4 w-4 ${formData.predio.municipio === m ? 'opacity-100' : 'opacity-0'}`} />
                                {m}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {errors['predio.municipio'] && <p role="alert" className="text-sm text-red-500">{errors['predio.municipio']}</p>}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="vereda">Vereda <span className="text-red-500">*</span></Label>
                  <Input
                    id="vereda"
                    value={formData.predio.vereda}
                    onChange={(e) => updateField("predio", "vereda", e.target.value)}
                    placeholder="Nombre de la vereda"
                    className={`h-11 ${errors['predio.vereda'] ? 'border-red-500' : ''}`}
                  />
                  {errors['predio.vereda'] && <p role="alert" className="text-sm text-red-500">{errors['predio.vereda']}</p>}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="direccion">Dirección o corregimiento</Label>
                  <Input
                    id="direccion"
                    value={formData.predio.direccion}
                    onChange={(e) => updateField("predio", "direccion", e.target.value)}
                    placeholder="Dirección o corregimiento del predio"
                    className="h-11"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                  <Label>Tipo de Tenencia <span className="text-red-500">*</span></Label>
                  <Popover open={tenenciaOpen} onOpenChange={setTenenciaOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={tenenciaOpen}
                        className={`w-full h-11 justify-between font-normal ${errors['predio.tipoTenencia'] ? 'border-red-500' : ''}`}
                      >
                        {formData.predio.tipoTenencia || "Seleccione tipo de tenencia"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar tipo de tenencia..." />
                        <CommandList>
                          <CommandEmpty>No se encontró.</CommandEmpty>
                          <CommandGroup>
                            {tiposTenencia.map((t) => (
                              <CommandItem
                                key={t}
                                value={t}
                                onSelect={(val) => {
                                  updateField("predio", "tipoTenencia", val)
                                  setTenenciaOpen(false)
                                }}
                              >
                                <Check className={`mr-2 h-4 w-4 ${formData.predio.tipoTenencia === t ? 'opacity-100' : 'opacity-0'}`} />
                                {t}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {errors['predio.tipoTenencia'] && <p role="alert" className="text-sm text-red-500">{errors['predio.tipoTenencia']}</p>}
                </div>
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                      <SelectItem value="Cerca">Cerca</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                      <SelectItem value="Si">Sí</SelectItem>
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
                  Ubicación del Predio <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
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
                  initialLocation={formData.predio.tipoUbicacion ? {
                    latitud: formData.predio.latitud,
                    longitud: formData.predio.longitud,
                    poligono: formData.predio.poligono,
                    tipoUbicacion: formData.predio.tipoUbicacion,
                  } : undefined}
                  municipio={formData.predio.municipio}
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                      <SelectItem value="26-50% Ondulada">26-50% Ondulada</SelectItem>
                      <SelectItem value="51%> Pendiente">{">"} 51% Pendiente pronunciada</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors['caracterizacion.topografia'] && <p role="alert" className="text-sm text-red-500">{errors['caracterizacion.topografia']}</p>}
                </div>
              </div>

              {/* Cobertura vegetal */}
              <div className="space-y-3">
                <Label>Cobertura Vegetal</Label>
                <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                  <div className="flex items-center gap-3 min-h-[44px] cursor-pointer select-none">
                    <Checkbox
                      id="coberturaBosque"
                      checked={formData.caracterizacion.coberturaBosque}
                      onCheckedChange={(checked) => updateField("caracterizacion", "coberturaBosque", checked)}
                    />
                    <Label htmlFor="coberturaBosque">Bosque</Label>
                  </div>
                  <div className="flex items-center gap-3 min-h-[44px] cursor-pointer select-none">
                    <Checkbox
                      id="coberturaCultivos"
                      checked={formData.caracterizacion.coberturaCultivos}
                      onCheckedChange={(checked) => updateField("caracterizacion", "coberturaCultivos", checked)}
                    />
                    <Label htmlFor="coberturaCultivos">Cultivos</Label>
                  </div>
                  <div className="flex items-center gap-3 min-h-[44px] cursor-pointer select-none">
                    <Checkbox
                      id="coberturaPastos"
                      checked={formData.caracterizacion.coberturaPastos}
                      onCheckedChange={(checked) => updateField("caracterizacion", "coberturaPastos", checked)}
                    />
                    <Label htmlFor="coberturaPastos">Pastos</Label>
                  </div>
                  <div className="flex items-center gap-3 min-h-[44px] cursor-pointer select-none">
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
              {/* Abastecimiento de agua */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Fuentes de Abastecimiento de Agua <span className="text-red-500">*</span></Label>
                {errors['abastecimientoAgua'] && <p role="alert" className="text-sm text-red-500">{errors['abastecimientoAgua']}</p>}
                <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                  <div className="flex items-center gap-3 min-h-[44px] cursor-pointer select-none">
                    <Checkbox
                      id="nacimientoManantial"
                      checked={formData.abastecimientoAgua.nacimientoManantial}
                      onCheckedChange={(checked) => updateField("abastecimientoAgua", "nacimientoManantial", checked)}
                    />
                    <Label htmlFor="nacimientoManantial">Nacimiento/Manantial</Label>
                  </div>
                  <div className="flex items-center gap-3 min-h-[44px] cursor-pointer select-none">
                    <Checkbox
                      id="rioQuebrada"
                      checked={formData.abastecimientoAgua.rioQuebrada}
                      onCheckedChange={(checked) => updateField("abastecimientoAgua", "rioQuebrada", checked)}
                    />
                    <Label htmlFor="rioQuebrada">Río/Quebrada</Label>
                  </div>
                  <div className="flex items-center gap-3 min-h-[44px] cursor-pointer select-none">
                    <Checkbox
                      id="pozo"
                      checked={formData.abastecimientoAgua.pozo}
                      onCheckedChange={(checked) => updateField("abastecimientoAgua", "pozo", checked)}
                    />
                    <Label htmlFor="pozo">Pozo</Label>
                  </div>
                  <div className="flex items-center gap-3 min-h-[44px] cursor-pointer select-none">
                    <Checkbox
                      id="acueductoRural"
                      checked={formData.abastecimientoAgua.acueductoRural}
                      onCheckedChange={(checked) => updateField("abastecimientoAgua", "acueductoRural", checked)}
                    />
                    <Label htmlFor="acueductoRural">Acueducto Rural</Label>
                  </div>
                  <div className="flex items-center gap-3 min-h-[44px] cursor-pointer select-none">
                    <Checkbox
                      id="canalDistritoRiego"
                      checked={formData.abastecimientoAgua.canalDistritoRiego}
                      onCheckedChange={(checked) => updateField("abastecimientoAgua", "canalDistritoRiego", checked)}
                    />
                    <Label htmlFor="canalDistritoRiego">Canal/Distrito Riego</Label>
                  </div>
                  <div className="flex items-center gap-3 min-h-[44px] cursor-pointer select-none">
                    <Checkbox
                      id="jagueyReservorio"
                      checked={formData.abastecimientoAgua.jagueyReservorio}
                      onCheckedChange={(checked) => updateField("abastecimientoAgua", "jagueyReservorio", checked)}
                    />
                    <Label htmlFor="jagueyReservorio">Jagüey/Reservorio</Label>
                  </div>
                  <div className="flex items-center gap-3 min-h-[44px] cursor-pointer select-none">
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
                <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                  <div className="flex items-center gap-3 min-h-[44px] cursor-pointer select-none">
                    <Checkbox
                      id="inundacion"
                      checked={formData.riesgos.inundacion}
                      onCheckedChange={(checked) => updateField("riesgos", "inundacion", checked)}
                    />
                    <Label htmlFor="inundacion">Inundación</Label>
                  </div>
                  <div className="flex items-center gap-3 min-h-[44px] cursor-pointer select-none">
                    <Checkbox
                      id="sequia"
                      checked={formData.riesgos.sequia}
                      onCheckedChange={(checked) => updateField("riesgos", "sequia", checked)}
                    />
                    <Label htmlFor="sequia">Sequía</Label>
                  </div>
                  <div className="flex items-center gap-3 min-h-[44px] cursor-pointer select-none">
                    <Checkbox
                      id="viento"
                      checked={formData.riesgos.viento}
                      onCheckedChange={(checked) => updateField("riesgos", "viento", checked)}
                    />
                    <Label htmlFor="viento">Vientos Fuertes</Label>
                  </div>
                  <div className="flex items-center gap-3 min-h-[44px] cursor-pointer select-none">
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
              {/* Sistema productivo actual — combobox con búsqueda */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Sistema Productivo Actual <span className="text-red-500">*</span></Label>
                  <Popover open={sistemaProductivoOpen} onOpenChange={setSistemaProductivoOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={sistemaProductivoOpen}
                        className={`w-full h-11 justify-between font-normal ${errors['areaProductiva.sistemaProductivo'] ? 'border-red-500' : ''}`}
                      >
                        {formData.areaProductiva.sistemaProductivo || "Seleccione cultivo / actividad"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar cultivo..." />
                        <CommandList>
                          <CommandEmpty>No se encontró.</CommandEmpty>
                          <CommandGroup>
                            {cultivosSantander.map((c) => (
                              <CommandItem
                                key={c}
                                value={c}
                                onSelect={(val) => {
                                  updateField("areaProductiva", "sistemaProductivo", val)
                                  setSistemaProductivoOpen(false)
                                }}
                              >
                                <Check className={`mr-2 h-4 w-4 ${formData.areaProductiva.sistemaProductivo === c ? 'opacity-100' : 'opacity-0'}`} />
                                {c}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {errors['areaProductiva.sistemaProductivo'] && <p role="alert" className="text-sm text-red-500">{errors['areaProductiva.sistemaProductivo']}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estadoCultivo">Estado del cultivo actual</Label>
                  <Select
                    value={formData.areaProductiva.estadoCultivo}
                    onValueChange={(value) => updateField("areaProductiva", "estadoCultivo", value)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Seleccione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bueno">Bueno</SelectItem>
                      <SelectItem value="Regular">Regular</SelectItem>
                      <SelectItem value="Malo">Malo</SelectItem>
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

              {/* Sistema productivo de interés en el programa */}
              <div className="border-t pt-4 space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Interés en el Programa</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Sistema Productivo de Interés en el Programa</Label>
                    <Popover open={sistemaIntereOpen} onOpenChange={setSistemaIntereOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={sistemaIntereOpen}
                          className="w-full h-11 justify-between font-normal"
                        >
                          {formData.areaProductiva.sistemaProductivoInteres || "Seleccione cultivo"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar cultivo..." />
                          <CommandList>
                            <CommandEmpty>No se encontró.</CommandEmpty>
                            <CommandGroup>
                              {cultivosPrograma.map((c) => (
                                <CommandItem
                                  key={c}
                                  value={c}
                                  onSelect={(val) => {
                                    updateField("areaProductiva", "sistemaProductivoInteres", val)
                                    setSistemaIntereOpen(false)
                                  }}
                                >
                                  <Check className={`mr-2 h-4 w-4 ${formData.areaProductiva.sistemaProductivoInteres === c ? 'opacity-100' : 'opacity-0'}`} />
                                  {c}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="hectareasSiembraNueva">Hectáreas Siembra Nueva</Label>
                    <Input
                      id="hectareasSiembraNueva"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={formData.areaProductiva.hectareasSiembraNueva ?? ""}
                      onChange={(e) => updateField("areaProductiva", "hectareasSiembraNueva", e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="Hectáreas"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hectareasRenovacion">Hectáreas Renovación</Label>
                    <Input
                      id="hectareasRenovacion"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={formData.areaProductiva.hectareasRenovacion ?? ""}
                      onChange={(e) => updateField("areaProductiva", "hectareasRenovacion", e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="Hectáreas"
                      className="h-11"
                    />
                  </div>
                </div>
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              {/* Foto del beneficiario */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Foto del Beneficiario</Label>
                <PhotoUpload
                  onPhotoCapture={(dataUrl) => updateField("archivos", "fotoBeneficiario", dataUrl)}
                  currentPhoto={formData.archivos.fotoBeneficiario}
                  label="Foto del Productor"
                  guideType="persona"
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
                      guideType="documento"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm text-muted-foreground">Reverso del documento</Label>
                    <PhotoUpload
                      onPhotoCapture={(dataUrl) => updateField("archivos", "fotoDocTraseraUrl", dataUrl)}
                      currentPhoto={formData.archivos.fotoDocTraseraUrl}
                      label="Foto reverso del documento"
                      guideType="documento"
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
                {errors['archivos.firmaProductorUrl'] && <p role="alert" className="text-sm text-red-500">{errors['archivos.firmaProductorUrl']}</p>}
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
                        Conozco y autorizo que he suministrado datos personales a CONSULTORES Y OPERADORES AGROINDUSTRIALES S.A.S. (en adelante &ldquo;COA&rdquo; o la &ldquo;Compañía&rdquo;), para que, por sí mismo o en asocio con terceros, almacene, registre, transmita, transfiera, use, circule y suprima mis datos personales en sus bases de datos bajo estrictas medidas de confidencialidad y seguridad con el fin de que sean objeto de tratamiento, incluyendo cualquier operación o conjunto de operaciones sobre datos personales, bajo los efectos que indica la Ley 1266 de 2008 y la Ley 1581 de 2012; y manifiesto que conozco y autorizo a que mis datos personales serán tratados conforme se dispone en la política de tratamiento de datos de COA.
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
                        He leído la Política de Tratamiento de Datos <span className="text-red-500">*</span>
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Declaro conocer la Política de Tratamiento de Datos de COA (SIG-62) y mis derechos como titular.
                      </p>
                      <div className="flex flex-wrap gap-3 mt-1">
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

                {/* 3. Consulta crediticia (temporal: desactivada) */}
                {SHOW_CONSULTA_CREDITICIA && (
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
                )}
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

              {/* Verificación de seguridad Cloudflare Turnstile (solo para usuarios no autenticados) */}
              {!isAuthenticated && !isAsesor && !!turnstileSiteKey && isOnline && (
                <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-3">
                  <Label className="font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Verificación de seguridad <span className="text-red-500">*</span>
                  </Label>
                  <Turnstile
                    ref={turnstileRef}
                    siteKey={turnstileSiteKey}
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
                disabled={isSubmitting || !formData.autorizaciones.autorizacionDatosPersonales || !formData.autorizaciones.autorizacionAvisoPrivacidad || (isOnline && !captchaValid)}
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
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5"
      >
        <header className="border-b border-border bg-card/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/icons/icon-192x192.png" alt="Santander Agro360" width={60} height={60} className="rounded-xl" />
            </Link>
            </div>
        </header>
        <main className="mx-auto max-w-2xl px-4 py-12">
          <Card className="text-center">
            <CardHeader className="pb-4">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.2 }}
                className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10"
              >
                <CheckCircle className="h-10 w-10 text-green-500" />
              </motion.div>
              <CardTitle className="text-2xl">
                {submittedData.sincronizado ? '¡Registrado!' : 'Guardado localmente'}
              </CardTitle>
              <CardDescription>
                {submittedData.sincronizado
                  ? 'El formulario se envió correctamente al servidor.'
                  : 'El formulario se guardó en este dispositivo y se sincronizará cuando haya conexión.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {submittedData.sincronizado && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                  <p className="mb-1 text-xs text-muted-foreground">Radicado oficial</p>
                  <code className="font-mono text-xs text-muted-foreground">{submittedData.radicado}</code>
                </div>
              )}

              <div className="space-y-3">
                {submittedData.sincronizado ? (
                  <Alert className="border-green-500/20 bg-green-500/5">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-foreground">
                      Tu registro fue recibido por el servidor y está disponible en el sistema.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="border-amber-500/30 bg-amber-500/10">
                    <WifiOff className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-foreground space-y-1">
                      <p>El formulario está guardado en este dispositivo.</p>
                      <p className="text-xs text-muted-foreground">Al recuperar la conexión e iniciar sesión, se sincronizará automáticamente.</p>
                    </AlertDescription>
                  </Alert>
                )}
                {!isAuthenticated && formData.beneficiario.correo && (
                  <Alert className="border-primary/20 bg-primary/5">
                    <Info className="h-4 w-4 text-primary" />
                    <AlertDescription className="text-foreground space-y-1">
                      <p>Se enviará un correo a <strong>{formData.beneficiario.correo}</strong> con tus credenciales de acceso para consultar tus registros.</p>
                      <p className="text-xs text-muted-foreground">Si no lo encuentras en tu bandeja principal, revisa la carpeta de <strong>correo no deseado o spam</strong>.</p>
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
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="min-h-screen bg-gradient-to-b from-background to-muted/20"
    >
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Image src="/icons/icon-192x192.png" alt="Santander Agro360" width={60} height={60} className="rounded-xl" />
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
        <div className="mx-auto max-w-5xl px-4 py-2">

          {/* Móvil: barra compacta (< 768px) */}
          <div className="flex md:hidden items-center gap-3 py-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {currentStep}/{steps.length}
            </span>
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(currentStep / steps.length) * 100}%`,
                  background: 'oklch(0.45 0.18 145)',
                  boxShadow: '0 0 8px oklch(0.45 0.18 145 / 0.5)',
                  transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            </div>
            <span className="text-xs font-medium text-foreground whitespace-nowrap">
              {steps[currentStep - 1]?.title}
            </span>
          </div>

          {/* Tablet: íconos + título solo del paso activo (768px–1023px) */}
          <div className="hidden md:flex lg:hidden items-center justify-between gap-0.5 py-1">
            {steps.map((step) => {
              const Icon = step.icon
              const isActive = step.id === currentStep
              const isCompleted = step.id < currentStep
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => goToStep(step.id)}
                  aria-current={isActive ? "step" : undefined}
                  aria-label={`Paso ${step.id}: ${step.title}`}
                  className={`flex flex-col items-center gap-1 flex-1 min-h-[44px] py-1 rounded-lg transition-colors ${isActive ? "bg-primary/10" : ""}`}
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 ${
                      isActive ? "bg-primary text-primary-foreground"
                      : isCompleted ? "bg-primary/80 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                    }`}
                    style={isActive ? {boxShadow: '0 0 0 3px oklch(0.45 0.18 145 / 0.25), 0 0 12px oklch(0.45 0.18 145 / 0.2)'} : {}}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  {isActive && (
                    <span className="text-[10px] font-semibold text-primary text-center leading-tight px-0.5">
                      {step.title}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Escritorio: pastillas completas (≥ 1024px) */}
          <div className="hidden lg:flex items-center justify-between gap-1">
            {steps.map((step) => {
              const Icon = step.icon
              const isActive = step.id === currentStep
              const isCompleted = step.id < currentStep
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => goToStep(step.id)}
                  aria-current={isActive ? "step" : undefined}
                  aria-label={`Paso ${step.id}: ${step.title}${isCompleted ? ' (completado)' : isActive ? ' (actual)' : ''}`}
                  className={`flex flex-col items-center gap-1 min-w-[60px] p-2 rounded-lg transition-colors ${isActive ? "bg-primary/10" : isCompleted ? "bg-muted/60" : ""}`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isCompleted
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                    }`}
                    style={isActive ? {boxShadow: '0 0 0 3px oklch(0.45 0.18 145 / 0.25), 0 0 12px oklch(0.45 0.18 145 / 0.2)'} : {}}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className={`text-[10px] text-center leading-tight ${isActive ? "font-medium text-primary" : isCompleted ? "text-muted-foreground" : ""}`}>
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
        <div className="mb-4">
          <OfflineSyncBanner
            isOnline={isOnline}
            pendingCount={pendingCount}
            isSyncing={isSyncing}
            onSyncNow={syncPending}
            isAsesor={isAsesor}
          />
        </div>
        {/* Banner de errores — único, siempre visible al tope del contenido */}
        {showErrors && Object.keys(errors).length > 0 && (
          <div
            ref={errorBannerRef}
            role="alert"
            aria-live="assertive"
            className="mb-4 flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-semibold text-destructive">Corrige los siguientes errores antes de continuar:</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-destructive/90">
                {Object.values(errors).map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: stepDirection * 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: stepDirection * -24 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="gap-2 h-11 px-5 md:h-12 md:px-8 md:text-base"
          >
            <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
            Anterior
          </Button>

          {currentStep < steps.length && (
            <Button onClick={nextStep} className="gap-2 h-11 px-5 md:h-12 md:px-8 md:text-base">
              Siguiente
              <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
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
    </motion.div>
  )
}
