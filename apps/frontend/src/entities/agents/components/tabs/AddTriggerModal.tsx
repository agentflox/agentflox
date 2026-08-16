"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useIntegrationCatalog,
  type CatalogProviderView,
} from "@/features/integrations/hooks/useIntegrationCatalog";
import { IntegrationBrandImage } from "@/features/integrations/components/IntegrationBrandImage";
import { connectIntegrationProvider } from "@/features/integrations/lib/oauthPopup";
import { trpc } from "@/lib/trpc";
import { CATALOG_TO_UI_PROVIDER } from "@/features/integrations/catalogMapping";

export type TriggerIntegrationSelection = {
  providerId: string;
  displayName: string;
  accountId: string;
  accountLabel: string;
};

type PopularTrigger = {
  id: string;
  name: string;
  brandKey: string;
  catalogId?: string;
  comingSoon?: boolean;
};

/** Curated “Most popular” list for the Add trigger modal. */
export const POPULAR_TRIGGER_INTEGRATIONS: PopularTrigger[] = [
  { id: "gmail", name: "Google Mail", brandKey: "gmail", catalogId: "google_mail" },
  { id: "slack", name: "Slack", brandKey: "slack", catalogId: "slack" },
  { id: "microsoft_teams", name: "Microsoft Teams", brandKey: "microsoft_teams", comingSoon: true },
  { id: "calendar", name: "Google Calendar", brandKey: "google_calendar", catalogId: "google_calendar" },
  { id: "microsoft_teams_calendar", name: "Microsoft Teams Calendar", brandKey: "microsoft_teams", comingSoon: true },
  { id: "outlook", name: "Microsoft Outlook", brandKey: "microsoft_teams", comingSoon: true },
  { id: "github", name: "GitHub", brandKey: "github", catalogId: "github" },
  { id: "google_drive", name: "Google Drive", brandKey: "google_drive", catalogId: "google_drive" },
  { id: "notion", name: "Notion", brandKey: "notion", comingSoon: true },
  { id: "discord", name: "Discord", brandKey: "discord", comingSoon: true },
  { id: "figma", name: "Figma", brandKey: "figma", comingSoon: true },
  { id: "youtube", name: "YouTube", brandKey: "youtube", comingSoon: true },
];

const OAUTH_UI_KEYS = new Set(["github", "slack", "gmail", "google_calendar", "google_drive"]);

const searchFocusClass =
  "flex h-10 items-center rounded-md border border-zinc-200 bg-white px-3 shadow-sm transition-all focus-within:border-transparent focus-within:[background:linear-gradient(#fff,#fff)_padding-box,linear-gradient(to_right,#3b82f6,#a855f7,#ec4899)_border-box]";

interface AddTriggerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: (selection: TriggerIntegrationSelection) => void;
  isLoading?: boolean;
}

