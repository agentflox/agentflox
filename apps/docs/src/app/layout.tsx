import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
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
    canonical: "https://shopify-app.doc2product.com",
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
        {children}
      </body>
    </html>
  );
}

