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
    default: "AgentFlox Community – AI Agent Builders Forum & Discussion",
    template: "%s | AgentFlox Community",
  },
  description: "Join the AgentFlox community. Share AI agent workflows, get expert help, discover ready-made templates, and connect with thousands of AI builders worldwide.",
  keywords: [
    "ai agent community",
    "agentflox forum",
    "ai builders community",
    "ai agent help",
    "ai workflow community",
    "autonomous agent forum",
    "ai agent templates",
    "build ai agents together",
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
    title: "AgentFlox Community – AI Agent Builders Forum & Discussion",
    description: "Join the AgentFlox community. Share AI agent workflows, get expert help, and connect with thousands of AI builders worldwide.",
    siteName: "AgentFlox Community",
    locale: "en_US",
    type: "website",
  }),
  twitter: {
    card: 'summary_large_image',
    site: '@agentflox',
    creator: '@agentflox',
    title: "AgentFlox Community – AI Agent Builders Forum",
    description: "Join the AgentFlox community. Share AI agent workflows, get expert help, and connect with thousands of AI builders worldwide.",
    images: [{ url: '/images/og-image.png', width: 1200, height: 630, alt: 'AgentFlox Community' }],
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
    canonical: "https://community.agentflox.com",
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