export function AddTriggerModal({
  open,
  onOpenChange,
  onContinue,
  isLoading = false,
}: AddTriggerModalProps) {
  const [search, setSearch] = useState("");
  const [step, setStep] = useState<"browse" | "accounts">("browse");
  const [selectedPopular, setSelectedPopular] = useState<PopularTrigger | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const utils = trpc.useUtils();
  const { providersByCatalogId, isLoading: catalogLoading } = useIntegrationCatalog();

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setStep("browse");
    setSelectedPopular(null);
    setSelectedAccountId(null);
    setConnecting(false);
  }, [open]);

  const catalogProvider: CatalogProviderView | null = useMemo(() => {
    if (!selectedPopular?.catalogId) return null;
    return providersByCatalogId[selectedPopular.catalogId] ?? null;
  }, [selectedPopular, providersByCatalogId]);

  const filteredPopular = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return POPULAR_TRIGGER_INTEGRATIONS;
    return POPULAR_TRIGGER_INTEGRATIONS.filter((t) => t.name.toLowerCase().includes(q));
  }, [search]);

  const accounts = catalogProvider?.accounts ?? [];

  const openProvider = (item: PopularTrigger) => {
    if (item.comingSoon && !item.catalogId) {
      toast.info(`${item.name} triggers coming soon`);
      return;
    }
    setSelectedPopular(item);
    setSelectedAccountId(null);
    setStep("accounts");
  };

  const handleConnect = async () => {
    if (!selectedPopular) return;
    const uiKey =
      (selectedPopular.catalogId && CATALOG_TO_UI_PROVIDER[selectedPopular.catalogId]) ||
      selectedPopular.brandKey;

    if (!OAUTH_UI_KEYS.has(uiKey) && !OAUTH_UI_KEYS.has(selectedPopular.brandKey)) {
      toast.info(`Connect ${selectedPopular.name} from the Integrations page`);
      return;
    }

    setConnecting(true);
    try {
      const result = await connectIntegrationProvider(uiKey);
      if (result.ok) {
        toast.success(`${selectedPopular.name} connected`);
        await utils.integration.listCatalog.invalidate();
      } else {
        toast.error(result.error);
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleContinue = () => {
    if (!selectedPopular || !selectedAccountId) return;
    const account = accounts.find((a) => a.id === selectedAccountId);
    onContinue({
      providerId: selectedPopular.catalogId || selectedPopular.id,
      displayName: selectedPopular.name,
      accountId: selectedAccountId,
      accountLabel: account?.primaryLabel || account?.secondaryLabel || "Connected account",
    });
  };

  const canContinue = !!selectedAccountId && !isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] w-[95vw] gap-0 p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-6 pt-5 pb-3">
          <DialogTitle className="text-base font-semibold text-zinc-900">Add trigger</DialogTitle>
        </DialogHeader>

        {step === "browse" ? (
          <div className="px-6 pb-6 space-y-5">
            <div className={searchFocusClass}>
              <Search className="h-4 w-4 shrink-0 text-zinc-400" />
              <Input
                variant="ghost"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search 1,000+ triggers..."
                className="h-full bg-transparent pl-2 pr-0 focus:outline-none focus:ring-0 focus-visible:ring-0"
              />
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-zinc-900">Most popular</h4>
              {catalogLoading ? (
                <div className="flex items-center justify-center py-10 text-zinc-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : filteredPopular.length === 0 ? (
                <p className="text-sm text-zinc-500 py-8 text-center">No triggers match your search.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-h-[380px] overflow-auto pr-1">
                  {filteredPopular.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openProvider(item)}
                      className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left hover:border-zinc-300 hover:bg-zinc-50 transition-colors cursor-pointer"
                    >
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-100 bg-white">
                        <IntegrationBrandImage provider={item.brandKey} size={20} />
                      </span>
                      <span className="text-sm font-medium text-zinc-800 truncate">{item.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="px-6 pb-4 space-y-5 flex-1">
              <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setStep("browse");
                    setSelectedPopular(null);
                    setSelectedAccountId(null);
                  }}
                  className="flex items-center justify-center hover:text-zinc-700 hover:bg-zinc-100 p-2 rounded-md cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <span>Back</span>
              </div>
      
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-zinc-900">
                  {selectedPopular?.name}
                </h3>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-zinc-900">Connected accounts</h4>

                  {accounts.length === 0 ? (
                    <p className="text-sm text-zinc-500 py-2">
                      No accounts connected yet. Connect an account to continue.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {accounts.map((account) => {
                        const selected = selectedAccountId === account.id;
                        return (
                          <button
                            key={account.id}
                            type="button"
                            onClick={() => setSelectedAccountId(account.id)}
                            className={cn(
                              "w-full flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors cursor-pointer",
                              selected
                                ? "border-zinc-900 bg-zinc-50"
                                : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50",
                            )}
                          >
                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-100 bg-white">
                              <IntegrationBrandImage
                                provider={selectedPopular?.brandKey || ""}
                                size={20}
                              />
                            </span>
                            <span className="flex-1 min-w-0 text-sm font-medium text-zinc-800 truncate">
                              {account.primaryLabel ||
                                account.secondaryLabel ||
                                account.providerAccountId ||
                                "Connected account"}
                            </span>
                            <span
                              className={cn(
                                "h-5 w-5 rounded-full border-2 shrink-0",
                                selected
                                  ? "border-zinc-900 bg-zinc-900 shadow-[inset_0_0_0_3px_white]"
                                  : "border-zinc-300 bg-white",
                              )}
                            />
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex justify-center pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleConnect}
                      disabled={connecting}
                      className="h-10 rounded-xl border-zinc-200 px-4"
                    >
                      {connecting ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-1.5" />
                      )}
                      Connect account
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-100 px-6 py-4">
              <Button
                type="button"
                variant="primary"
                disabled={!canContinue}
                onClick={handleContinue}
                className={cn(
                  "w-full h-11 rounded-xl text-sm font-semibold",
                  canContinue
                    ? "bg-zinc-900 hover:bg-zinc-800 text-white"
                    : "bg-zinc-100 text-zinc-400 hover:bg-zinc-100 cursor-not-allowed",
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
