"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ACTION_BY_TYPE,
  ACTION_GROUP_LABELS,
  ACTION_GROUP_ORDER,
  ACTION_META,
  INTEGRATION_ACTIONS,
  type AutomationActionTypeV1,
} from "../../actionCatalog";

export function ActionPicker({
  value,
  onChange,
}: {
  value: AutomationActionTypeV1;
  onChange: (type: AutomationActionTypeV1) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = ACTION_BY_TYPE[value];
  const Icon = selected?.icon;

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
    return INTEGRATION_ACTIONS.filter((item) => !q || item.label.toLowerCase().includes(q));
  }, [query]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full h-10 rounded-lg border border-zinc-200 bg-white px-3 flex items-center gap-2 text-sm text-left hover:bg-zinc-50 cursor-pointer"
        >
          {Icon && <Icon className={cn("h-4 w-4 shrink-0", selected?.destructive ? "text-red-500" : "text-zinc-500")} />}
          <span className={cn("flex-1 truncate", selected?.destructive && "text-red-600")}>
            {selected?.label ?? "Select an action"}
          </span>
          <ChevronDown className={cn("h-4 w-4 text-zinc-400", open && "rotate-180")} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[360px] max-h-[420px] p-0 overflow-hidden flex flex-col"
        side="bottom"
      >
        <Command className="flex flex-col min-h-0 border-0">
          <div className="flex items-center gap-2 border-b px-3 shrink-0">
            <Search className="h-3.5 w-3.5 text-zinc-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
            />
          </div>
          <CommandList
            className="min-h-0 overflow-y-auto overscroll-contain"
            style={{ maxHeight: "var(--radix-popover-content-available-height, 360px)" }}
            onWheel={(e) => e.stopPropagation()}
          >
            <CommandEmpty className="py-6 text-center text-xs text-zinc-500">No actions found.</CommandEmpty>
            {grouped.map(({ group, items }) => (
              <CommandGroup
                key={group}
                heading={ACTION_GROUP_LABELS[group]}
                className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-zinc-400"
              >
                {items.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <CommandItem
                      key={`${group}-${item.type}`}
                      value={`${group} ${item.label}`}
                      className="text-sm cursor-pointer"
                      onSelect={() => {
                        if (item.comingSoon) {
                          toast.info(`${item.label} is coming soon`);
                          return;
                        }
                        onChange(item.type);
                        setOpen(false);
                      }}
                    >
                      <ItemIcon className={cn("mr-2 h-4 w-4", item.destructive ? "text-red-500" : "text-zinc-500")} />
                      <span className={cn("flex-1", item.destructive && "text-red-600")}>{item.label}</span>
                      {(item.submenu || item.comingSoon) && <ChevronRight className="h-4 w-4 text-zinc-400" />}
                      {value === item.type && !item.comingSoon && <Check className="h-4 w-4 text-zinc-700" />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
            {integrations.length > 0 && (
              <CommandGroup
                heading="INTEGRATIONS"
                className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-zinc-400"
              >
                {integrations.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`integrations ${item.label}`}
                    className="text-sm cursor-pointer"
                    onSelect={() => toast.info(`${item.label} actions are coming soon`)}
                  >
                    <span className="flex-1">{item.label}</span>
                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}