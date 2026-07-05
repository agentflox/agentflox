import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { mergeOpenGraph } from '@/utils/utilities//mergeOpenGraph';
import { getServerSideURL } from '@/utils/utilities/getURL';
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AgentFlox Docs – AI Agent Platform Documentation & Guides",
    template: "%s | AgentFlox Docs",
  },
  description: "Complete documentation for AgentFlox AI agent platform. Build autonomous agents, configure workflows, explore the API reference, and learn with step-by-step tutorials.",
  keywords: [
    "agentflox documentation",
    "ai agent documentation",
    "how to build ai agents",
    "agentflox api reference",
    "ai agent tutorial",
    "autonomous agent guide",
    "ai workflow documentation",
    "mcp tools documentation",
    "AgentFlox",
  ],
  authors: [{ name: "AgentFlox", url: "https://agentflox.com" }],
  creator: "AgentFlox",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' },
  },
  metadataBase: new URL(getServerSideURL()),
  openGraph: mergeOpenGraph({
    title: "AgentFlox Docs – AI Agent Platform Documentation & Guides",
    description: "Complete documentation for AgentFlox AI agent platform. Build autonomous agents, configure workflows, and explore the API reference.",
    siteName: "AgentFlox Docs",
    locale: "en_US",
    type: "website",
  }),
  twitter: {
    card: 'summary_large_image',
    site: '@agentflox',
    creator: '@agentflox',
    title: "AgentFlox Docs – AI Agent Platform Documentation",
    description: "Complete documentation for AgentFlox AI agent platform. Build autonomous agents, configure workflows, and explore the API reference.",
    images: [{ url: '/images/og-image.png', width: 1200, height: 630, alt: 'AgentFlox Documentation' }],
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
    canonical: "https://docs.agentflox.com",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-white dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

