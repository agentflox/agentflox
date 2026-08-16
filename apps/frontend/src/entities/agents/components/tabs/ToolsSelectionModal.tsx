"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Search,
  Loader2,
  Wand2,
  Wrench,
  Plug,
  ChevronRight,
  ChevronLeft,
  Check,
  Calendar,
  MessageSquare,
  Contact,
  Globe,
  FolderOpen,
  BookOpen,
  X,
  Link2,
  ArrowLeft
} from "lucide-react";
import { INTEGRATIONS_V2_ENABLED } from "@/features/integrations/catalogMapping";
import { useIntegrationCatalog, type CatalogProviderView } from "@/features/integrations/hooks/useIntegrationCatalog";
import { IntegrationBrandImage } from "@/features/integrations/components/IntegrationBrandImage";
import { EntityIcon } from "@/entities/shared/components/EntityIcon";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ToolAIBuilderView = dynamic(
  () =>
    import("@/features/dashboard/views/tools/ToolAIBuilderView").then((m) => ({
      default: m.ToolAIBuilderView,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading AI tool builder…
      </div>
    ),
  },
);

const ToolFlowBuilderView = dynamic(
  () =>
    import("@/features/dashboard/views/tools/ToolFlowBuilderView").then((m) => ({
      default: m.ToolFlowBuilderView,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Loading tool builder…
      </div>
    ),
  },
);

interface SystemTool {
  id: string;
  name: string;
  displayName?: string | null;
  description: string;
  category: string;
}

interface CompositeTool {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  icon?: string | null;
  color?: string | null;
  updatedAt?: string | Date;
}

interface ToolsSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedToolIds: string[];
  onSelect: (toolIds: string[]) => void;
  isLoading?: boolean;
  workspaceId?: string;
}

type CenterView = "home" | "integrations" | "provider";

type PreviewState =
  | { type: "system"; tool: SystemTool }
  | { type: "composite"; tool: CompositeTool }
  | { type: "provider"; provider: CatalogProviderView }
  | null;

type SearchResultItem =
  | { type: "composite"; key: string; tool: CompositeTool }
  | { type: "system"; key: string; tool: SystemTool }
  | {
      type: "integration";
      key: string;
      tool: SystemTool;
      provider: CatalogProviderView;
      action: CatalogProviderView["actions"][number];
    };

const USE_CASES = [
  { id: "calendar", label: "Calendar", icon: Calendar, keywords: ["calendar", "schedule", "event"] },
  { id: "communications", label: "Communications", icon: MessageSquare, keywords: ["communication", "message", "slack", "email", "mail", "chat"] },
  { id: "crm", label: "CRM", icon: Contact, keywords: ["crm", "hubspot", "contact", "lead"] },
  { id: "scraper", label: "Data Scraper", icon: Globe, keywords: ["search", "scrape", "crawl", "extract", "web"] },
  { id: "files", label: "Handle Files", icon: FolderOpen, keywords: ["file", "drive", "docs", "document", "storage"] },
  { id: "knowledge", label: "Knowledge", icon: BookOpen, keywords: ["knowledge", "notion", "wiki", "note"] },
] as const;

function matchesUseCase(tool: SystemTool | CompositeTool, useCaseIds: string[]) {
  if (useCaseIds.length === 0) return true;
  const hay = `${(tool as SystemTool).name ?? ""} ${(tool as SystemTool).displayName ?? ""} ${tool.description ?? ""} ${tool.category ?? ""}`.toLowerCase();
  return useCaseIds.some((id) => {
    const uc = USE_CASES.find((u) => u.id === id);
    return uc?.keywords.some((k) => hay.includes(k));
  });
}

function toolLabel(tool: SystemTool) {
  return tool.displayName || tool.name;
}

export function ToolsSelectionModal({
  open,
  onOpenChange,
  selectedToolIds,
  onSelect,
  isLoading = false,
  workspaceId,
}: ToolsSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [refineQuery, setRefineQuery] = useState("");
  const [integrationFilterQuery, setIntegrationFilterQuery] = useState("");
  const [useCaseFilters, setUseCaseFilters] = useState<string[]>([]);
  const [integrationFilters, setIntegrationFilters] = useState<string[]>([]);
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set(selectedToolIds));
  const [centerView, setCenterView] = useState<CenterView>("home");
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState>(null);
  const [aiBuilderOpen, setAiBuilderOpen] = useState(false);
  const [editingToolId, setEditingToolId] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { providers, providersByCatalogId, isLoading: isLoadingCatalog } = useIntegrationCatalog();

  const systemToolsQuery = trpc.tool.systemList.useQuery(undefined, {
    enabled: open,
    staleTime: 60_000,
  });

  const compositeToolsQuery = trpc.compositeTool.list.useQuery(
    { page: 1, pageSize: 100 },
    { enabled: open, staleTime: 30_000 },
  );

  const editingToolQuery = trpc.compositeTool.get.useQuery(
    { id: editingToolId || "" },
    { enabled: !!editingToolId, staleTime: 60_000, refetchOnWindowFocus: false },
  );
  const editingToolData = editingToolQuery.data;

  const createFlowTool = trpc.compositeTool.create.useMutation({
    onSuccess: (data) => {
      toast.success("Tool created");
      window.open(`/dashboard/tools/build/flow/${data.id}`, "_blank");
    },
    onError: (err) => toast.error(err.message || "Failed to create tool"),
  });

  useEffect(() => {
    if (!open) return;
    setLocalSelected(new Set(selectedToolIds));
    setSearchQuery("");
    setRefineQuery("");
    setIntegrationFilterQuery("");
    setUseCaseFilters([]);
    setIntegrationFilters([]);
    setCenterView("home");
    setSelectedProviderId(null);
    setPreview(null);
    setAiBuilderOpen(false);
    setEditingToolId(null);
  }, [open, selectedToolIds]);

  // Clear the secondary "Refine..." search whenever the center view changes,
  // so it doesn't silently carry over and hide results in a different view.
  useEffect(() => {
    setRefineQuery("");
  }, [centerView]);

  const systemTools = (systemToolsQuery.data ?? []) as SystemTool[];
  const saasToolsByName = useMemo(() => {
    const map: Record<string, SystemTool> = {};
    for (const tool of systemTools) {
      if (tool.category === "SAAS_INTEGRATION") map[tool.name] = tool;
    }
    return map;
  }, [systemTools]);

  const oauthProviders = useMemo(
    () =>
      providers.filter((p) => p.providerId !== "webhook" && p.providerId !== "schedule"),
    [providers],
  );

  const filterSidebarIntegrations = useMemo(() => {
    const q = integrationFilterQuery.trim().toLowerCase();
    return oauthProviders.filter((p) => {
      if (!q) return true;
      return p.displayName.toLowerCase().includes(q);
    });
  }, [oauthProviders, integrationFilterQuery]);

  const yourTools = useMemo(() => {
    const items = (compositeToolsQuery.data?.items ?? []) as CompositeTool[];
    const q = searchQuery.trim().toLowerCase();
    return items.filter((tool) => {
      if (!matchesUseCase(tool, useCaseFilters)) return false;
      if (!q) return true;
      return (
        String(tool.name || "").toLowerCase().includes(q) ||
        String(tool.description || "").toLowerCase().includes(q) ||
        String(tool.category || "").toLowerCase().includes(q)
      );
    });
  }, [compositeToolsQuery.data?.items, searchQuery, useCaseFilters]);

  const builtInTools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return systemTools.filter((tool) => {
      if (tool.category === "SAAS_INTEGRATION") return false;
      if (!matchesUseCase(tool, useCaseFilters)) return false;
      if (!q) return true;
      return (
        tool.name.toLowerCase().includes(q) ||
        (tool.displayName ?? "").toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.category.toLowerCase().includes(q)
      );
    });
  }, [systemTools, searchQuery, useCaseFilters]);

  const connectedProviders = useMemo(() => {
    return oauthProviders.filter((p) => {
      if (!p.isConnected) return false;
      if (integrationFilters.length > 0 && !integrationFilters.includes(p.providerId)) return false;
      return true;
    });
  }, [oauthProviders, integrationFilters]);

  const allProvidersFiltered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const rq = refineQuery.trim().toLowerCase();
    return oauthProviders.filter((p) => {
      if (integrationFilters.length > 0 && !integrationFilters.includes(p.providerId)) return false;
      if (q && !(
        p.displayName.toLowerCase().includes(q) ||
        p.actions.some((a) => a.displayName.toLowerCase().includes(q))
      )) return false;
      if (rq && !(
        p.displayName.toLowerCase().includes(rq) ||
        p.actions.some((a) => a.displayName.toLowerCase().includes(rq))
      )) return false;
      return true;
    });
  }, [oauthProviders, searchQuery, refineQuery, integrationFilters]);

  const selectedProvider = selectedProviderId
    ? providersByCatalogId[selectedProviderId] ?? null
    : null;

  const providerActions = useMemo(() => {
    if (!selectedProvider) return [];
    const q = searchQuery.trim().toLowerCase();
    const rq = refineQuery.trim().toLowerCase();
    return selectedProvider.actions
      .filter((a) => a.verified)
      .map((a) => ({ action: a, tool: saasToolsByName[a.toolName] }))
      .filter(({ tool, action }) => {
        if (!tool) return false;
        if (!matchesUseCase(tool, useCaseFilters)) return false;
        if (q && !(
          action.displayName.toLowerCase().includes(q) ||
          tool.name.toLowerCase().includes(q) ||
          (tool.displayName ?? "").toLowerCase().includes(q)
        )) return false;
        if (rq && !(
          action.displayName.toLowerCase().includes(rq) ||
          tool.name.toLowerCase().includes(rq) ||
          (tool.displayName ?? "").toLowerCase().includes(rq)
        )) return false;
        return true;
      });
  }, [selectedProvider, saasToolsByName, searchQuery, refineQuery, useCaseFilters]);

  // Flat, unified search results shown on the "home" view whenever there's an
  // active search term — mixes custom tools, built-in tools, and every
  // matching integration action (not just connected providers) into one list,
  // so the UI matches "N results · Search term: 'x'" instead of the capped
  // "Your tools" / "Integrations" preview sections.
  const searchResults = useMemo<SearchResultItem[]>(() => {
    if (!searchQuery.trim()) return [];

    const q = searchQuery.trim().toLowerCase();
    const items: SearchResultItem[] = [];

    for (const tool of yourTools) {
      items.push({ type: "composite", key: `c-${tool.id}`, tool });
    }

    for (const tool of builtInTools) {
      items.push({ type: "system", key: `s-${tool.id}`, tool });
    }

    for (const provider of oauthProviders) {
      if (integrationFilters.length > 0 && !integrationFilters.includes(provider.providerId)) continue;
      for (const action of provider.actions) {
        if (!action.verified) continue;
        const tool = saasToolsByName[action.toolName];
        if (!tool) continue;
        if (!matchesUseCase(tool, useCaseFilters)) continue;
        const matches =
          action.displayName.toLowerCase().includes(q) ||
          tool.name.toLowerCase().includes(q) ||
          (tool.displayName ?? "").toLowerCase().includes(q) ||
          provider.displayName.toLowerCase().includes(q);
        if (!matches) continue;
        items.push({
          type: "integration",
          key: `i-${provider.providerId}-${action.actionId}`,
          tool,
          provider,
          action,
        });
      }
    }

    return items;
  }, [searchQuery, yourTools, builtInTools, oauthProviders, saasToolsByName, useCaseFilters, integrationFilters]);

  // Count of results currently visible in the main panel for the active view,
  // used to render the "N results · Search term: 'x'" row under the search input.
  const resultsCount = useMemo(() => {
    if (centerView === "provider") return providerActions.length;
    if (centerView === "integrations") return allProvidersFiltered.length;
    if (searchQuery.trim()) return searchResults.length;
    return yourTools.length + builtInTools.length;
  }, [centerView, providerActions, allProvidersFiltered, yourTools, builtInTools, searchQuery, searchResults]);

  const activeFilterCount = useCaseFilters.length + integrationFilters.length;

  const resetFilters = () => {
    setUseCaseFilters([]);
    setIntegrationFilters([]);
    setIntegrationFilterQuery("");
  };

  const toggleUseCase = (id: string) => {
    setUseCaseFilters((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleIntegrationFilter = (providerId: string) => {
    setIntegrationFilters((prev) =>
      prev.includes(providerId) ? prev.filter((x) => x !== providerId) : [...prev, providerId],
    );
  };

  const toggleTool = (toolId: string) => {
    setLocalSelected((prev) => {
      const next = new Set(prev);
      if (next.has(toolId)) next.delete(toolId);
      else next.add(toolId);
      return next;
    });
  };

  const handleApply = () => {
    onSelect(Array.from(localSelected));
    onOpenChange(false);
  };

  const handleCancel = () => {
    setLocalSelected(new Set(selectedToolIds));
    onOpenChange(false);
  };

  const handleBuildFromScratch = () => {
    createFlowTool.mutate({
      name: "Untitled",
      description: "A new custom tool",
      category: "Custom",
      functionSchema: {
        name: "untitled_tool",
        description: "A new custom tool",
        parameters: { type: "object", properties: {}, required: [] },
      },
      steps: [],
      mode: "MANUAL",
      isPublic: false,
    });
  };

  const isLoadingData =
    systemToolsQuery.isLoading || compositeToolsQuery.isLoading || isLoadingCatalog;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[1200px] w-[95vw] h-[85vh] p-0 gap-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-5 py-4 border-b shrink-0">
            <DialogTitle className="text-base font-semibold">Select Tools</DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 grid grid-cols-[220px_1fr_300px]">
            {/* ── Filters ── */}
            <div className="border-r p-4 overflow-auto w-[240px] shrink-0 z-[11]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[13px] font-bold text-zinc-900">Filters</span>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    className="text-xs text-zinc-500 cursor-pointer font-medium hover:text-zinc-800 px-2 py-1 hover:bg-zinc-100 rounded-md"
                    onClick={resetFilters}
                  >
                    Reset ({activeFilterCount})
                  </button>
                )}
              </div>

              <Accordion type="multiple" defaultValue={["use-case", "integrations"]} className="w-full">
                <AccordionItem value="use-case" className="border-none">
                  <AccordionTrigger className="hover:no-underline py-2 cursor-pointer hover:bg-zinc-100 px-1.5">
                    <span className="text-xs font-semibold text-zinc-800">Use case</span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pl-1.5">
                    <div className="space-y-2 mt-1">
                      {USE_CASES.map((uc) => {
                        const Icon = uc.icon;
                        return (
                          <label key={uc.id} className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={useCaseFilters.includes(uc.id)}
                              onChange={() => toggleUseCase(uc.id)}
                              className="rounded border-zinc-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                            />
                            <Icon className="w-4 h-4 shrink-0 text-zinc-800" />
                            <span className="flex-1 text-zinc-800 text-[13px]">{uc.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {INTEGRATIONS_V2_ENABLED && (
                  <AccordionItem value="integrations" className="border-none">
                    <AccordionTrigger className="hover:no-underline py-2 cursor-pointer hover:bg-zinc-100 px-1.5">
                      <span className="text-xs font-semibold text-zinc-800">Integrations</span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pl-1.5">
                      <div className="space-y-2 mt-1">
                        <div className="flex items-center gap-2 px-2 h-8 bg-white border border-zinc-200 rounded-md transition-all focus-within:border-transparent focus-within:[background:linear-gradient(#fff,#fff)_padding-box,linear-gradient(to_right,#3b82f6,#a855f7,#ec4899)_border-box]">
                          <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                          <Input
                            variant="ghost"
                            value={integrationFilterQuery}
                            onChange={(e) => setIntegrationFilterQuery(e.target.value)}
                            placeholder="Search integrations..."
                            className="h-full border-0 p-0 shadow-none focus-visible:ring-0 text-xs bg-transparent focus:outline-none focus:ring-0"
                          />
                        </div>
                        <div className="space-y-1.5 max-h-[280px] overflow-auto pr-1">
                          {filterSidebarIntegrations.map((p) => (
                            <label
                              key={p.providerId}
                              className="flex items-center gap-2 text-sm cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={integrationFilters.includes(p.providerId)}
                                onChange={() => toggleIntegrationFilter(p.providerId)}
                                className="rounded border-zinc-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                              />
                              <span className="inline-flex h-5 w-5 items-center justify-center shrink-0">
                                <IntegrationBrandImage provider={p.providerId} size={16} />
                              </span>
                              <span className="flex-1 text-zinc-800 text-[13px] truncate">
                                {p.displayName}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            </div>

            {/* ── Main ── */}
            <div className="min-h-0 px-4 overflow-auto flex flex-col">
              <div className="sticky top-0 z-10 bg-white border-b border-zinc-100 px-5 pt-3 pb-3">
                <div className="flex items-start gap-3">
                  <div className="flex flex-1 items-center gap-2 px-3 h-9 bg-white border border-zinc-200 rounded-md focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all overflow-hidden">
                    <Search className="h-4 w-4 text-zinc-400 shrink-0" />
                    <Input
                      variant="ghost"
                      className="flex-1 h-full border-0 p-0 shadow-none border-none text-sm bg-transparent placeholder:text-zinc-400 focus:outline-none focus:ring-0 focus-visible:ring-0"
                      placeholder="Search tools..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div className="flex flex-col items-stretch gap-1 shrink-0">
                    <Button
                      type="button"
                      className="h-9 gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
                      onClick={() => setAiBuilderOpen(true)}
                    >
                      <Wand2 className="h-4 w-4" />
                      Invent a tool with AI
                    </Button>
                    <button
                      type="button"
                      onClick={handleBuildFromScratch}
                      disabled={createFlowTool.isPending}
                      className="text-[11px] text-violet-600 hover:text-violet-800 text-center cursor-pointer"
                    >
                      Build a tool from scratch
                    </button>
                  </div>
                </div>

                {searchQuery.trim() && (
                  <div className="flex items-center gap-2 mt-2.5 text-xs text-zinc-500">
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="flex items-center gap-1 font-medium hover:text-zinc-800 hover:bg-zinc-100 px-1.5 py-1 -ml-1.5 rounded-md cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                      Clear
                    </button>
                    <span>
                      <span className="font-semibold text-zinc-700">{resultsCount}</span>{" "}
                      result{resultsCount === 1 ? "" : "s"} · Search term: '
                      <span className="font-medium text-zinc-700">{searchQuery.trim()}</span>'
                    </span>
                  </div>
                )}

              </div>

              <div className="flex-1 px-5 py-4 space-y-6">
                {isLoadingData ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                  </div>
                ) : centerView === "provider" && selectedProvider ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 text-md font-semibold text-zinc-900 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setCenterView("integrations");
                            setSelectedProviderId(null);
                            setPreview(null);
                          }}
                          className="flex items-center justify-center hover:text-zinc-700 hover:bg-zinc-100 p-2 rounded-md cursor-pointer"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </button>
                        <span>Back</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 h-8 w-56 bg-white border border-zinc-200 rounded-md focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all">
                        <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        <Input
                          variant="ghost"
                          value={refineQuery}
                          onChange={(e) => setRefineQuery(e.target.value)}
                          placeholder="Refine tools..."
                          className="flex-1 h-full border-0 p-0 shadow-none text-xs bg-transparent placeholder:text-zinc-400 focus:outline-none focus:ring-0 focus-visible:ring-0"
                          autoComplete="off"
                        />
                        {refineQuery.trim() && (
                          <button
                            type="button"
                            onClick={() => setRefineQuery("")}
                            className="text-zinc-400 hover:text-zinc-700 cursor-pointer shrink-0"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border bg-white">
                        <IntegrationBrandImage provider={selectedProvider.providerId} size={28} />
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-900">{selectedProvider.displayName}</h3>
                        <p className="text-xs text-zinc-500">
                          {selectedProvider.isConnected ? "Connected" : "Not connected"} ·{" "}
                          {providerActions.length} tools
                        </p>
                      </div>
                    </div>
                    {!selectedProvider.isConnected && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/dashboard/integrations">
                          <Link2 className="h-3.5 w-3.5 mr-1.5" />
                          Connect account
                        </Link>
                      </Button>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {providerActions.map(({ action, tool }) => {
                        if (!tool) return null;
                        const selected = localSelected.has(tool.id);
                        const active =
                          preview?.type === "system" && preview.tool.id === tool.id;
                        return (
                          <button
                            key={action.actionId}
                            type="button"
                            onMouseEnter={() => setPreview({ type: "system", tool })}
                            onClick={() => {
                              setPreview({ type: "system", tool });
                              toggleTool(tool.id);
                            }}
                            className={cn(
                              "group relative flex items-center gap-3 rounded-xl border p-3 text-left transition-colors cursor-pointer",
                              selected
                                ? "border-emerald-400 bg-emerald-50/50 ring-1 ring-emerald-200"
                                : active
                                  ? "border-indigo-400 bg-indigo-50/50"
                                  : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50",
                            )}
                          >
                            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white">
                              <IntegrationBrandImage provider={selectedProvider.providerId} size={22} />
                            </span>
                            <span className="min-w-0 flex-1 text-sm font-medium text-zinc-800 truncate">
                              {action.displayName}
                            </span>

                            {selected ? (
                              <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                                <Check className="h-3 w-3" strokeWidth={3} />
                                Selected
                              </span>
                            ) : (
                              <span className="hidden shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-zinc-500 group-hover:flex">
                                + Add
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {providerActions.length === 0 && (
                      <p className="text-sm text-zinc-500 text-center py-8">No tools found for this integration.</p>
                    )}
                  </div>
                ) : centerView === "integrations" ? (
                  <div className="space-y-4">
                     <div className="flex items-center justify-between gap-3">
                       <div className="flex items-center gap-1.5 text-md font-semibold text-zinc-900 shrink-0">
                         <button
                           type="button"
                           onClick={() => {
                             setCenterView("home");
                             setPreview(null);
                           }}
                           className="flex items-center justify-center hover:text-zinc-700 hover:bg-zinc-100 p-2 rounded-md cursor-pointer"
                         >
                           <ArrowLeft className="h-4 w-4" />
                         </button>
                         <span>Back</span>
                       </div>
                       <div className="flex items-center gap-2 px-3 h-8 w-56 bg-white border border-zinc-200 rounded-md focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all">
                         <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                         <Input
                           variant="ghost"
                           value={refineQuery}
                           onChange={(e) => setRefineQuery(e.target.value)}
                           placeholder="Refine integrations..."
                           className="flex-1 h-full border-0 p-0 shadow-none text-xs bg-transparent placeholder:text-zinc-400 focus:outline-none focus:ring-0 focus-visible:ring-0"
                           autoComplete="off"
                         />
                         {refineQuery.trim() && (
                           <button
                             type="button"
                             onClick={() => setRefineQuery("")}
                             className="text-zinc-400 hover:text-zinc-700 cursor-pointer shrink-0"
                           >
                             <X className="h-3.5 w-3.5" />
                           </button>
                         )}
                       </div>
                     </div>
                    <h3 className="text-sm font-semibold text-zinc-900">All integrations</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {allProvidersFiltered.map((provider) => {
                        const active =
                          preview?.type === "provider" &&
                          preview.provider.providerId === provider.providerId;
                        return (
                          <button
                            key={provider.providerId}
                            type="button"
                            onMouseEnter={() => setPreview({ type: "provider", provider })}
                            onClick={() => {
                              setPreview({ type: "provider", provider });
                              setSelectedProviderId(provider.providerId);
                              setCenterView("provider");
                            }}
                            className={cn(
                              "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors cursor-pointer",
                              active
                                ? "border-indigo-400 bg-indigo-50/50"
                                : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50",
                            )}
                          >
                            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-white">
                              <IntegrationBrandImage provider={provider.providerId} size={22} />
                            </span>
                            <span className="min-w-0 flex-1 text-sm font-medium text-zinc-800 truncate">
                              {provider.displayName}
                            </span>
                            <ChevronRight className="h-4 w-4 text-zinc-500 shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : searchQuery.trim() ? (
                  /* ── Flat, unified search results ── */
                  <section className="space-y-3">
                    {searchResults.length === 0 ? (
                      <p className="text-sm text-zinc-500 text-center py-12">
                        No results for '{searchQuery.trim()}'.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {searchResults.map((item) => {
                          if (item.type === "composite") {
                            const tool = item.tool;
                            const selected = localSelected.has(tool.id);
                            const active =
                              preview?.type === "composite" && preview.tool.id === tool.id;
                            return (
                              <button
                                key={item.key}
                                type="button"
                                onMouseEnter={() => setPreview({ type: "composite", tool })}
                                onClick={() => {
                                  setPreview({ type: "composite", tool });
                                  toggleTool(tool.id);
                                }}
                                className={cn(
                                  "group relative flex items-center gap-3 rounded-xl border p-3 text-left transition-colors cursor-pointer",
                                  selected
                                    ? "border-emerald-400 bg-emerald-50/50 ring-1 ring-emerald-200"
                                    : active
                                      ? "border-indigo-400 bg-indigo-50/50"
                                      : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50",
                                )}
                              >
                                <span
                                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white text-sm font-semibold"
                                  style={{
                                    backgroundColor:
                                      tool.color && tool.color !== "#FFFFFF"
                                        ? tool.color
                                        : "#8B5CF6",
                                  }}
                                >
                                  {tool.icon ? (
                                    <EntityIcon icon={tool.icon} size={16} fallback={Wrench} />
                                  ) : (
                                    "T"
                                  )}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block text-sm font-medium text-zinc-800 truncate">
                                    {tool.name || "Untitled tool"}
                                  </span>
                                  <span className="block text-[11px] text-zinc-400 truncate">
                                    {tool.category || "Custom"}
                                  </span>
                                </span>
                                {selected ? (
                                  <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                                    <Check className="h-3 w-3" strokeWidth={3} />
                                    Selected
                                  </span>
                                ) : (
                                  <span className="hidden shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-zinc-500 group-hover:flex">
                                    + Add
                                  </span>
                                )}
                              </button>
                            );
                          }

                          if (item.type === "system") {
                            const tool = item.tool;
                            const selected = localSelected.has(tool.id);
                            const active =
                              preview?.type === "system" && preview.tool.id === tool.id;
                            return (
                              <button
                                key={item.key}
                                type="button"
                                onMouseEnter={() => setPreview({ type: "system", tool })}
                                onClick={() => {
                                  setPreview({ type: "system", tool });
                                  toggleTool(tool.id);
                                }}
                                className={cn(
                                  "group relative flex items-center gap-3 rounded-xl border p-3 text-left transition-colors cursor-pointer",
                                  selected
                                    ? "border-emerald-400 bg-emerald-50/50 ring-1 ring-emerald-200"
                                    : active
                                      ? "border-indigo-400 bg-indigo-50/50"
                                      : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50",
                                )}
                              >
                                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white">
                                  <Wrench className="h-4 w-4 text-violet-600" />
                                </span>
                                <span className="min-w-0 flex-1 text-sm font-medium text-zinc-800 truncate">
                                  {toolLabel(tool)}
                                </span>
                                {selected ? (
                                  <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                                    <Check className="h-3 w-3" strokeWidth={3} />
                                    Selected
                                  </span>
                                ) : (
                                  <span className="hidden shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-zinc-500 group-hover:flex">
                                    + Add
                                  </span>
                                )}
                              </button>
                            );
                          }

                          // integration action
                          const { tool, provider, action } = item;
                          const selected = localSelected.has(tool.id);
                          const active =
                            preview?.type === "system" && preview.tool.id === tool.id;
                          return (
                            <button
                              key={item.key}
                              type="button"
                              onMouseEnter={() => setPreview({ type: "system", tool })}
                              onClick={() => {
                                setPreview({ type: "system", tool });
                                toggleTool(tool.id);
                              }}
                              className={cn(
                                "group relative flex items-center gap-3 rounded-xl border p-3 text-left transition-colors cursor-pointer",
                                selected
                                  ? "border-emerald-400 bg-emerald-50/50 ring-1 ring-emerald-200"
                                  : active
                                    ? "border-indigo-400 bg-indigo-50/50"
                                    : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50",
                              )}
                            >
                              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white">
                                <IntegrationBrandImage provider={provider.providerId} size={22} />
                              </span>
                              <span className="min-w-0 flex-1 text-sm font-medium text-zinc-800 truncate">
                                {action.displayName}
                              </span>
                              {selected ? (
                                <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                                  <Check className="h-3 w-3" strokeWidth={3} />
                                  Selected
                                </span>
                              ) : (
                                <span className="hidden shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-zinc-500 group-hover:flex">
                                  + Add
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </section>
                ) : (
                  <>
                    {/* Your tools */}
                    <section className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-zinc-900">Your tools</h3>
                      </div>
                      {yourTools.length === 0 ? (
                        <p className="text-xs text-zinc-400 py-4">No custom tools yet. Invent one with AI.</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {yourTools.slice(0, 8).map((tool) => {
                            const active =
                              preview?.type === "composite" && preview.tool.id === tool.id;
                            const selected = localSelected.has(tool.id);
                            return (
                              <button
                                key={tool.id}
                                type="button"
                                onMouseEnter={() => setPreview({ type: "composite", tool })}
                                onClick={() => {
                                  setPreview({ type: "composite", tool });
                                  toggleTool(tool.id);
                                }}
                                className={cn(
                                  "group relative flex items-center gap-3 rounded-xl border p-3 text-left transition-colors cursor-pointer",
                                  selected
                                    ? "border-emerald-400 bg-emerald-50/50 ring-1 ring-emerald-200"
                                    : active
                                      ? "border-indigo-400 bg-indigo-50/50"
                                      : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50",
                                )}
                              >
                                <span
                                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white text-sm font-semibold"
                                  style={{
                                    backgroundColor:
                                      tool.color && tool.color !== "#FFFFFF"
                                        ? tool.color
                                        : "#8B5CF6",
                                  }}
                                >
                                  {tool.icon ? (
                                    <EntityIcon icon={tool.icon} size={16} fallback={Wrench} />
                                  ) : (
                                    "T"
                                  )}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block text-sm font-medium text-zinc-800 truncate">
                                    {tool.name || "Untitled tool"}
                                  </span>
                                  <span className="block text-[11px] text-zinc-400 truncate">
                                    {tool.category || "Custom"}
                                  </span>
                                </span>

                                {selected ? (
                                  <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                                    <Check className="h-3 w-3" strokeWidth={3} />
                                    Selected
                                  </span>
                                ) : (
                                  <span className="hidden shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-zinc-500 group-hover:flex">
                                    + Add
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </section>

                    {/* Integrations */}
                    {INTEGRATIONS_V2_ENABLED && (
                      <section className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-zinc-900">Integrations</h3>
                          <button
                            type="button"
                            onClick={() => setCenterView("integrations")}
                            className="flex text-xs font-medium text-zinc-600 hover:text-zinc-800 cursor-pointer px-2 py-1.5 rounded-md hover:bg-zinc-100"
                          >
                            View all 
                            <ChevronRight className="h-4 w-4 text-zinc-500" />
                          </button>
                        </div>
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => setCenterView("integrations")}
                            className="w-full flex items-center gap-3 rounded-xl border border-zinc-200 p-3 text-left hover:bg-zinc-50 transition-colors cursor-pointer"
                          >
                            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-zinc-50">
                              <Plug className="h-4 w-4 text-zinc-600" />
                            </span>
                            <span className="flex-1 text-sm font-medium text-zinc-800">
                              All integrations
                            </span>
                            <ChevronRight className="h-4 w-4 text-zinc-500" />
                          </button>
                          {connectedProviders.slice(0, 4).map((provider) => {
                            const active =
                              preview?.type === "provider" &&
                              preview.provider.providerId === provider.providerId;
                            return (
                              <button
                                key={provider.providerId}
                                type="button"
                                onMouseEnter={() => setPreview({ type: "provider", provider })}
                                onClick={() => {
                                  setPreview({ type: "provider", provider });
                                  setSelectedProviderId(provider.providerId);
                                  setCenterView("provider");
                                }}
                                className={cn(
                                  "w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-colors cursor-pointer",
                                  active
                                    ? "border-indigo-400 bg-indigo-50/50"
                                    : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50",
                                )}
                              >
                                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-white">
                                  <IntegrationBrandImage provider={provider.providerId} size={22} />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block text-sm font-medium text-zinc-800 truncate">
                                    {provider.displayName}
                                  </span>
                                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    Connected
                                  </span>
                                </span>
                                <ChevronRight className="h-4 w-4 text-zinc-500 shrink-0" />
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ── Detail ── */}
            <div className="border-l p-4 overflow-auto bg-zinc-50/40 flex flex-col">
              <div className="flex-1 min-h-0">
                {!preview ? (
                  <div className="text-sm text-zinc-500 py-6">
                    Hover or select a tool to preview details.
                  </div>
                ) : preview.type === "system" ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-white">
                        <Wrench className="h-5 w-5 text-violet-600" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-zinc-900">{toolLabel(preview.tool)}</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {preview.tool.category?.replace(/_/g, " ") || "Tool"}
                        </p>
                      </div>
                    </div>
                    {preview.tool.category === "SAAS_INTEGRATION" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                        <Check className="h-3 w-3" />
                        Verified
                      </span>
                    )}
                    <p className="text-xs text-zinc-600 leading-relaxed">
                      {preview.tool.description || "No description available."}
                    </p>
                    <Button
                      type="button"
                      variant={localSelected.has(preview.tool.id) ? "outline" : "primary"}
                      className="w-full"
                      onClick={() => toggleTool(preview.tool.id)}
                    >
                      {localSelected.has(preview.tool.id) ? "Remove from selection" : "Add to selection"}
                    </Button>
                  </div>
                ) : preview.type === "composite" ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <span
                        className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white text-lg font-semibold"
                        style={{
                          backgroundColor:
                            preview.tool.color && preview.tool.color !== "#FFFFFF"
                              ? preview.tool.color
                              : "#8B5CF6",
                        }}
                      >
                        {preview.tool.icon ? (
                          <EntityIcon icon={preview.tool.icon} size={20} fallback={Wrench} />
                        ) : (
                          "T"
                        )}
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-zinc-900">
                          {preview.tool.name || "Untitled tool"}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {preview.tool.category || "Custom tool"}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-600 leading-relaxed">
                      {preview.tool.description || "No description available."}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => setEditingToolId(preview.tool.id)}
                    >
                      Edit Tool
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-white">
                        <IntegrationBrandImage provider={preview.provider.providerId} size={32} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-zinc-900">
                          {preview.provider.displayName}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-0.5">Integration</p>
                        {preview.provider.isConnected && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 mt-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Connected
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500">
                      {preview.provider.accountsCount > 0
                        ? `${preview.provider.accountsCount} account${preview.provider.accountsCount === 1 ? "" : "s"} connected`
                        : "No accounts connected"}
                    </p>
                    <div className="space-y-2">
                      {!preview.provider.isConnected && (
                        <Button variant="outline" className="w-full" asChild>
                          <Link href="/dashboard/integrations">Connect account</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t px-5 py-3 flex justify-end gap-2 shrink-0">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              disabled={isLoading}
              className="border border-zinc-200"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApply}
              disabled={isLoading || isLoadingData || localSelected.size === 0}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : localSelected.size > 0 ? (
                `Add Tools (${localSelected.size})`
              ) : (
                "Add Tool"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={aiBuilderOpen} onOpenChange={setAiBuilderOpen}>
        <DialogContent className="sm:max-w-[1400px] sm:w-[95vw] w-[95vw] h-[95vh] p-0 flex flex-col overflow-hidden bg-white border-0 rounded-2xl shadow-2xl [&>button]:hidden">
          <DialogTitle className="sr-only">Invent a tool with AI</DialogTitle>
          {aiBuilderOpen && (
            <div className="flex-1 min-h-0 h-full">
              <ToolAIBuilderView
                onClose={() => setAiBuilderOpen(false)}
                onToolCreated={() => {
                  void utils.compositeTool.list.invalidate();
                  setAiBuilderOpen(false);
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Tool Builder Modal (edit existing) */}
      <Dialog open={!!editingToolId} onOpenChange={(val) => !val && setEditingToolId(null)}>
        <DialogContent className="sm:max-w-[1400px] sm:w-[95vw] w-[95vw] h-[95vh] p-0 flex flex-col overflow-hidden bg-zinc-50 border-0 rounded-2xl shadow-2xl [&>button]:hidden">
          <DialogTitle className="sr-only">Edit Tool</DialogTitle>
          {editingToolId && editingToolData ? (
            <ToolFlowBuilderView
              workspaceId={workspaceId ?? editingToolData.workspaceId ?? undefined}
              initialTool={editingToolData}
              onClose={() => {
                setEditingToolId(null);
                void utils.compositeTool.list.invalidate();
              }}
            />
          ) : editingToolId ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground gap-2">
              {editingToolQuery.isError ? (
                <span>Failed to load tool.</span>
              ) : (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading tool…
                </>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}