import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://community.agentflox.com';
    const now = new Date();

    return [
        {
            url: baseUrl,
            lastModified: now,
            changeFrequency: 'always',
            priority: 1.0,
        },
        {
            url: `${baseUrl}/discussions`,
            lastModified: now,
            changeFrequency: 'always',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/showcase`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/support`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.8,
        }
    ];
}
