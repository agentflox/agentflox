import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'AgentFlox Pricing – AI Agent Plans Starting Free',
    description: 'Start free with AgentFlox AI agents. Upgrade to Business at $99/mo for unlimited agents and 50k executions. Enterprise plans available for large-scale AI workforce orchestration.',
    keywords: [
        'ai agent platform pricing',
        'ai agent cost',
        'autonomous agent pricing',
        'agentflox pricing',
        'ai agent plans',
        'ai workflow cost',
        'enterprise ai agents',
    ],
    alternates: {
        canonical: 'https://agentflox.com/pricing',
    },
    openGraph: {
        title: 'AgentFlox Pricing – AI Agent Plans Starting Free',
        description: 'Start free with AgentFlox AI agents. Upgrade to Business at $99/mo for unlimited agents and 50k executions.',
        url: 'https://agentflox.com/pricing',
        siteName: 'AgentFlox',
        images: [{ url: '/images/og-pricing.png', width: 1200, height: 630, alt: 'AgentFlox Pricing' }],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        site: '@agentflox',
        title: 'AgentFlox Pricing – AI Agent Plans Starting Free',
        description: 'Start free with AgentFlox AI agents. Upgrade to Business at $99/mo for unlimited agents.',
        images: ['/images/og-pricing.png'],
    },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "Product",
                        "name": "AgentFlox Business",
                        "description": "Enterprise-grade AI agent orchestration platform.",
                        "offers": [
                            {
                                "@type": "Offer",
                                "name": "Free",
                                "price": "0",
                                "priceCurrency": "USD"
                            },
                            {
                                "@type": "Offer",
                                "name": "Basic",
                                "price": "29",
                                "priceCurrency": "USD"
                            },
                            {
                                "@type": "Offer",
                                "name": "Business",
                                "price": "99",
                                "priceCurrency": "USD"
                            }
                        ]
                    })
                }}
            />
            {/* FAQ Schema */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "FAQPage",
                        "mainEntity": [
                            {
                                "@type": "Question",
                                "name": "Does Business plan include unlimited agents?",
                                "acceptedAnswer": {
                                    "@type": "Answer",
                                    "text": "Yes, our Business plan allows you to create and orchestrate unlimited autonomous agents."
                                }
                            },
                            {
                                "@type": "Question",
                                "name": "How many executions do I need?",
                                "acceptedAnswer": {
                                    "@type": "Answer",
                                    "text": "Most users start with 5,000 to automate core workflows. You can always upgrade as you scale."
                                }
                            },
                            {
                                "@type": "Question",
                                "name": "Who owns the agents and data?",
                                "acceptedAnswer": {
                                    "@type": "Answer",
                                    "text": "You do. You retain 100% ownership of your prompts, configurations, and generated data."
                                }
                            }
                        ]
                    })
                }}
            />
            {children}
        </>
    );
}
