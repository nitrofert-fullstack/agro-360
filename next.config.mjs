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

/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {},
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
        source: '/(admin|dashboard|mapa|profile|settings|consultar)(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, max-age=0',
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
