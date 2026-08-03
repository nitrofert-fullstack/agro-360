import withPWAInit from '@ducanh2912/next-pwa'

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: false,
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
        handler: 'CacheFirst',
        options: { cacheName: 'google-fonts', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
      },
      {
        // Tiles de mapa de CDNs externos (OSM/Carto/OpenTopo/ArcGIS/NASA GIBS).
        // DEBE ir antes de la regla genérica de imágenes: los tiles terminan en
        // .png/.jpg y si no, un paneo del mapa desaloja los iconos de la app.
        urlPattern: /^https:\/\/([a-z0-9-]+\.)?(tile\.openstreetmap\.org|basemaps\.cartocdn\.com|tile\.opentopomap\.org|server\.arcgisonline\.com|gibs\.earthdata\.nasa\.gov)\/.*/i,
        // StaleWhileRevalidate: sirve el tile cacheado de inmediato y lo
        // revalida en segundo plano. Con CacheFirst, un tile corrupto una
        // sola vez quedaba roto hasta expirar el caché (7 dias).
        handler: 'StaleWhileRevalidate',
        options: {
          // v3: nombre nuevo a propósito — abandona el caché viejo (CacheFirst)
          // para no arrastrar tiles "envenenados" (fallos transitorios
          // guardados como si fueran válidos) de antes de este fix.
          cacheName: 'map-tiles-external-v3',
          expiration: { maxEntries: 800, maxAgeSeconds: 60 * 60 * 24 * 7 },
          // Todos estos proveedores mandan Access-Control-Allow-Origin: *, y
          // los TileLayer piden con crossOrigin:true (ver map-viewer.tsx) →
          // respuesta REAL, no opaca. Por eso solo cacheamos 200 genuinos:
          // antes, con respuestas opacas (siempre status 0 aunque el tile
          // realmente hubiera fallado), un glitch transitorio de red podía
          // quedar cacheado como si fuera válido y el tile se veía roto hasta
          // que expirara el caché — la causa del "a veces carga, a veces no".
          cacheableResponse: { statuses: [200] },
          matchOptions: { ignoreVary: true },
        },
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
        handler: 'CacheFirst',
        options: { cacheName: 'images', expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 } },
      },
      {
        // No cachear rutas de API que mutan datos
        urlPattern: /\/api\/(caracterizaciones|sync|sync-public|actualizar-formulario|registro).*/i,
        handler: 'NetworkOnly',
      },
      {
        // Panel admin: siempre datos frescos, nunca offline. Va ANTES de la
        // regla genérica /api/.* — evita que NetworkFirst con caché de 5min
        // sirva un listado de predios viejo/incompleto (el bug de "a veces
        // aparecen los círculos, a veces no" en el mapa admin).
        urlPattern: /\/api\/admin\/.*/i,
        handler: 'NetworkOnly',
      },
      {
        // Cachear tiles de mapa (agro-tile y weather-tile) — va ANTES de la regla genérica /api/.*
        urlPattern: /\/api\/(agro-tile|weather-tile).*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'map-tiles',
          expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 }, // 1h
        },
      },
      {
        // Cachear otros endpoints de solo lectura
        urlPattern: /\/api\/.*/i,
        handler: 'NetworkFirst',
        options: { cacheName: 'api-cache', networkTimeoutSeconds: 3, expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 } },
      },
    ],
  },
})

// === Content-Security-Policy ===
// Inventario real de orígenes que carga el NAVEGADOR (las APIs server-side
// como openweathermap/agromonitoring pasan por route handlers = 'self'):
// - Supabase: REST/Auth/Storage (https) + Realtime (wss)
// - Tiles de mapa (leaflet los carga como <img>): OSM, Carto, OpenTopoMap, ArcGIS, NASA GIBS
// - Avatares: api.dicebear.com
// - Vercel Analytics: script + beacon
// 'unsafe-inline' en script-src es requerido por los inline scripts de hidratación
// de Next.js sin nonces; 'unsafe-eval' SOLO en desarrollo (source maps de next dev).
const supabaseHost = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nwhdnjyxmawxoxjxnyma.supabase.co').replace(/^https:\/\//, '')
const isDev = process.env.NODE_ENV === 'development'
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://va.vercel-scripts.com`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `font-src 'self' data: https://fonts.gstatic.com`,
  `img-src 'self' data: blob: https://${supabaseHost} https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://*.tile.opentopomap.org https://server.arcgisonline.com https://gibs.earthdata.nasa.gov https://api.dicebear.com`,
  // data: en connect-src: MapLibre GL carga sus fuentes 'image' (usadas para
  // el recorte de NDVI al polígono del predio, ver map-viewer-gl.tsx) con
  // fetch() sobre una data: URL generada en el propio canvas — sin esto el
  // navegador la bloquea como violación de CSP y el recorte nunca aparece.
  `connect-src 'self' data: https://${supabaseHost} wss://${supabaseHost} https://vitals.vercel-insights.com https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://*.tile.opentopomap.org https://server.arcgisonline.com https://gibs.earthdata.nasa.gov https://api.dicebear.com${isDev ? ' ws:' : ''}`,
  `worker-src 'self' blob:`,
  `media-src 'self' blob: data:`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  `upgrade-insecure-requests`,
].join('; ')

/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  turbopack: {},
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      '@supabase/supabase-js',
    ],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'api.agromonitoring.com' },
      { protocol: 'https', hostname: 'gibs.earthdata.nasa.gov' },
    ],
  },
  async headers() {
    return [
      {
        // Headers de seguridad globales
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(self), geolocation=(self), microphone=()' },
        ],
      },
      {
        source: '/(admin|dashboard|mapa|profile|settings|consultar)(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/api/agro-tile/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=3600' }],
      },
      {
        source: '/api/weather-tile',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=600, s-maxage=600' }],
      },
    ]
  },
}

export default withPWA(nextConfig)
