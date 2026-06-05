import Dexie, { type EntityTable } from 'dexie'

export interface PendingForm {
  id?: number
  localId: string
  payload: Record<string, unknown>
  createdAt: number
  retries: number
}

class OfflineDB extends Dexie {
  pendingForms!: EntityTable<PendingForm, 'id'>

  constructor() {
    super('agro360-offline')
    this.version(1).stores({
      pendingForms: '++id, localId, createdAt',
    })
  }
}

let _db: OfflineDB | null = null

export function getOfflineDB(): OfflineDB {
  if (!_db) _db = new OfflineDB()
  return _db
}

export async function savePendingForm(payload: Record<string, unknown>): Promise<string> {
  const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const db = getOfflineDB()
  // Máximo 1 formulario pendiente: evita acumular copias offline que luego
  // se sincronizan en lote y generan duplicados.
  const pendientes = await db.pendingForms.count()
  if (pendientes >= 1) {
    throw new Error('Ya hay un formulario guardado sin sincronizar. Recupera la conexión y sincronízalo antes de guardar otro.')
  }
  try {
    await db.pendingForms.add({ localId, payload, createdAt: Date.now(), retries: 0 })
  } catch (err) {
    const name = (err as DOMException | Error)?.name ?? ''
    const message = (err as Error)?.message ?? ''
    if (name === 'QuotaExceededError' || message.toLowerCase().includes('quota')) {
      throw new Error('Storage del dispositivo lleno. Libere espacio e intente de nuevo.')
    }
    throw err
  }
  return localId
}

export async function getPendingForms(): Promise<PendingForm[]> {
  const db = getOfflineDB()
  return db.pendingForms.toArray()
}

export async function deletePendingForm(id: number): Promise<void> {
  const db = getOfflineDB()
  await db.pendingForms.delete(id)
}

export async function incrementRetry(id: number): Promise<void> {
  const db = getOfflineDB()
  try {
    await db.pendingForms
      .where('id')
      .equals(id)
      .modify((form) => { form.retries += 1 })
  } catch (err) {
    const name = (err as DOMException | Error)?.name ?? ''
    const message = (err as Error)?.message ?? ''
    if (name === 'QuotaExceededError' || message.toLowerCase().includes('quota')) {
      throw new Error('Storage del dispositivo lleno. Libere espacio e intente de nuevo.')
    }
    throw err
  }
}

export async function countPendingForms(): Promise<number> {
  const db = getOfflineDB()
  return db.pendingForms.count()
}
