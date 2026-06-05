// Rate limiter simple en memoria — no persiste entre restarts/instancias
// Suficiente para un solo servidor Next.js; para multi-instancia usar Redis
//
// NOTA multi-instancia: en entornos serverless (Vercel) cada lambda mantiene su
// propio Map en memoria, por lo que este limitador es "best-effort POR INSTANCIA":
// no aplica un límite global compartido. Para un límite estricto y distribuido se
// requiere un store externo (Redis/Upstash). Aun así sirve como primera barrera
// barata contra ráfagas de abuso desde una misma IP.

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

const WINDOW_MS = 60_000 // ventana fija de 60s

// Limpieza perezosa: elimina entradas vencidas para evitar el crecimiento
// ilimitado del Map sin necesidad de un timer/intervalo dedicado.
function sweepExpired(now: number): void {
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key)
  }
}

/**
 * Devuelve true si la petición está dentro del límite, false si lo excede.
 * Ventana fija de 60s por clave.
 * @param ip    Identificador del cliente (normalmente la IP).
 * @param limit Máximo de peticiones permitidas dentro de la ventana de 60s.
 */
export function checkRateLimit(ip: string, limit: number): boolean {
  const now = Date.now()

  // Limpieza perezosa probabilística para no recorrer el Map en cada llamada.
  if (Math.random() < 0.01) sweepExpired(now)

  const entry = store.get(ip)
  if (!entry || entry.resetAt <= now) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }

  if (entry.count >= limit) return false

  entry.count++
  return true
}
