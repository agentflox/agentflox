import { MarketplaceListing } from "../types/marketplace.types";

export const mockListings: MarketplaceListing[] = [
  {
    id: "lst-100",
    type: "agent",
    status: "active",
    title: "Senior React Flow Arch-Agent",
    description: "An automated agency bot designed to review React Flow code architecture, optimize node rendering, and suggest layout algorithms. Drop it into any workspace and get AI-driven architectural reviews in seconds.",
    author: {
      id: "auth-1",
      name: "Acme AI Labs",
      verified: true
    },
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    skills: ["React", "React Flow", "Performance", "Optimization"],
    isFree: false,
    priceCredits: 50,
    ratings: {
      average: 4.8,
      totalReviews: 124,
      quality: 4.9,
      communication: 4.5,
      delivery: 4.9
    },
    commentCount: 32,
    downloadCount: 8900,
    version: "2.1.0"
  },
  {
    id: "lst-101",
    type: "talent",
    status: "active",
    title: "Expert Full-Stack Next.js Developer",
    description: "Available for short-term and long-term contracts. I specialize in building resilient, high-concurrency systems and premium UI/UX implementations using the modern Next.js App Router.",
    author: {
      id: "auth-2",
      name: "Michael Chen",
      role: "Senior Engineer",
      verified: true
    },
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    skills: ["React", "Next.js", "Node.js", "PostgreSQL", "TypeScript"],
    budget: { min: 80, max: 150, currency: "USD" },
    location: "San Francisco, CA",
    isRemote: true,
    ratings: {
      average: 5.0,
      totalReviews: 45,
      quality: 5.0,
      communication: 5.0,
      delivery: 5.0
    },
    commentCount: 15,
    applyCount: 4
  },
  {
    id: "lst-102",
    type: "task",
    status: "active",
    title: "Fix Context Menu Rendering Bug in Canvas",
    description: "We are looking for someone to jump in and fix a z-index and portal rendering issue with our custom context menu on a scalable canvas. Repro steps and a sandbox link will be provided.",
    author: {
      id: "auth-3",
      name: "DesignCo",
      verified: false
    },
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    skills: ["React", "CSS", "Canvas"],
    budget: "$500 Fixed",
    isRemote: true,
    commentCount: 2,
    applyCount: 12
  },
  {
    id: "lst-103",
    type: "template",
    status: "active",
    title: "Enterprise SaaS Dashboard Boilerplate",
    description: "A complete starting point for any B2B SaaS. Includes authentication, billing logic via Stripe, multi-tenant RBAC, and beautiful Radix UI components. Used in production by 200+ startups.",
    author: {
      id: "auth-4",
      name: "UI Forge",
      verified: true
    },
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    skills: ["Next.js", "Tailwind CSS", "Prisma", "Stripe"],
    isFree: true,
    ratings: {
      average: 4.9,
      totalReviews: 560,
      quality: 5.0,
      communication: 4.8,
      delivery: 5.0
    },
    commentCount: 128,
    downloadCount: 24000,
    version: "4.0.0"
  },
  {
    id: "lst-104",
    type: "project",
    status: "active",
    title: "AI-powered CRM Automation Pipeline",
    description: "We need an engineer to build an end-to-end CRM automation pipeline that syncs leads across HubSpot, Notion, and Slack with AI-triggered follow-up sequences.",
    author: {
      id: "auth-5",
      name: "GrowthStack",
      verified: true
    },
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    skills: ["Node.js", "HubSpot API", "OpenAI", "Automation"],
    budget: { min: 2500, max: 5000, currency: "USD" },
    isRemote: true,
    commentCount: 5,
    applyCount: 8
  },
  {
    id: "lst-105",
    type: "tool",
    status: "active",
    title: "Notion to Markdown Exporter",
    description: "A production-ready tool that recursively exports any Notion page tree to clean, formatted Markdown. Preserves tables, code blocks, callouts and images.",
    author: {
      id: "auth-6",
      name: "DevUtility Co.",
      verified: false
    },
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    skills: ["Notion API", "Markdown", "TypeScript"],
    isFree: true,
    ratings: {
      average: 4.6,
      totalReviews: 89,
      quality: 4.7,
      communication: 4.4,
      delivery: 4.8
    },
    commentCount: 21,
    downloadCount: 3200,
    version: "1.0.3"
  }
];
