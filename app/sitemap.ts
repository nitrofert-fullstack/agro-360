import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://santanderagro360.com'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE_URL, changeFrequency: 'monthly', priority: 1 },
    { url: `${BASE_URL}/formulario`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/registro`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/status`, changeFrequency: 'monthly', priority: 0.3 },
  ]
}
