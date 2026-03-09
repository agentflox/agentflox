export interface NavItem {
  title: string;
  href?: string;
  items?: NavItem[];
}

export const DOCS_CONFIG: NavItem[] = [
  {
    title: "Getting Started",
    items: [
      {
        title: "Introduction",
        href: "/docs/introduction",
      },
      {
        title: "Quick Start",
        href: "/docs/quick-start",
      },
      {
        title: "Architecture",
        href: "/docs/architecture",
      },
    ],
  },
  {
    title: "Core Concepts",
    items: [
      {
        title: "Workspaces",
        href: "/docs/concepts/workspaces",
      },
      {
        title: "AI Orchestration",
        href: "/docs/concepts/ai-orchestration",
      },
      {
        title: "Proposals System",
        href: "/docs/concepts/proposals-system",
      },
      {
        title: "Real-time Collaboration",
        href: "/docs/concepts/real-time",
      },
    ],
  },
  {
    title: "Agent Builder",
    items: [
      {
        title: "Visual Configuration",
        href: "/docs/agent-builder/visual-config",
      },
      {
        title: "Tool Registry",
        href: "/docs/agent-builder/tool-registry",
      },
      {
        title: "Safety Guardrails",
        href: "/docs/agent-builder/safety",
      },
    ],
  },
  {
    title: "API Reference",
    items: [
      {
        title: "Overview",
        href: "/docs/api/overview",
      },
      {
        title: "Authentication",
        href: "/docs/api/auth",
      },
      {
        title: "Endpoints",
        href: "/docs/api/endpoints",
      },
    ],
  },
];

