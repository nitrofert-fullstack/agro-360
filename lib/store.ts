// Types for the characterization system

export interface DatosTecnico {
  nombreTecnico: string
  fecha: string
  departamento: string
  municipio: string
  corregimiento: string
  vereda: string
}

export interface InformacionFamiliar {
  nombreProductor: string
  tipoDocumento: "CC" | "TI" | "CE" | "Pasaporte"
  numeroDocumento: string
  genero: "Masculino" | "Femenino" | "Otro"
  etnia: string
  fechaNacimiento: string
  estadoCivil: "Soltero" | "Casado" | "Union Libre" | "Viudo" | "Divorciado"
  telefono: string
  correo: string
  nivelEducativo: string
  actividadPrincipal: string
  personasHogar: number
  menoresEdad: number
  adultosMayores: number
  personasDiscapacidad: number
}

export interface DatosPredio {
  nombrePredio: string
  latitud: number
  longitud: number
  poligono?: [number, number][] // Array of [lat, lng] coordinates
  tipoUbicacion: "punto" | "poligono"
  areaTotal: number
  areaProductiva: number
  tenencia: "Propia" | "Arrendada" | "Comodato" | "Posesion" | "Otra"
  tiempoTenencia: string
  documentoTenencia: string
}

export interface DescripcionFisica {
  topografia: "Plana" | "Ondulada" | "Quebrada" | "Escarpada"
  coberturaVegetal: string[]
  fuentesAgua: string[]
  tipoSuelo: string
  riesgosNaturales: string[]
  viaAcceso: "Pavimentada" | "Destapada" | "Trocha" | "Fluvial"
  distanciaCabecera: number
}

export interface AreaProductiva {
  cultivosPrincipales: {
    nombre: string
    area: number
    produccion: number
    destino: string
  }[]
  actividadesPecuarias: {
    tipo: string
    cantidad: number
    destino: string
  }[]
  sistemasProductivos: string[]
  practicasSostenibles: string[]
}

export interface InformacionFinanciera {
  ingresosMensuales: string
  fuentesIngreso: string[]
  accesoCredito: boolean
  entidadCredito?: string
  perteneceAsociacion: boolean
  nombreAsociacion?: string
}

export interface Caracterizacion {
  id: string
  estado: "pendiente" | "en_revision" | "aprobada" | "rechazada"
  fechaCreacion: string
  fechaActualizacion: string
  observacionesAdmin?: string
  datosTecnico: DatosTecnico
  informacionFamiliar: InformacionFamiliar
  datosPredio: DatosPredio
  descripcionFisica: DescripcionFisica
  areaProductiva: AreaProductiva
  informacionFinanciera: InformacionFinanciera
  autorizacionDatos: boolean
}

// Local storage key
const STORAGE_KEY = "agrosantander_caracterizaciones"

// Store functions
export function getCaracterizaciones(): Caracterizacion[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(STORAGE_KEY)
  return data ? JSON.parse(data) : []
}

export function getCaracterizacion(id: string): Caracterizacion | undefined {
  const caracterizaciones = getCaracterizaciones()
  return caracterizaciones.find((c) => c.id === id)
}

export function saveCaracterizacion(caracterizacion: Omit<Caracterizacion, "id" | "estado" | "fechaCreacion" | "fechaActualizacion">): Caracterizacion {
  const caracterizaciones = getCaracterizaciones()
  const newCaracterizacion: Caracterizacion = {
    ...caracterizacion,
    id: `CAR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    estado: "pendiente",
    fechaCreacion: new Date().toISOString(),
    fechaActualizacion: new Date().toISOString(),
  }
  caracterizaciones.push(newCaracterizacion)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(caracterizaciones))
  return newCaracterizacion
}

export function updateCaracterizacion(id: string, updates: Partial<Caracterizacion>): Caracterizacion | undefined {
  const caracterizaciones = getCaracterizaciones()
  const index = caracterizaciones.findIndex((c) => c.id === id)
  if (index === -1) return undefined
  
  caracterizaciones[index] = {
    ...caracterizaciones[index],
    ...updates,
    fechaActualizacion: new Date().toISOString(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(caracterizaciones))
  return caracterizaciones[index]
}

export function deleteCaracterizacion(id: string): boolean {
  const caracterizaciones = getCaracterizaciones()
  const filtered = caracterizaciones.filter((c) => c.id !== id)
  if (filtered.length === caracterizaciones.length) return false
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  return true
}

// Stats
export function getEstadisticas() {
  const caracterizaciones = getCaracterizaciones()
  return {
    total: caracterizaciones.length,
    pendientes: caracterizaciones.filter((c) => c.estado === "pendiente").length,
    enRevision: caracterizaciones.filter((c) => c.estado === "en_revision").length,
    aprobadas: caracterizaciones.filter((c) => c.estado === "aprobada").length,
    rechazadas: caracterizaciones.filter((c) => c.estado === "rechazada").length,
  }
}
