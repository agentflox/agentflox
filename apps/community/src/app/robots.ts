import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/admin/',
        '/private/',
        '/_next/',
        '/dashboard/',
        '/auth/',
        '*.json',
        '/cdn-cgi/',
      ],
    },
    sitemap: 'https://agentflox.vercel.app/sitemap.xml',
    host: 'https://agentflox.vercel.app',
  }
}
