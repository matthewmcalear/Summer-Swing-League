import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://sslgolf.com'
  
  const routes = [
    '',
    '/register',
    '/standings',
    '/scores',
    '/members',
    '/rules',
    '/about',
    '/submit-score',
    '/play',
    '/analytics',
    '/my-bag',
    '/rangefinder',
  ]

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' || route === '/standings' || route === '/scores' ? 'daily' : 'weekly',
    priority: route === '' ? 1.0 : route === '/standings' || route === '/scores' ? 0.9 : 0.8,
  })) as MetadataRoute.Sitemap
}
