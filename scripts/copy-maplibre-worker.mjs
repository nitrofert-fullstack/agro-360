// scripts/copy-maplibre-worker.mjs
// El bundler de Next.js no resuelve el `new Worker(new URL(...))` que
// maplibre-gl arma internamente (ver comentario en components/map-viewer-gl.tsx),
// así que servimos su worker directo desde /public con setWorkerUrl(). El
// worker importa un segundo chunk ("shared") — si falta, el worker nunca
// termina de cargar y el clustering (que corre ahí) no procesa nada, aunque
// el mapa base se vea normal. Este script copia ambos archivos desde
// node_modules a public/ en cada `pnpm install`, para que no dependa de
// copiarlos a mano y se actualicen solos si maplibre-gl sube de versión.

import { copyFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const maplibreDist = join(dirname(require.resolve('maplibre-gl/package.json')), 'dist')

const files = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']

for (const file of files) {
  const src = join(maplibreDist, file)
  const dest = join(rootDir, 'public', file)
  if (!existsSync(src)) {
    console.warn(`[copy-maplibre-worker] falta ${src} — ¿cambió la estructura del paquete maplibre-gl?`)
    continue
  }
  copyFileSync(src, dest)
  console.log(`[copy-maplibre-worker] copiado ${file} -> public/`)
}
