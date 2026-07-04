"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import {
  Bot, Wrench, FileCode2, Lock, Unlock, RefreshCw, ExternalLink,
  Download, Package, AlertTriangle, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AssetState, ListingType } from "@/features/marketplace/types/marketplace.types";
import { useToast } from "@/hooks/useToast";

// ─── Local type for a downloaded/purchased asset ──────────────────────────────
interface OwnedAsset {
  id: string;
  sourceListingId: string;
  title: string;
  description: string;
  type: Extract<ListingType, 'agent' | 'tool' | 'template' | 'workforce'>;
  version: string;
  state: AssetState;
  installedAt: string;
  useCases?: string[];
}

// ─── Mock data (replace with trpc.marketplace.myAssets.useQuery) ──────────────
const MOCK_ASSETS: OwnedAsset[] = [
  {
    id: "asset-1",
    sourceListingId: "l-3",
    title: "GPT Research Agent v2",
    description: "Autonomous research agent that synthesizes multi-source web research into structured reports using GPT-4o.",
    type: "agent",
    version: "2.1.0",
    state: "locked",
    installedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    useCases: ["Market research", "Competitive analysis", "Due diligence"],
  },
  {
    id: "asset-2",
    sourceListingId: "l-7",
    title: "Notion to Markdown Converter",
    description: "Tool that exports any Notion page recursively to clean, formatted Markdown files.",
    type: "tool",
    version: "1.0.3",
    state: "ejected",
    installedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: "asset-3",
    sourceListingId: "l-12",
    title: "SaaS Onboarding Email Template Pack",
    description: "8-sequence drip email templates for SaaS onboarding, scientifically optimized for activation rates.",
    type: "template",
    version: "3.0.0",
    state: "outdated",
    installedAt: new Date(Date.now() - 86400000 * 21).toISOString(),
    useCases: ["User onboarding", "Trial conversion", "Churn prevention"],
  },
];

// ─── Icon per type ────────────────────────────────────────────────────────────
function AssetIcon({ type }: { type: OwnedAsset['type'] }) {
  const map = {
    agent: { Icon: Bot, bg: "bg-violet-100 dark:bg-violet-950", color: "text-violet-600" },
    tool:  { Icon: Wrench, bg: "bg-blue-100 dark:bg-blue-950", color: "text-blue-600" },
    template: { Icon: FileCode2, bg: "bg-emerald-100 dark:bg-emerald-950", color: "text-emerald-600" },
  };
  const { Icon, bg, color } = map[type];
  return (
    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", bg)}>
      <Icon className={cn("h-5 w-5", color)} />
    </div>
  );
}

// ─── State Badge ──────────────────────────────────────────────────────────────
function StateBadge({ state }: { state: AssetState }) {
  const map: Record<AssetState, { label: string; className: string; Icon: any }> = {
    locked:  { label: "Locked", className: "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700", Icon: Lock },
    ejected: { label: "Ejected", className: "bg-amber-50 text-amber-600 border-amber-200", Icon: Unlock },
    outdated: { label: "Update available", className: "bg-red-50 text-red-500 border-red-200", Icon: RefreshCw },
  };
  const { label, className, Icon } = map[state];
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border", className)}>
      <Icon className="h-2.5 w-2.5" />{label}
    </span>
  );
}

