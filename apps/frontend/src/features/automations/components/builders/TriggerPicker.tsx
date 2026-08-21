"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Check, ChevronDown, ChevronRight, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  TRIGGER_BY_TYPE,
  TRIGGER_GROUP_LABELS,
  TRIGGER_GROUP_ORDER,
  TRIGGER_META,
  type AutomationTriggerTypeV1,
} from "../../triggerCatalog";
import {
  INTEGRATION_PROVIDERS,
  INTEGRATION_PROVIDER_BY_ID,
} from "../../integrationAutomationCatalog";
import { IntegrationProviderIcon } from "@/features/integrations/components/IntegrationProviderIcon";

function AgentfloxLogo({ size = 16 }: { size?: number }) {
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      <Image src="/images/logo.png" alt="" fill className="object-contain" />
    </span>
  );
}

interface TriggerPickerProps {
  value: AutomationTriggerTypeV1;
  integrationValue?: { provider: string; trigger: string } | null;
  onChange: (type: AutomationTriggerTypeV1) => void;
  onIntegrationChange?: (provider: string, trigger: string) => void;
}

const FLYOUT_WIDTH = 260;
const FLYOUT_MAX_HEIGHT = 280;

export function TriggerPicker({
  value,
  integrationValue,
  onChange,
  onIntegrationChange,
}: TriggerPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [flyoutProvider, setFlyoutProvider] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);

  const selectedAutomationTrigger = integrationValue ? null : TRIGGER_BY_TYPE[value];
  const SelectedTriggerIcon = selectedAutomationTrigger?.icon;

  const integrationProvider = integrationValue
    ? INTEGRATION_PROVIDER_BY_ID[integrationValue.provider]
    : null;

  const integrationTrigger = integrationProvider?.triggers.find(
    (t) => t.id === integrationValue?.trigger,
  );

  const groupedTriggers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TRIGGER_GROUP_ORDER.map((group) => ({
      group,
      items: TRIGGER_META.filter(
        (item) => item.groups.includes(group) && (!q || item.label.toLowerCase().includes(q)),
      ),
    })).filter((g) => g.items.length > 0);
  }, [query]);

  const integrations = useMemo(() => {
    const q = query.trim().toLowerCase();
    return INTEGRATION_PROVIDERS.filter(
      (p) => p.triggers.length > 0 && (!q || p.label.toLowerCase().includes(q)),
    );
  }, [query]);

  const hasResults = groupedTriggers.length > 0 || integrations.length > 0;

  const displayLabel = integrationValue
    ? integrationTrigger?.label ?? "Select a trigger"
    : selectedAutomationTrigger?.label ?? "Select a trigger";

  const closeFlyout = () => setFlyoutProvider(null);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery("");
      closeFlyout();
    }
  };

  const handleSelectAutomationTrigger = (type: AutomationTriggerTypeV1) => {
    onChange(type);
    setOpen(false);
    setQuery("");
    closeFlyout();
  };

  const handleSelectIntegrationTrigger = (providerId: string, triggerId: string) => {
    onIntegrationChange?.(providerId, triggerId);
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
          ) : SelectedTriggerIcon ? (
            <SelectedTriggerIcon className="h-4 w-4 text-zinc-500 shrink-0" />
          ) : (
            <AgentfloxLogo size={16} />
          )}
          <span className="flex-1 truncate">{displayLabel}</span>
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
              <p className="py-6 text-center text-xs text-zinc-500">No triggers found.</p>
            )}

            {groupedTriggers.map(({ group, items }) => (
              <div key={group} className="px-1 py-1">
                <div className="px-2 pb-1 text-[10px] font-semibold tracking-wider text-zinc-400">
                  {TRIGGER_GROUP_LABELS[group]}
                </div>
                {items.map((item) => {
                  const ItemIcon = item.icon;
                  const isSelected = !integrationValue && value === item.type;
                  return (
                    <button
                      key={`${group}-${item.type}`}
                      type="button"
                      className="w-full flex items-center rounded-sm px-2 py-1.5 text-sm text-left text-zinc-800 hover:bg-zinc-100 cursor-pointer"
                      onClick={() => handleSelectAutomationTrigger(item.type)}
                    >
                      <ItemIcon className="mr-2 h-4 w-4 text-zinc-500 shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
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
                  const filteredTriggers = provider.triggers.filter((t) => !q || t.label.toLowerCase().includes(q));

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
                        {filteredTriggers.length === 0 ? (
                          <p className="px-3 py-4 text-xs text-zinc-500 text-center">No events found.</p>
                        ) : (
                          filteredTriggers.map((trigger) => {
                            const isSelected =
                              integrationValue?.provider === provider.id &&
                              integrationValue?.trigger === trigger.id;
                            return (
                              <button
                                key={trigger.id}
                                type="button"
                                className={cn(
                                  "w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-800",
                                  "hover:bg-zinc-50 cursor-pointer text-left",
                                  isSelected && "bg-zinc-50",
                                )}
                                onClick={() => handleSelectIntegrationTrigger(provider.id, trigger.id)}
                              >
                                <IntegrationProviderIcon
                                  providerId={provider.catalogProvider}
                                  size={16}
                                  className="shrink-0"
                                />
                                <span className="flex-1 truncate">{trigger.label}</span>
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
