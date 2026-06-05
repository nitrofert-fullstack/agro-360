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
        options: { cacheName: 'api-cache', networkTimeoutSeconds: 10, expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 } },
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
  `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://vitals.vercel-insights.com${isDev ? ' ws:' : ''}`,
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
