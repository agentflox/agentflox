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
  metadataBase: new URL(getServerSideURL()),
  openGraph: mergeOpenGraph(),
  twitter: {
    card: 'summary_large_image',
    title: "NaisCorp",
    description: "The connected workspace where better, faster work happens.",
    images: ['/images/logo.png'],
  },
  icons: {
    icon: [
      { url: "/global/app_logos/favicon.ico", media: "(prefers-color-scheme: light)" },
      { url: "/global/app_logos/favicon.ico", media: "(prefers-color-scheme: dark)" },
    ],
    apple: "/images/logo.png",
    shortcut: "/images/logo.png",
  },
  manifest: "/site.webmanifest",
  alternates: {
    canonical: "https://shopify-app.doc2product.com",
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
