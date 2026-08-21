"use client";

import React, { useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight, Search, PlusCircle, Bot } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import type { AutomationScope } from "../../types";
import {
  ACTION_BY_TYPE,
  ACTION_GROUP_LABELS,
  ACTION_GROUP_ORDER,
  ACTION_META,
  type AutomationActionTypeV1,
} from "../../actionCatalog";
import {
  INTEGRATION_PROVIDERS,
  INTEGRATION_PROVIDER_BY_ID,
} from "../../integrationAutomationCatalog";
import { IntegrationProviderIcon } from "@/features/integrations/components/IntegrationProviderIcon";

function AgentIcon({ className }: { className?: string }) {
  return (
    <img
      src="/images/ai-agent-removebg-preview.png"
      alt=""
      aria-hidden
      className={cn("h-5 w-5 shrink-0", className)}
    />
  );
}

interface ActionPickerProps {
  value: AutomationActionTypeV1;
  integrationValue?: { provider: string; action: string } | null;
  actionConfig?: any;
  scope?: AutomationScope;
  onChange: (type: AutomationActionTypeV1, extraConfig?: any) => void;
  onIntegrationChange?: (provider: string, action: string) => void;
}

const FLYOUT_WIDTH = 260;
const FLYOUT_MAX_HEIGHT = 320;

const DEFAULT_SUPER_AGENTS = [
  { id: "task-sanitizer", name: "Task Sanitizer", description: "Cleans up new task text", initials: "TS", bg: "bg-emerald-500" },
  { id: "triage-taylor", name: "Triage Taylor", description: "Triages incoming requests", initials: "TT", bg: "bg-amber-500" },
  { id: "summarizer-sam", name: "Summarizer Sam", description: "Summarizes task updates", initials: "SS", bg: "bg-rose-400" },
  { id: "synthesis-sage", name: "Synthesis Sage", description: "Synthesizes information", initials: "SS", bg: "bg-pink-400" },
];

