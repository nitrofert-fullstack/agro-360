import Dexie, { type EntityTable } from 'dexie'

// Types for offline storage - Estructura que coincide con las tablas de Supabase
export interface CaracterizacionLocal {
  id?: number
  radicadoLocal: string
  radicadoOficial?: string
  estado: 'PENDIENTE_SINCRONIZACION' | 'SINCRONIZADO' | 'ERROR_SINCRONIZACION'
  
  // 1. Datos de la visita
  visita: {
    fechaVisita: string
    horaInicio?: string
    horaFin?: string
    nombreTecnico: string
    departamento: string
    municipio: string
    corregimiento?: string
    vereda: string
    objetivo?: string
    observaciones?: string
  }
  
  // 2. Datos del beneficiario (tabla beneficiarios)
  beneficiario: {
    tipoDocumento: string
    numeroDocumento: string
    primerNombre: string
    segundoNombre?: string
    primerApellido: string
    segundoApellido?: string
    fechaNacimiento?: string
    genero?: string
    grupoEtnico?: string
    discapacidad?: string
    tipoDiscapacidad?: string
    estadoCivil?: string
    nivelEducativo?: string
    telefono?: string
    email?: string
    direccion?: string
    municipio?: string
    vereda?: string
    perteneceAsociacion?: boolean
    nombreAsociacion?: string
    numeroPersonasHogar?: number
    personasMayores60?: number
    personasMenores18?: number
    ocupacionPrincipal?: string
    edad?: number
  }
  
  // 3. Datos del predio (tabla predios)
  predio: {
    nombrePredio: string
    tipoTenencia?: string
    areaTotal?: number
    areaCultivada?: number
    latitud?: number
    longitud?: number
    altitud?: number
    direccion?: string
    codigoCatastral?: string
    fuenteAgua?: string
    accesoVial?: string
    distanciaCabecera?: number
    viveEnPredio?: string
    tieneVivienda?: boolean
    cultivosExistentes?: string
  }
  
  // 4. Caracterización del predio (tabla caracterizacion_predio)
  caracterizacion: {
    topografia?: string
    tipoSuelo?: string
    erosion?: string
    drenaje?: string
    coberturaVegetal?: string
    rutaAcceso?: string
    distanciaKm?: number
    tiempoAcceso?: string
    temperaturaCelsius?: number
    mesesLluvia?: string
    coberturaBosque?: boolean
    coberturaCultivos?: boolean
    coberturaPastos?: boolean
    coberturaRastrojo?: boolean
  }
  
  // 5. Abastecimiento de agua y riesgos
  aguaRiesgos: {
    // Abastecimiento agua (tabla abastecimiento_agua)
    tipoFuenteAgua?: string
    nombreFuente?: string
    disponibilidadAgua?: string
    calidadAgua?: string
    tieneConcesion?: boolean
    nacimientoManantial?: boolean
    rioQuebrada?: boolean
    pozo?: boolean
    acueductoRural?: boolean
    canalDistritoRiego?: boolean
    jagueyReservorio?: boolean
    aguaLluvia?: boolean
    otraFuente?: string
    // Riesgos (tabla riesgos_predio)
    riesgos?: Array<{
      tipo: string
      nivel?: string
      descripcion?: string
    }>
    inundacion?: boolean
    sequia?: boolean
    viento?: boolean
    helada?: boolean
    otrosRiesgos?: string
  }
  
  // 6. Área productiva (tabla area_productiva)
  areaProductiva: {
    cultivoPrincipal?: string
    areaCultivoPrincipal?: number
    produccionEstimada?: number
    destinoProduccion?: string
    tieneGanado?: boolean
    tipoGanado?: string
    cantidadGanado?: number
    sistemaProduccion?: string
    usaAgroquimicos?: boolean
    tieneAsistenciaTecnica?: boolean
    caracterizacionCultivo?: string
    cantidadProduccion?: string
    estadoCultivo?: string
    tieneInfraestructuraProcesamiento?: boolean
    estructuras?: string
    interesadoPrograma?: boolean
    dondeComercializa?: string
    ingresoMensualVentas?: number
  }
  
