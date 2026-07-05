import React from "react";
import type { Metadata } from "next";
import { Inter } from 'next/font/google';
import Providers from "@/components/providers/Providers";
import { mergeOpenGraph } from '@/utils/utilities//mergeOpenGraph';
import { getServerSideURL } from '@/utils/utilities/getURL';
import { auth } from "@/lib/auth";
import '@llamaindex/chat-ui/styles/markdown.css'
import '@llamaindex/chat-ui/styles/pdf.css'
import '@llamaindex/chat-ui/styles/editor.css'
import "./globals.css";

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: "AgentFlox Marketplace – Browse AI Agents, Templates & Tools",
    template: "%s | AgentFlox Marketplace",
  },
  description: "Browse and deploy 1,000+ pre-built AI agents, workflow templates, and automation tools on the AgentFlox Marketplace. Find the right agent for every job.",
  keywords: [
    "ai agent marketplace",
    "pre-built ai agents",
    "ai agent templates",
    "browse ai agents",
    "buy ai agents",
    "ai workflow templates",
    "automation marketplace",
    "agentflox marketplace",
    "ai tools directory",
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
    title: "AgentFlox Marketplace – Browse AI Agents, Templates & Tools",
    description: "Browse and deploy 1,000+ pre-built AI agents, workflow templates, and automation tools. Find the right agent for every job.",
    siteName: "AgentFlox Marketplace",
    locale: "en_US",
    type: "website",
  }),
  twitter: {
    card: 'summary_large_image',
    site: '@agentflox',
    creator: '@agentflox',
    title: "AgentFlox Marketplace – Browse AI Agents & Templates",
    description: "Browse and deploy 1,000+ pre-built AI agents, workflow templates, and automation tools. Find the right agent for every job.",
    images: [{ url: '/images/og-image.png', width: 1200, height: 630, alt: 'AgentFlox Marketplace' }],
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
    canonical: "https://marketplace.agentflox.com",
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <html lang="en" suppressHydrationWarning>

      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <React.StrictMode>
          <Providers session={session}>
            {children}
          </Providers>
        </React.StrictMode>
      </body>
    </html>
  );
}
