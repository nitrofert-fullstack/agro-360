import React from "react"
import type { Metadata, Viewport } from 'next'
import { Poppins, Plus_Jakarta_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { SessionValidator } from '@/components/session-validator'
import { EnvVarChecker } from '@/components/env-var-checker'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/context/auth-context'
import { SuppressInstallPrompt } from '@/components/suppress-install-prompt'
import { AutoSync } from '@/components/auto-sync'
import './globals.css'

// display 'optional': si la fuente no carga en ~100ms se usa el fallback ajustado
// (next/font calibra métricas → CLS 0) y NO hay re-paint tardío — el swap tardío
// de 'swap' contaba como nuevo LCP y arruinaba la métrica en redes lentas.
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-display',
  display: 'optional',
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'optional',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://santanderagro360.com'),
  title: 'Santander Agro360 - Sistema de Caracterizacion Predial',
  description: 'Sistema de caracterizacion predial con monitoreo NDVI, temperatura y precipitacion en Santander, Colombia',
  openGraph: {
    title: 'Santander Agro360',
    description: 'Sistema de caracterización predial con monitoreo NDVI, temperatura y precipitación en Santander, Colombia',
    url: '/',
    siteName: 'Santander Agro360',
    locale: 'es_CO',
    type: 'website',
    images: [{ url: '/icons/icon-512x512.png', width: 512, height: 512, alt: 'Santander Agro360' }],
  },
  formatDetection: {
    telephone: false,
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    statusBarStyle: 'default',
    title: 'Santander Agro360',
  },
  icons: {
    icon: [
      { url: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png' },
      { url: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${poppins.variable} ${plusJakarta.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <SessionValidator>
              {children}
            </SessionValidator>
            <AutoSync />
          </AuthProvider>
        </ThemeProvider>
        <Toaster richColors position="top-center" />
        <EnvVarChecker />
        <SuppressInstallPrompt />
        <Analytics />
      </body>
    </html>
  )
}