  // 7. Información financiera (tabla informacion_financiera)
  infoFinanciera: {
    ingresosMensuales?: string
    fuentesIngreso?: string[]
    accesoCredito?: boolean
    entidadCredito?: string
    montoCredito?: number
    recibeSubsidios?: boolean
    tipoSubsidios?: string[]
    ingresosMensualesAgropecuaria?: number
    ingresosMensualesOtros?: number
    egresosMensuales?: number
    activosTotales?: number
    activosAgropecuaria?: number
    pasivosTotales?: number
  }
  
  // 8. Archivos (fotos y firmas)
  archivos: {
    fotoBeneficiario?: string
    fotoBeneficiarioUrl?: string
    foto1?: string
    foto1Url?: string
    foto2?: string
    foto2Url?: string
    firmaProductor?: string
    firmaProductorUrl?: string
  }
  
  // 9. Autorización
  autorizacion: {
    autorizaTratamientoDatos: boolean
    autorizaConsultaCrediticia?: boolean
    firmaDigital?: string
    firmaDigitalUrl?: string
    fechaAutorizacion?: string
  }
  
  // Observaciones generales
  observaciones?: string
  
  // Metadata
  documentoProductor: string
  nombreProductor: string
  asesorId?: string
  asesorEmail?: string
  
  // Timestamps
  fechaRegistro: string
  fechaSincronizacion?: string
  fechaActualizacion: string
  
  // Sync metadata
  intentosSincronizacion: number
  ultimoErrorSincronizacion?: string
}

export interface BackupLocal {
  id?: number
  fecha: string
  datos: CaracterizacionLocal[]
  tipo: 'auto' | 'manual'
}

export interface SyncLog {
  id?: number
  fecha: string
  radicadoLocal: string
  radicadoOficial?: string
  exito: boolean
  mensaje: string
}

// Create Dexie database
class AgroSantanderDB extends Dexie {
  caracterizaciones!: EntityTable<CaracterizacionLocal, 'id'>
  backups!: EntityTable<BackupLocal, 'id'>
  syncLogs!: EntityTable<SyncLog, 'id'>

  constructor() {
    super('AgroSantander360DB')
    
    this.version(2).stores({
      caracterizaciones: '++id, radicadoLocal, radicadoOficial, estado, documentoProductor, fechaRegistro',
      backups: '++id, fecha, tipo',
      syncLogs: '++id, fecha, radicadoLocal, exito'
    })
  }
}

// Singleton instance
export const db = new AgroSantanderDB()

// Helper functions
export function generateRadicadoLocal(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `RAD-LOCAL-${timestamp}-${random}`
}

export async function saveCaracterizacion(data: Omit<CaracterizacionLocal, 'id' | 'radicadoLocal' | 'estado' | 'fechaRegistro' | 'fechaActualizacion' | 'intentosSincronizacion'>): Promise<CaracterizacionLocal> {
  const caracterizacion: CaracterizacionLocal = {
    ...data,
    radicadoLocal: generateRadicadoLocal(),
    estado: 'PENDIENTE_SINCRONIZACION',
    fechaRegistro: new Date().toISOString(),
    fechaActualizacion: new Date().toISOString(),
    intentosSincronizacion: 0,
  }
  
  const id = await db.caracterizaciones.add(caracterizacion)
  
  // Auto backup
  await createAutoBackup()
  
  return { ...caracterizacion, id }
}

export async function updateCaracterizacion(id: number, updates: Partial<CaracterizacionLocal>): Promise<void> {
  await db.caracterizaciones.update(id, {
    ...updates,
    fechaActualizacion: new Date().toISOString(),
  })
}

export async function getCaracterizacionesPendientes(): Promise<CaracterizacionLocal[]> {
  return db.caracterizaciones
    .where('estado')
    .equals('PENDIENTE_SINCRONIZACION')
    .toArray()
}

export async function getCaracterizacionByRadicado(radicado: string): Promise<CaracterizacionLocal | undefined> {
  return db.caracterizaciones
    .where('radicadoLocal')
    .equals(radicado)
    .or('radicadoOficial')
    .equals(radicado)
    .first()
}

