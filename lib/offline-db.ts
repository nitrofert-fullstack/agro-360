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
  await db.pendingForms.add({ localId, payload, createdAt: Date.now(), retries: 0 })
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
  await db.pendingForms
    .where('id')
    .equals(id)
    .modify((form) => { form.retries += 1 })
}

export async function countPendingForms(): Promise<number> {
  const db = getOfflineDB()
  return db.pendingForms.count()
}
