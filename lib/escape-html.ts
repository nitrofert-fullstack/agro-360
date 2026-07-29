// lib/escape-html.ts
// Escapa texto arbitrario antes de interpolarlo en HTML construido a mano
// (popups de mapa vía bindPopup/setHTML). Usar siempre que el valor venga
// de datos de usuario (nombre de predio, municipio, vereda, productor, etc.)
// para evitar XSS almacenado.

export function escapeHtml(value: unknown): string {
  const str = String(value ?? '')
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
