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
    metadataBase: new URL(getServerSideURL()),
    openGraph: mergeOpenGraph(),
    twitter: {
      card: 'summary_large_image',
      title: "AgentFlow",
      description: "The connected workspace where better, faster work happens.",
      images: ['/images/logo.png'],
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
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${inter.variable} font-sans antialiased bg-slate-950 text-white`}>
                <div className="relative h-full">
                    <main id="home-page" className="h-full">
                        <script
                            type="application/ld+json"
                            dangerouslySetInnerHTML={{
                                __html: JSON.stringify({
                                    "@context": "https://schema.org",
                                    "@type": "Organization",
                                    "name": "Agentflox",
                                    "url": "https://agentflox.com",
                                    "logo": "https://agentflox.com/logo.png",
                                    "description": "Agentflox is the ultimate platform where innovators, investors, and talented professionals converge to build the future together.",
                                    "sameAs": [
                                        "https://twitter.com/agentflox",
                                        "https://www.linkedin.com/company/agentflox",
                                        "https://www.facebook.com/agentflox"
                                    ]
                                })
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
