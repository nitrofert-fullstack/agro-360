// Utilidades de validación y saneamiento de entradas para endpoints API.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Valida que `v` sea un UUID (formato laxo, sin verificar versión/variant). */
export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v)
}

/**
 * Sanea una ruta de storage: solo permite [a-zA-Z0-9/_.-] y rechaza traversal ('..').
 * Devuelve la cadena saneada (sin caracteres no permitidos); si contiene '..' devuelve ''.
 */
export function sanitizeStoragePath(s: string): string {
  const cleaned = s.replace(/[^a-zA-Z0-9/_.-]/g, '')
  if (cleaned.includes('..')) return ''
  return cleaned
}
