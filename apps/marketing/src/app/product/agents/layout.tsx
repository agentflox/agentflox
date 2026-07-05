import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'AI Agent Builder – Build & Deploy Autonomous Agents',
    description: 'Build and deploy sovereign autonomous AI agents in minutes with AgentFlox. No code required. Equip agents with tools, persistent memory, and guardrails. Start free.',
    keywords: [
        'AI agent builder',
        'build autonomous AI agent',
        'autonomous AI agent',
        'no-code AI agent',
        'sovereign AI agent',
        'AI agent platform',
        'deploy AI agents',
        'AI agent tools',
        'agent memory',
        'AI guardrails',
        'AgentFlox agents',
    ],
    alternates: {
        canonical: 'https://agentflox.com/product/agents',
    },
    openGraph: {
        title: 'AI Agent Builder – Build & Deploy Autonomous Agents | AgentFlox',
        description: 'Build and deploy sovereign autonomous AI agents in minutes. No code required. Equip agents with tools, persistent memory, and guardrails.',
        url: 'https://agentflox.com/product/agents',
        siteName: 'AgentFlox',
        images: [{ url: '/images/og-agents.png', width: 1200, height: 630, alt: 'AgentFlox AI Agent Builder' }],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        site: '@agentflox',
        title: 'AI Agent Builder – Build & Deploy Autonomous Agents | AgentFlox',
        description: 'Build and deploy sovereign autonomous AI agents in minutes. No code required. Equip agents with tools, memory, and guardrails.',
        images: ['/images/og-agents.png'],
    },
};

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
