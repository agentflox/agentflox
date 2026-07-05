import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'AI Workflow Automation – Visual Builder | AgentFlox',
    description: 'Build intelligent automations with AgentFlox\'s visual AI workflow builder. Connect triggers, conditions, AI agents, and actions with no code needed. Start automating today.',
    keywords: [
        'ai workflow automation',
        'visual workflow builder',
        'workflow automation ai',
        'no-code automation AI',
        'automated workflow software',
        'visual workflow AI',
        'agentic workflows',
        'AI orchestration',
        'AgentFlox workflow',
    ],
    alternates: {
        canonical: 'https://agentflox.com/product/automation',
    },
    openGraph: {
        title: 'AI Workflow Automation – Visual Builder | AgentFlox',
        description: 'Build intelligent automations with AgentFlox\'s visual AI workflow builder. Connect triggers, conditions, AI agents, and actions with no code needed.',
        url: 'https://agentflox.com/product/automation',
        siteName: 'AgentFlox',
        images: [{ url: '/images/og-automation.png', width: 1200, height: 630, alt: 'AgentFlox AI Workflow Automation' }],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        site: '@agentflox',
        title: 'AI Workflow Automation – Visual Builder | AgentFlox',
        description: 'Build intelligent automations with AgentFlox\'s visual AI workflow builder.',
        images: ['/images/og-automation.png'],
    },
};

export default function AutomationLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