export function ActionPicker({
  value,
  integrationValue,
  actionConfig,
  scope,
  onChange,
  onIntegrationChange,
}: ActionPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [agentQuery, setAgentQuery] = useState("");
  const [flyoutProvider, setFlyoutProvider] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);

  const { data: dbAgents } = trpc.agent.list.useQuery(
    {
      workspaceId: scope?.workspaceId || "",
      spaceId: scope?.spaceId,
      projectId: scope?.projectId,
      teamId: scope?.teamId,
      scopeMode: scope?.spaceId || scope?.projectId || scope?.teamId ? "inScope" : "all",
      pageSize: 50,
      includeRelations: true,
      includeAutomationAgents: true,
    },
    { enabled: !!scope?.workspaceId }
  );

  const allAgents = useMemo(() => {
    const raw = dbAgents?.items || [];
    return raw.map((a: any) => ({
      id: a.id,
      name: a.name,
      description: a.description || "",
      avatar: a.avatar,
      initials: (a.name || "AI").substring(0, 2).toUpperCase(),
      bg: a.color || "bg-emerald-500",
    }));
  }, [dbAgents]);

  const filteredSuperAgents = useMemo(() => {
    if (!agentQuery.trim()) return allAgents;
    const q = agentQuery.toLowerCase();
    return allAgents.filter((a) => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q));
  }, [allAgents, agentQuery]);

  const selectedAction = integrationValue ? null : ACTION_BY_TYPE[value];

  const isSuperAgentAction = !integrationValue && value === "LAUNCH_AI_AGENT";
  const SelectedActionIcon = isSuperAgentAction ? AgentIcon : selectedAction?.icon;

  const integrationProvider = integrationValue
    ? INTEGRATION_PROVIDER_BY_ID[integrationValue.provider]
    : null;

  const integrationAction = integrationProvider?.actions.find(
    (a) => a.id === integrationValue?.action,
  );

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ACTION_GROUP_ORDER.map((group) => ({
      group,
      items: ACTION_META.filter(
        (item) => item.groups.includes(group) && (!q || item.label.toLowerCase().includes(q)),
      ),
    })).filter((g) => g.items.length > 0);
  }, [query]);

  const integrations = useMemo(() => {
    const q = query.trim().toLowerCase();
    return INTEGRATION_PROVIDERS.filter(
      (p) => p.actions.length > 0 && (!q || p.label.toLowerCase().includes(q)),
    );
  }, [query]);

  const hasResults = grouped.length > 0 || integrations.length > 0;

  const displayLabel = integrationValue
    ? integrationAction?.label ?? "Select an action"
    : isSuperAgentAction
    ? `Launch Super Agent: ${actionConfig?.agentName || "Select Agent"}`
    : selectedAction?.label ?? "Select an action";

  const closeFlyout = () => {
    setFlyoutProvider(null);
    setAgentQuery("");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery("");
      closeFlyout();
    }
  };

  const handleSelectAction = (type: AutomationActionTypeV1) => {
    onChange(type);
    setOpen(false);
    setQuery("");
    closeFlyout();
  };

  const handleSelectSuperAgent = (agent: any) => {
    onChange("LAUNCH_AI_AGENT", {
      agentId: agent.id,
      agentName: agent.name,
      agentDescription: agent.description,
    });
    setOpen(false);
    setQuery("");
    closeFlyout();
  };

  const handleSelectIntegrationAction = (providerId: string, actionId: string) => {
    onIntegrationChange?.(providerId, actionId);
    setOpen(false);
    setQuery("");
    closeFlyout();
  };

  const handleListWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = listRef.current;
    if (!el) return;
    e.stopPropagation();
    el.scrollTop += e.deltaY;
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full h-10 rounded-lg border border-zinc-200 bg-white px-3",
            "flex items-center gap-2 text-sm text-left hover:bg-zinc-50 cursor-pointer transition-colors",
          )}
        >
          {integrationValue ? (
            <IntegrationProviderIcon providerId={integrationValue.provider} size={16} className="shrink-0" />
          ) : SelectedActionIcon ? (
            <SelectedActionIcon
              className={cn(
                "h-4 w-4 shrink-0",
                selectedAction?.destructive ? "text-red-500" : "text-zinc-500",
              )}
            />
          ) : null}
          <span
            className={cn(
              "flex-1 truncate",
              !integrationValue && selectedAction?.destructive && "text-red-600",
            )}
          >
            {displayLabel}
          </span>
          <ChevronDown className={cn("h-4 w-4 text-zinc-400 shrink-0 transition-transform", open && "rotate-180")} />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={4}
        avoidCollisions
        collisionPadding={8}
        className={cn(
          "relative w-[360px] overflow-visible p-0 flex flex-col",
          "max-h-[min(420px,var(--radix-popover-content-available-height))]",
        )}
      >
        <div className="relative flex min-h-0 flex-1 flex-col overflow-visible rounded-md">
          <div className="flex items-center gap-2 border-b px-3 shrink-0">
            <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                closeFlyout();
              }}
              placeholder="Search..."
              className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
            />
          </div>

          <div
            ref={listRef}
            onWheel={handleListWheel}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1"
            style={{ maxHeight: "min(360px, var(--radix-popover-content-available-height, 360px))" }}
          >
            {!hasResults && (
              <p className="py-6 text-center text-xs text-zinc-500">No actions found.</p>
            )}

            {grouped.map(({ group, items }) => (
              <div key={group} className="px-1 py-1">
                <div className="px-2 pb-1 text-[10px] font-semibold tracking-wider text-zinc-400">
                  {ACTION_GROUP_LABELS[group]}
                </div>
                {items.map((item) => {
                  const ItemIcon = item.type === "LAUNCH_AI_AGENT" ? AgentIcon : item.icon;
                  const isSelected = !integrationValue && value === item.type && !item.comingSoon;

                  // Super Agents Submenu
                  if (item.type === "LAUNCH_AI_AGENT") {
                    const flyoutKey = `${group}-SUPER_AGENTS`;
                    const isSuperAgentsFlyoutOpen = flyoutProvider === flyoutKey;
                    return (
                      <Popover
                        key={`${group}-${item.type}`}
                        open={isSuperAgentsFlyoutOpen}
                        onOpenChange={(nextOpen) => {
                          if (nextOpen) setFlyoutProvider(flyoutKey);
                          else if (flyoutProvider === flyoutKey) setFlyoutProvider(null);
                        }}
                        modal={false}
                      >
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              "w-full flex items-center rounded-sm px-2 py-1.5 text-sm text-left text-zinc-800",
                              "hover:bg-zinc-100 cursor-pointer",
                              isSuperAgentsFlyoutOpen && "bg-zinc-100",
                            )}
                          >
                            <ItemIcon className="mr-2 h-4 w-4 shrink-0" />
                            <span className="flex-1 truncate">{item.label}</span>
                            <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          side="right"
                          align="start"
                          sideOffset={4}
                          alignOffset={-40}
                          avoidCollisions
                          className="z-[60] overflow-y-auto rounded-xl border border-zinc-200 bg-white p-2 shadow-xl"
                          style={{
                            width: FLYOUT_WIDTH,
                            maxHeight: `min(${FLYOUT_MAX_HEIGHT}px, var(--radix-popover-content-available-height))`,
                          }}
                          onWheel={(e) => e.stopPropagation()}
                        >
                          <div className="space-y-1.5">
                            {/* Search */}
                            <div className="flex h-8 items-center rounded-md border border-zinc-200 bg-white px-2">
                              <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0 mr-1.5" />
                              <input
                                type="text"
                                value={agentQuery}
                                onChange={(e) => setAgentQuery(e.target.value)}
                                placeholder="Search..."
                                className="w-full bg-transparent border-0 p-0 text-xs outline-none placeholder:text-zinc-400"
                                autoFocus
                              />
                            </div>

                            {/* Create Super Agent */}
                            <button
                              type="button"
                              onClick={() => {
                                window.open(`/dashboard/agents/create?workspaceId=${scope?.workspaceId || ""}`, "_blank");
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-normal text-zinc-700 hover:bg-zinc-100/70 transition-colors cursor-pointer"
                            >
                              <PlusCircle className="h-4 w-4 text-zinc-500 shrink-0" />
                              <span>Create Super Agent</span>
                            </button>

                            {/* Agents List */}
                            <div className="space-y-0.5 pt-0.5">
                              {filteredSuperAgents.map((agent) => (
                                <button
                                  key={agent.id}
                                  type="button"
                                  onClick={() => handleSelectSuperAgent(agent)}
                                  className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-zinc-100/70 transition-colors cursor-pointer text-left group"
                                >
                                  <Avatar className="h-6 w-6 ring-1 ring-zinc-200 shrink-0">
                                    {agent.avatar && <AvatarImage src={agent.avatar} alt={agent.name} />}
                                    <AvatarFallback className={cn("text-[10px] text-white font-medium", agent.bg || "bg-emerald-500")}>
                                      {agent.initials || "AI"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-medium text-zinc-800 truncate">
                                      {agent.name}
                                    </div>
                                    {agent.description && (
                                      <div className="text-[10px] text-zinc-400 truncate">
                                        {agent.description}
                                      </div>
                                    )}
                                  </div>
                                </button>
                              ))}
                              {filteredSuperAgents.length === 0 && (
                                <p className="px-3 py-3 text-xs text-zinc-400 text-center">No agents found</p>
                              )}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    );
                  }

                  return (
                    <button
                      key={`${group}-${item.type}`}
                      type="button"
                      disabled={item.comingSoon}
                      className={cn(
                        "w-full flex items-center rounded-sm px-2 py-1.5 text-sm text-left",
                        item.comingSoon
                          ? "text-zinc-400 cursor-not-allowed"
                          : "text-zinc-800 hover:bg-zinc-100 cursor-pointer",
                      )}
                      onClick={() => {
                        if (item.comingSoon) return;
                        handleSelectAction(item.type);
                      }}
                    >
                      <ItemIcon
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          item.destructive ? "text-red-500" : "text-zinc-500",
                        )}
                      />
                      <span className={cn("flex-1 truncate", item.destructive && "text-red-600")}>
                        {item.label}
                      </span>
                      {(item.submenu || item.comingSoon) && (
                        <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0" />
                      )}
                      {isSelected && <Check className="h-4 w-4 text-zinc-700 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))}

            {integrations.length > 0 && (
              <div className="px-1 py-1">
                <div className="px-2 pb-1 text-[10px] font-semibold tracking-wider text-zinc-400">
                  INTEGRATIONS
                </div>
                {integrations.map((provider) => {
                  const isFlyoutOpen = flyoutProvider === provider.id;

                  const q = query.trim().toLowerCase();
                  const filteredActions = provider.actions.filter((a) => !q || a.label.toLowerCase().includes(q));

                  return (
                    <Popover
                      key={provider.id}
                      open={isFlyoutOpen}
                      onOpenChange={(nextOpen) => {
                        if (nextOpen) setFlyoutProvider(provider.id);
                        else if (flyoutProvider === provider.id) setFlyoutProvider(null);
                      }}
                      modal={false}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "w-full flex items-center rounded-sm px-2 py-1.5 text-sm text-left text-zinc-800",
                            "hover:bg-zinc-100 cursor-pointer",
                            isFlyoutOpen && "bg-zinc-100",
                          )}
                        >
                          <IntegrationProviderIcon
                            providerId={provider.catalogProvider}
                            size={16}
                            className="mr-2 shrink-0"
                          />
                          <span className="flex-1 truncate">{provider.label}</span>
                          <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        side="right"
                        align="start"
                        sideOffset={4}
                        alignOffset={-48}
                        avoidCollisions
                        className="z-[60] overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 p-0 shadow-lg"
                        style={{
                          width: FLYOUT_WIDTH,
                          maxHeight: `min(${FLYOUT_MAX_HEIGHT}px, var(--radix-popover-content-available-height))`,
                        }}
                        onWheel={(e) => e.stopPropagation()}
                      >
                        {filteredActions.length === 0 ? (
                          <p className="px-3 py-4 text-xs text-zinc-500 text-center">No actions found.</p>
                        ) : (
                          filteredActions.map((action) => {
                            const isSelected =
                              integrationValue?.provider === provider.id &&
                              integrationValue?.action === action.id;
                            return (
                              <button
                                key={action.id}
                                type="button"
                                className={cn(
                                  "w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-800",
                                  "hover:bg-zinc-50 cursor-pointer text-left",
                                  isSelected && "bg-zinc-50",
                                )}
                                onClick={() => handleSelectIntegrationAction(provider.id, action.id)}
                              >
                                <IntegrationProviderIcon
                                  providerId={provider.catalogProvider}
                                  size={16}
                                  className="shrink-0"
                                />
                                <span className="flex-1 truncate">{action.label}</span>
                                {isSelected && <Check className="h-4 w-4 text-zinc-700 shrink-0" />}
                              </button>
                            );
                          })
                        )}
                      </PopoverContent>
                    </Popover>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

