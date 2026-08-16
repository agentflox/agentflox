import type { Metadata } from "next";
import { Inter } from 'next/font/google';
import { mergeOpenGraph } from '@/utils/utilities//mergeOpenGraph';
import { getServerSideURL } from '@/utils/utilities/getURL';
import "./globals.css";

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
});

export const metadata: Metadata = {
    title: {
        default: "AgentFlox – AI Agent Platform | Build & Deploy Autonomous Agents",
        template: "%s | AgentFlox",
    },
    description: "The #1 AI agent platform. Build autonomous agents, orchestrate multi-agent swarms, automate workflows, and run your entire AI workforce in one connected workspace. Start free.",
    keywords: [
        "AI agent platform",
        "autonomous AI agent",
        "AI agent builder",
        "multi-agent AI",
        "AI workflow automation",
        "AI agents for business",
        "build AI agent",
        "AI orchestration platform",
        "AI agent marketplace",
        "agentic AI",
        "AI workforce",
        "no-code AI agent",
        "AI automation platform",
        "AgentFlox",
    ],
    authors: [{ name: "AgentFlox", url: "https://agentflox.com" }],
    creator: "AgentFlox",
    publisher: "AgentFlox",
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-snippet': -1,
            'max-image-preview': 'large',
            'max-video-preview': -1,
        },
    },
    metadataBase: new URL(getServerSideURL()),
    openGraph: mergeOpenGraph({
        title: "AgentFlox – AI Agent Platform | Build & Deploy Autonomous Agents",
        description: "The #1 AI agent platform. Build autonomous agents, orchestrate multi-agent swarms, automate workflows, and run your AI workforce in one connected workspace. Start free.",
        siteName: "AgentFlox",
        locale: "en_US",
        type: "website",
    }),
    twitter: {
        card: 'summary_large_image',
        site: '@agentflox',
        creator: '@agentflox',
        title: "AgentFlox – AI Agent Platform | Build & Deploy Autonomous Agents",
        description: "The #1 AI agent platform. Build autonomous agents, orchestrate multi-agent swarms, automate workflows, and run your AI workforce in one workspace.",
        images: [{
            url: '/images/og-image.png',
            width: 1200,
            height: 630,
            alt: 'AgentFlox – AI Agent Platform',
        }],
    },
    icons: {
        icon: [
            { url: "/favicon.ico", media: "(prefers-color-scheme: light)" },
            { url: "/favicon.ico", media: "(prefers-color-scheme: dark)" },
        ],
        apple: "/images/logo.png",
        shortcut: "/images/logo.png",
    },
    manifest: "/site.webmanifest",
    alternates: {
        canonical: "https://agentflox.com",
    },
    verification: {
        google: "gUN7O0xaXUOAZqU8YrSrCsUIJb2gDusjqKYRBQrDgVA", 
    },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${inter.variable} font-sans antialiased bg-[#030303] text-white overflow-x-hidden`}>
                <div className="relative h-full">
                    <main id="home-page" className="h-full">
                        <script
                            type="application/ld+json"
                            dangerouslySetInnerHTML={{
                                __html: JSON.stringify([
                                    {
                                        "@context": "https://schema.org",
                                        "@type": "Organization",
                                        "name": "AgentFlox",
                                        "url": "https://agentflox.com",
                                        "logo": {
                                            "@type": "ImageObject",
                                            "url": "https://agentflox.com/images/logo.png",
                                            "width": 512,
                                            "height": 512
                                        },
                                        "description": "AgentFlox is the leading AI agent platform for building, deploying, and orchestrating autonomous AI agents and multi-agent workforces.",
                                        "foundingDate": "2024",
                                        "sameAs": [
                                            "https://twitter.com/agentflox",
                                            "https://www.linkedin.com/company/agentflox",
                                            "https://www.facebook.com/agentflox",
                                            "https://github.com/agentflox"
                                        ],
                                        "contactPoint": {
                                            "@type": "ContactPoint",
                                            "contactType": "sales",
                                            "url": "https://agentflox.com/contact"
                                        }
                                    },
                                    {
                                        "@context": "https://schema.org",
                                        "@type": "SoftwareApplication",
                                        "name": "AgentFlox",
                                        "applicationCategory": "BusinessApplication",
                                        "operatingSystem": "Web",
                                        "url": "https://agentflox.com",
                                        "description": "AI agent platform for building and deploying autonomous agents, multi-agent swarms, and AI-powered workflows. No code required.",
                                        "offers": {
                                            "@type": "Offer",
                                            "price": "0",
                                            "priceCurrency": "USD",
                                            "priceValidUntil": "2027-12-31",
                                            "availability": "https://schema.org/InStock"
                                        },
                                        "screenshot": "https://agentflox.com/images/og-image.png",
                                        "featureList": [
                                            "AI Agent Builder",
                                            "Multi-Agent Orchestration",
                                            "AI Workflow Automation",
                                            "Agent Memory & RAG",
                                            "MCP Tool Integration",
                                            "Enterprise Security"
                                        ]
                                    },
                                    {
                                        "@context": "https://schema.org",
                                        "@type": "WebSite",
                                        "name": "AgentFlox",
                                        "url": "https://agentflox.com",
                                        "potentialAction": {
                                            "@type": "SearchAction",
                                            "target": {
                                                "@type": "EntryPoint",
                                                "urlTemplate": "https://agentflox.com/search?q={search_term_string}"
                                            },
                                            "query-input": "required name=search_term_string"
                                        }
                                    }
                                ])
                            }}
                        />
                        {children}
                        <style>{`
            @keyframes blob {
              0%, 100% { transform: translate(0, 0) scale(1); }
              33% { transform: translate(30px, -50px) scale(1.1); }
              66% { transform: translate(-20px, 20px) scale(0.9); }
            }
            .animate-blob { animation: blob 7s infinite; }
            .animation-delay-2000 { animation-delay: 2s; }
            .animation-delay-4000 { animation-delay: 4s; }
          `}</style>
                    </main>
                </div>
            </body>
        </html>
    );
}
