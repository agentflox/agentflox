import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
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
      {
        userAgent: 'GPTBot',
        disallow: ['/'],
      },
      {
        userAgent: 'ChatGPT-User',
        disallow: ['/'],
      },
      {
        userAgent: 'Google-Extended',
        allow: ['/'],
      },
    ],
    sitemap: 'https://marketplace.agentflox.com/sitemap.xml',
    host: 'https://marketplace.agentflox.com',
  }
}
