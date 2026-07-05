import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Copy,
  FileIcon,
  Github,
  Info,
  Lightbulb,
  MessageSquare,
} from "lucide-react";

export default async function DocsPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const slugPath = slug.join("/");

  const getContent = (slugValue: string) => {
    switch (slugValue) {
      case "introduction":
        return {
          title: "Introduction",
          description:
            "Learn how Agentflox helps you build, deploy, and scale autonomous AI agent systems.",
          content: `
            <p className="text-xl text-slate-600 dark:text-slate-400 font-light leading-relaxed mb-12">
              Agentflox is the premier unified ecosystem designed to accelerate the venture creation lifecycle. 
              By synthesizing high-fidelity collaboration tools with intelligent discovery mechanisms, 
              Agentflox empowers innovators, investors, and professionals to transcend traditional boundaries.
            </p>

            <h2 className="text-2xl font-bold mt-16 mb-6">The Venture Operating System</h2>
            <p className="mb-6">
              It is not merely a project management tool; it is a <strong>venture operating system</strong> 
              designed to turn ambitious ideas into enduring realities. Agentflox delivers a seamless, 
              high-performance user experience centered around robust multi-agent orchestration, realtime collaboration, and advanced task management.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-12">
              <div className="p-6 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-indigo-500/30 transition-all group shadow-sm dark:shadow-none hover:shadow-md dark:hover:shadow-none">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="text-lg font-bold mb-3 text-slate-900 dark:text-white">Agent Framework</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                  Design, build, and deploy specialized AI agents capable of autonomous task execution and workflow orchestration.
                </p>
              </div>
              <div className="p-6 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-indigo-500/30 transition-all group shadow-sm dark:shadow-none hover:shadow-md dark:hover:shadow-none">
                <div className="w-12 h-12 bg-purple-50 dark:bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                  <Lightbulb size={24} />
                </div>
                <h3 className="text-lg font-bold mb-3 text-slate-900 dark:text-white">Agent Marketplace</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                  Discover, share, and monetize custom agents, tools, templates, and datasets in the global Agentflox ecosystem.
                </p>
              </div>
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-500/5 border-l-4 border-indigo-500 p-6 my-8 rounded-r-xl">
              <div className="flex items-center gap-3 text-indigo-400 mb-2">
                <Info size={18} />
                <span className="font-bold uppercase tracking-wider text-xs">tRPC First</span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Agentflox's core API is powered by tRPC, ensuring end-to-end type safety across the stack. Explore our module endpoints for more specific usage.
              </p>
            </div>
          `,
          toc: [
            { title: "The Venture OS", id: "os" },
            { title: "Key Pillars", id: "pillars" },
          ],
        };
      case "quick-start":
        return {
          title: "Quick Start Guide",
          description:
            "Get up and running with Agentflox API endpoints.",
          content: `
            <p className="text-slate-600 dark:text-slate-400 mb-12">
              Welcome! This guide will walk you through interacting with the Agentflox API system.
            </p>

            <h2 className="text-2xl font-bold mt-12 mb-6">Authentication</h2>
            <p className="mb-4">Most Agentflox endpoints require authentication. In a Next.js environment, the session is securely managed. For external API integrations, use bearer tokens.</p>
            
            <h2 className="text-2xl font-bold mt-12 mb-6">Using tRPC (Frontend)</h2>
            <div className="relative group mb-10">
              <div className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white cursor-pointer transition-colors p-2 bg-slate-200 dark:bg-slate-800 rounded-md">
                <Copy size={16} />
              </div>
              <pre className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl font-mono text-indigo-700 dark:text-indigo-300 overflow-x-auto shadow-sm dark:shadow-none">
// Example: Fetching active marketplace listings
const { data: listings } = trpc.marketplace.listRecent.useQuery({ limit: 10 });

// Example: Publishing a new task to marketplace
const { mutate: publishTask } = trpc.marketplace.publishListing.useMutation();
              </pre>
            </div>
          `,
          toc: [
            { title: "Authentication", id: "authentication" },
            { title: "Using tRPC", id: "trpc" },
          ],
        };
      case "marketplace/listings":
        return {
          title: "Marketplace Listings",
          description: "Endpoints for managing marketplace listings (Tasks, Agents, Tools, etc.)",
          content: `
            <h2 className="text-2xl font-bold mt-12 mb-6">publishListing</h2>
            <p className="mb-4">Creates or updates a marketplace listing.</p>
            <pre className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl font-mono text-indigo-700 dark:text-indigo-300 text-sm overflow-x-auto">
Input Schema: {
  title: string,
  description: string,
  type: "task" | "project" | "agent" | "tool" | "template" | "talent" | "team",
  pricingType: "free" | "paid",
  priceCredits?: number,
  ...
}
            </pre>

            <h2 className="text-2xl font-bold mt-12 mb-6">listRecent</h2>
            <p className="mb-4">Retrieves the most recent active listings across all categories.</p>
          `,
          toc: [
            { title: "publishListing", id: "publishlisting" },
            { title: "listRecent", id: "listrecent" },
          ],
        };
      case "agent/management":
        return {
          title: "Agent Management",
          description: "Endpoints for creating, listing, and configuring AI Agents.",
          content: `
            <h2 className="text-2xl font-bold mt-12 mb-6">agent.list</h2>
            <p className="mb-4">Fetch agents associated with the user, supporting pagination and filtering by status, type, and workspace.</p>

            <h2 className="text-2xl font-bold mt-12 mb-6">agent.get</h2>
            <p className="mb-4">Retrieve details of a specific AI agent, including its memory, triggers, tools, and execution configuration.</p>
            
            <h2 className="text-2xl font-bold mt-12 mb-6">agent.create</h2>
            <p className="mb-4">Create a new agent instance with defined autonomy level, permission level, and system context.</p>
          `,
          toc: [
            { title: "List Agents", id: "list" },
            { title: "Get Agent", id: "get" },
            { title: "Create Agent", id: "create" },
          ],
        };
      case "core/tasks":
        return {
          title: "Task Management",
          description: "Endpoints for creating, assigning, and tracking tasks.",
          content: `
            <h2 className="text-2xl font-bold mt-12 mb-6">task.create</h2>
            <p className="mb-4">Create a new task within a workspace. Supports checklists, custom fields, and hierarchical subtasks.</p>

            <h2 className="text-2xl font-bold mt-12 mb-6">task.list</h2>
            <p className="mb-4">Retrieve tasks with comprehensive filtering (assignees, status, due dates, custom fields).</p>
          `,
          toc: [
            { title: "Create Task", id: "create" },
            { title: "List Tasks", id: "list" },
          ],
        };
      default:
        // Generic fallback for any other valid slug in the sidebar
        const formattedTitle = slugValue.split("/").pop()?.replace(/-/g, " ").replace(/\\b\\w/g, l => l.toUpperCase()) || "API Reference";
        return {
          title: formattedTitle,
          description: `Documentation for the ${formattedTitle} module endpoints.`,
          content: `
             <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center text-slate-500 dark:text-slate-600 mb-8 shadow-sm dark:shadow-none">
                  <FileIcon size={32} />
                </div>
                <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">${formattedTitle} Module endpoints</h2>
                <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  Detailed tRPC schemas and usage examples for this endpoint will be documented here in a future release.
                </p>
             </div>
          `,
          toc: [] as { title: string; id: string }[],
        };
    }
  };

  const data = getContent(slugPath);

  return (
    <div className="flex flex-col lg:flex-row gap-12 relative">
      <div className="flex-1 max-w-3xl">
        <nav className="flex items-center gap-2 mb-10 text-xs font-medium text-slate-500 dark:text-slate-400">
          <Link
            href="/docs"
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors uppercase tracking-wider"
          >
            Docs
          </Link>
          <ChevronRight size={12} />
          <span className="text-indigo-600 dark:text-indigo-400/80 uppercase tracking-wider truncate max-w-[200px]">
            {slugPath.split("/").join(" / ")}
          </span>
        </nav>

        <header className="mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white mb-6 leading-tight">
            {data.title}
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 font-light leading-relaxed">
            {data.description}
          </p>
        </header>

        <div
          className="prose dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: data.content }}
        />

        <footer className="mt-24 pt-12 border-t border-slate-200 dark:border-slate-800/50">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">
                Last Updated
              </span>
              <span className="text-sm text-slate-700 dark:text-slate-300">March 8, 2026</span>
            </div>
            <div className="flex items-center gap-6">
              <Link
                href="#"
                className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <Github size={16} /> Edit this page
              </Link>
              <Link
                href="#"
                className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <MessageSquare size={16} /> Community support
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12">
            <Link
              href="#"
              className="p-6 bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-500/30 transition-all group flex flex-col items-start gap-1 shadow-sm dark:shadow-none hover:shadow-md dark:hover:shadow-none"
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Previous
              </span>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-200">Introduction</span>
            </Link>
            <Link
              href="/docs/quick-start"
              className="p-6 bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-500/30 transition-all group flex flex-col items-end gap-1 shadow-sm dark:shadow-none hover:shadow-md dark:hover:shadow-none"
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Next
              </span>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-200">Quick Start</span>
            </Link>
          </div>

          <div className="mt-16 flex flex-col items-center justify-center gap-6 p-12 bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10 rounded-3xl text-center">
            <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(99,102,241,0.5)]">
              <Lightbulb size={24} />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Was this page helpful?</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Your feedback helps us improve the Agentflox experience for everyone.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button className="px-6 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-700 dark:text-white font-medium hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm dark:shadow-none transition-all">
                Yes, very!
              </button>
              <button className="px-6 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-700 dark:text-white font-medium hover:border-red-500/50 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm dark:shadow-none transition-all">
                Not really
              </button>
            </div>
          </div>
        </footer>
      </div>

      {data.toc && data.toc.length > 0 && (
        <aside className="hidden xl:block w-64 shrink-0">
          <div className="sticky top-32 flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-600 dark:text-slate-500">
                On this page
              </h3>
              <nav className="flex flex-col gap-3">
                {data.toc.map((item, idx) => (
                  <Link
                    key={idx}
                    href={`#${item.id}`}
                    className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all border-l-2 border-transparent hover:border-indigo-500/50 pl-4 py-0.5"
                  >
                    {item.title}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="pt-8 border-t border-slate-200 dark:border-slate-800/50 flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Join our Discord
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-500 leading-relaxed">
                  Collaborate with thousands of AI engineers and innovators.
                </p>
                <Link
                  href="#"
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline mt-1"
                >
                  Join Workspace →
                </Link>
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

