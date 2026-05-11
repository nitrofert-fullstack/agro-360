// Rate limiter simple en memoria — no persiste entre restarts/instancias
// Suficiente para un solo servidor Next.js; para multi-instancia usar Redis

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

export function rateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true // permitido
  }

  if (entry.count >= maxRequests) {
    return false // bloqueado
  }

  entry.count++
  return true // permitido
}