// ─── Eject Confirmation Dialog ────────────────────────────────────────────────
function EjectConfirmDialog({
  asset,
  open,
  onOpenChange,
  onConfirm,
}: {
  asset: OwnedAsset | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <DialogTitle>Eject &amp; Edit Asset</DialogTitle>
          </div>
          <DialogDescription className="text-sm leading-relaxed">
            You're about to eject <strong>"{asset?.title}"</strong> from its managed state.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200 space-y-1.5">
            <p className="font-semibold">What changes after ejecting:</p>
            <ul className="list-disc pl-4 space-y-1 text-sm opacity-90">
              <li>You gain <strong>full edit access</strong> to the internal configuration</li>
              <li>You <strong>lose automatic updates</strong> from the original creator</li>
              <li>Your changes are isolated — the source listing is unaffected</li>
              <li>You can't re-lock without reinstalling from the marketplace</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Keep Locked</Button>
          <Button
            onClick={onConfirm}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            <Unlock className="h-4 w-4 mr-1.5" />
            Eject & Edit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Asset Card ───────────────────────────────────────────────────────────────
function AssetCard({ asset, onEject, onUpdate }: {
  asset: OwnedAsset;
  onEject: (asset: OwnedAsset) => void;
  onUpdate: (id: string) => void;
}) {
  const handleLaunch = () => {
    // Navigate to open the relevant builder/runner
    const pathMap = { agent: '/dashboard/agents', tool: '/dashboard/tools', template: '/dashboard' };
    window.location.href = pathMap[asset.type];
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <AssetIcon type={asset.type} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="font-semibold text-sm truncate">{asset.title}</span>
            <span className="text-xs text-muted-foreground font-mono">v{asset.version}</span>
            <StateBadge state={asset.state} />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{asset.description}</p>
        </div>
      </div>

      {/* Use cases */}
      {asset.useCases && asset.useCases.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {asset.useCases.map(uc => (
            <Badge key={uc} variant="outline" className="text-xs px-2 py-0.5">
              {uc}
            </Badge>
          ))}
        </div>
      )}

      {/* Actions footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border gap-2">
        <a
          href={`/marketplace/listing/${asset.sourceListingId}`}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          View Source
        </a>
        <div className="flex gap-2">
          {asset.state === 'outdated' && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-red-200 text-red-500 hover:bg-red-50"
              onClick={() => onUpdate(asset.id)}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Update
            </Button>
          )}
          {asset.state === 'locked' && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => onEject(asset)}
            >
              <Unlock className="h-3 w-3 mr-1" />
              Eject
            </Button>
          )}
          <Button
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={handleLaunch}
          >
            Open <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────
export function MyAssetsView() {
  const { toast } = useToast();
  const [assets, setAssets] = useState<OwnedAsset[]>(MOCK_ASSETS);
  const [ejectTarget, setEjectTarget] = useState<OwnedAsset | null>(null);
  const [activeFilter, setActiveFilter] = useState<OwnedAsset['type'] | 'all'>('all');

  const filteredAssets = activeFilter === 'all'
    ? assets
    : assets.filter(a => a.type === activeFilter);

  const handleEjectConfirm = () => {
    if (!ejectTarget) return;
    setAssets(prev => prev.map(a => a.id === ejectTarget.id ? { ...a, state: 'ejected' as AssetState } : a));
    toast({ title: "Asset ejected", description: `${ejectTarget.title} is now fully editable in your workspace.` });
    setEjectTarget(null);
  };

  const handleUpdate = (id: string) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, state: 'locked' as AssetState } : a));
    toast({ title: "Asset updated", description: "Your asset is now up to date with the latest version." });
  };

  const counts = {
    all: assets.length,
    agent: assets.filter(a => a.type === 'agent').length,
    tool: assets.filter(a => a.type === 'tool').length,
    template: assets.filter(a => a.type === 'template').length,
  };

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'agent', 'tool', 'template', 'workforce'] as const).map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
              activeFilter === f
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
            )}
          >
            {f === 'all' && <Package className="h-3 w-3" />}
            {f === 'agent' && <Bot className="h-3 w-3" />}
            {f === 'tool' && <Wrench className="h-3 w-3" />}
            {f === 'template' && <FileCode2 className="h-3 w-3" />}
            <span className="capitalize">{f}</span>
            <span className="opacity-60">{counts[f]}</span>
          </button>
        ))}
      </div>

      {/* Asset list */}
      {filteredAssets.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center border rounded-xl border-dashed border-border">
          <Download className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No assets yet</p>
          <p className="text-xs text-muted-foreground mt-1">Browse the Marketplace to install agents, tools, and templates.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => window.location.href = '/marketplace'}>
            Browse Marketplace
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAssets.map(asset => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onEject={setEjectTarget}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}

      <EjectConfirmDialog
        asset={ejectTarget}
        open={!!ejectTarget}
        onOpenChange={(v) => !v && setEjectTarget(null)}
        onConfirm={handleEjectConfirm}
      />
    </div>
  );
}
