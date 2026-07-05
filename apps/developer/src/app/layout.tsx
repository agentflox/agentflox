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
    default: "AgentFlox Developer Portal – AI Agent API, SDK & MCP Tools",
    template: "%s | AgentFlox Developers",
  },
  description: "Build on the AgentFlox AI agent platform. Access REST APIs, Python SDK, MCP tool integrations, webhooks, and a full developer sandbox. Developer documentation and reference.",
  keywords: [
    "agentflox developer api",
    "ai agent sdk",
    "ai agent api",
    "mcp tools api",
    "model context protocol",
    "build on agentflox",
    "ai agent integration",
    "autonomous agent developer",
    "agentflox sdk",
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
    title: "AgentFlox Developer Portal – AI Agent API, SDK & MCP Tools",
    description: "Build on the AgentFlox AI agent platform. REST APIs, Python SDK, MCP tool integrations, webhooks, and a full developer sandbox.",
    siteName: "AgentFlox Developers",
    locale: "en_US",
    type: "website",
  }),
  twitter: {
    card: 'summary_large_image',
    site: '@agentflox',
    creator: '@agentflox',
    title: "AgentFlox Developer Portal – AI Agent API & SDK",
    description: "Build on the AgentFlox AI agent platform. REST APIs, Python SDK, MCP tool integrations, webhooks, and a full developer sandbox.",
    images: [{ url: '/images/og-image.png', width: 1200, height: 630, alt: 'AgentFlox Developer Portal' }],
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
    canonical: "https://developer.agentflox.com",
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