export async function getCaracterizacionByDocumento(documento: string): Promise<CaracterizacionLocal[]> {
  return db.caracterizaciones
    .where('documentoProductor')
    .equals(documento)
    .toArray()
}

export async function getAllCaracterizaciones(): Promise<CaracterizacionLocal[]> {
  return db.caracterizaciones.toArray()
}

export async function deleteCaracterizacion(id: number): Promise<void> {
  await db.caracterizaciones.delete(id)
}

export async function markAsSynced(id: number, radicadoOficial: string): Promise<void> {
  await db.caracterizaciones.update(id, {
    estado: 'SINCRONIZADO',
    radicadoOficial,
    fechaSincronizacion: new Date().toISOString(),
    fechaActualizacion: new Date().toISOString(),
  })
}

export async function markAsError(id: number, error: string): Promise<void> {
  const current = await db.caracterizaciones.get(id)
  if (current) {
    await db.caracterizaciones.update(id, {
      estado: 'ERROR_SINCRONIZACION',
      intentosSincronizacion: current.intentosSincronizacion + 1,
      ultimoErrorSincronizacion: error,
      fechaActualizacion: new Date().toISOString(),
    })
  }
}

// Backup functions
export async function createAutoBackup(): Promise<void> {
  try {
    const all = await getAllCaracterizaciones()
    if (all.length === 0) return
    
    await db.backups.add({
      fecha: new Date().toISOString(),
      datos: all,
      tipo: 'auto',
    })
    
    // Keep only last 5 auto backups
    const autoBackups = await db.backups
      .where('tipo')
      .equals('auto')
      .reverse()
      .sortBy('fecha')
    
    if (autoBackups.length > 5) {
      const toDelete = autoBackups.slice(5)
      await db.backups.bulkDelete(toDelete.map(b => b.id!))
    }
  } catch (error) {
    console.error('Error creating auto backup:', error)
  }
}

export async function createManualBackup(): Promise<BackupLocal> {
  const all = await getAllCaracterizaciones()
  const backup: BackupLocal = {
    fecha: new Date().toISOString(),
    datos: all,
    tipo: 'manual',
  }
  
  const id = await db.backups.add(backup)
  return { ...backup, id }
}

export async function exportToJSON(): Promise<string> {
  const all = await getAllCaracterizaciones()
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    version: '2.0',
    caracterizaciones: all,
  }, null, 2)
}

export async function importFromJSON(jsonString: string): Promise<number> {
  const data = JSON.parse(jsonString)
  const caracterizaciones = data.caracterizaciones || []
  
  let imported = 0
  for (const c of caracterizaciones) {
    // Check if already exists
    const existing = await getCaracterizacionByRadicado(c.radicadoLocal)
    if (!existing) {
      await db.caracterizaciones.add({
        ...c,
        id: undefined, // Let Dexie assign new id
      })
      imported++
    }
  }
  
  return imported
}

// Sync log functions
export async function addSyncLog(log: Omit<SyncLog, 'id'>): Promise<void> {
  await db.syncLogs.add(log)
}

export async function getSyncLogs(limit = 50): Promise<SyncLog[]> {
  return db.syncLogs
    .orderBy('fecha')
    .reverse()
    .limit(limit)
    .toArray()
}

// Count functions
export async function countPendientes(): Promise<number> {
  return db.caracterizaciones
    .where('estado')
    .equals('PENDIENTE_SINCRONIZACION')
    .count()
}

export async function countSincronizados(): Promise<number> {
  return db.caracterizaciones
    .where('estado')
    .equals('SINCRONIZADO')
    .count()
}

export async function countTotal(): Promise<number> {
  return db.caracterizaciones.count()
}

// Stats function for sync button
export async function getStats(): Promise<{
  total: number
  pendientes: number
  sincronizados: number
  errores: number
}> {
  const [total, pendientes, sincronizados] = await Promise.all([
    countTotal(),
    countPendientes(),
    countSincronizados(),
  ])
  
  const errores = await db.caracterizaciones
    .where('estado')
    .equals('ERROR_SINCRONIZACION')
    .count()
  
  return {
    total,
    pendientes,
    sincronizados,
    errores,
  }
}
