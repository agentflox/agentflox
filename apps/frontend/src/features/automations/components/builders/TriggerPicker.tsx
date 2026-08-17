"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  INTEGRATION_TRIGGERS,
  TRIGGER_BY_TYPE,
  TRIGGER_GROUP_LABELS,
  TRIGGER_GROUP_ORDER,
  TRIGGER_META,
  type AutomationTriggerTypeV1,
} from "../../triggerCatalog";

export function TriggerPicker({
  value,
  onChange,
}: {
  value: AutomationTriggerTypeV1;
  onChange: (type: AutomationTriggerTypeV1) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = TRIGGER_BY_TYPE[value];
  const Icon = selected?.icon;

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TRIGGER_GROUP_ORDER.map((group) => ({
      group,
      items: TRIGGER_META.filter(
        (item) =>
          item.groups.includes(group) &&
          (!q || item.label.toLowerCase().includes(q)),
      ),
    })).filter((g) => g.items.length > 0);
  }, [query]);

  const integrations = useMemo(() => {
    const q = query.trim().toLowerCase();
    return INTEGRATION_TRIGGERS.filter((item) => !q || item.label.toLowerCase().includes(q));
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
          className="w-full h-10 rounded-lg border border-zinc-200 bg-white px-3 flex items-center gap-2 text-sm text-left hover:bg-zinc-50"
        >
          {Icon && <Icon className="h-4 w-4 text-zinc-500 shrink-0" />}
          <span className="flex-1 truncate">{selected?.label ?? "Select a trigger"}</span>
          <ChevronDown className={cn("h-4 w-4 text-zinc-400", open && "rotate-180")} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[360px] p-0" side="bottom">
        <Command className="border-0">
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="h-3.5 w-3.5 text-zinc-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
            />
          </div>
          <CommandList className="max-h-[360px] overflow-y-auto">
            <CommandEmpty className="py-6 text-center text-xs text-zinc-500">No triggers found.</CommandEmpty>
            {grouped.map(({ group, items }) => (
              <CommandGroup key={group} heading={TRIGGER_GROUP_LABELS[group]} className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-zinc-400">
                {items.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <CommandItem
                      key={`${group}-${item.type}`}
                      value={`${group} ${item.label}`}
                      className="text-sm cursor-pointer"
                      onSelect={() => {
                        onChange(item.type);
                        setOpen(false);
                      }}
                    >
                      <ItemIcon className="mr-2 h-4 w-4 text-zinc-500" />
                      <span className="flex-1">{item.label}</span>
                      {value === item.type && <Check className="h-4 w-4 text-zinc-700" />}
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
                    onSelect={() => toast.info(`${item.label} triggers are coming soon`)}
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
