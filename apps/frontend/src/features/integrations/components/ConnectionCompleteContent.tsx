"use client";

import Image from "next/image";
import { ArrowLeftRight, Check, Link2, MonitorSmartphone, Search, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IntegrationProviderIcon } from "./IntegrationProviderIcon";

export type ConnectionFeature = {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
};

export type ConnectionCompleteContentProps = {
  provider: string;
  displayName: string;
  features?: ConnectionFeature[];
  onDone: () => void;
  footerNote?: string;
};

const DEFAULT_FEATURES: (displayName: string) => ConnectionFeature[] = (name) => [
  {
    icon: <Search className="h-5 w-5 text-zinc-500" />,
    title: "Personal Connected Search",
    description: `Search both public and private files from your connected account.`,
  },
  {
    icon: <Link2 className="h-5 w-5 text-zinc-500" />,
    title: `Preview ${name} links in Agentflox`,
    description: `Link previews allow you to see live, synced visualizations of links directly in Agentflox.`,
  },
  {
    icon: <MonitorSmartphone className="h-5 w-5 text-zinc-500" />,
    title: "App panel in Task view",
    description: `View links from ${name} from a central place in Task view.`,
  },
  {
    icon: <Workflow className="h-5 w-5 text-zinc-500" />,
    title: `${name} Automations`,
    description: `Automate workflows with triggers and actions between Agentflox and ${name}.`,
    badge: "New",
  },
];

export function ConnectionCompleteContent({
  provider,
  displayName,
  features,
  onDone,
  footerNote,
}: ConnectionCompleteContentProps) {
  const items = features ?? DEFAULT_FEATURES(displayName);

  return (
    <div className="flex flex-col items-center px-8 py-10">
      {/* Logo pair */}
      <div className="flex items-center gap-3 mb-4">
        <span className="relative inline-block h-12 w-12">
          <Image
            src="/images/logo.png"
            alt="Agentflox"
            fill
            className="object-contain"
          />
        </span>
        <ArrowLeftRight className="h-5 w-5 text-zinc-400" />
        <span className="flex h-12 w-12 items-center justify-center">
          <IntegrationProviderIcon providerId={provider} size={42} />
        </span>
      </div>

      <h2 className="text-xl font-semibold text-zinc-900 mb-8">
        You&apos;re done!
      </h2>

      {/* Feature list */}
      <div className="w-full max-w-lg space-y-2 mb-6">
        {items.map((feat) => (
          <div
            key={feat.title}
            className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3.5"
          >
            <span className="mt-0.5 shrink-0">{feat.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-800">
                  {feat.title}
                </span>
                {feat.badge && (
                  <span className="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                    {feat.badge}
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-500 mt-0.5">{feat.description}</p>
            </div>
          </div>
        ))}
      </div>

      {footerNote && (
        <p className="text-xs text-zinc-400 mb-4 text-center max-w-lg">
          {footerNote}{" "}
          <a href="#" className="text-violet-600 hover:underline">
            Learn more
          </a>
        </p>
      )}

      <Button
        className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
        onClick={onDone}
      >
        Done <Check className="h-4 w-4" />
      </Button>
    </div>
  );
}
