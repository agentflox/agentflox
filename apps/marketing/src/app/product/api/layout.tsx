import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'AI Agent API & SDK – Developer Platform | AgentFlox',
    description: 'Build on AgentFlox with our REST API, Python SDK, and MCP tool support. Full developer access to orchestrate AI agents and swarms programmatically.',
    keywords: [
        'ai agent api',
        'ai sdk',
        'mcp tools api',
        'developer ai platform',
        'model context protocol',
        'build on agentflox',
        'ai agent integration',
        'programmatic ai agents',
    ],
    alternates: {
        canonical: 'https://agentflox.com/product/api',
    },
    openGraph: {
        title: 'AI Agent API & SDK – Developer Platform | AgentFlox',
        description: 'Build on AgentFlox with our REST API, Python SDK, and MCP tool support. Full developer access to orchestrate AI agents programmatically.',
        url: 'https://agentflox.com/product/api',
        siteName: 'AgentFlox',
        images: [{ url: '/images/og-api.png', width: 1200, height: 630, alt: 'AgentFlox AI Agent API & SDK' }],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        site: '@agentflox',
        title: 'AI Agent API & SDK – Developer Platform | AgentFlox',
        description: 'Build on AgentFlox with our REST API, Python SDK, and MCP tool support.',
        images: ['/images/og-api.png'],
    },
};

export default function APILayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
