import React, { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, Check, Play } from "lucide-react";
import { cn } from "@/lib/utils";

const ANY = "__any__";

// Maps a status's underlying type to the group it renders under, in image order.
const GROUP_ORDER = ["NOT_STARTED", "ACTIVE", "CLOSED", "CUSTOM"] as const;
type GroupType = (typeof GROUP_ORDER)[number];

const GROUP_LABEL: Record<GroupType, string> = {
  NOT_STARTED: "Not started",
  ACTIVE: "Active",
  CLOSED: "Closed",
  CUSTOM: "Custom",
};

export function normalizeStatusType(type?: string): GroupType {
  if (!type) return "NOT_STARTED";
  const upper = String(type).toUpperCase();
  if (upper === "TODO" || upper === "OPEN" || upper === "NOT_STARTED") return "NOT_STARTED";
  if (upper === "IN_PROGRESS" || upper === "ACTIVE" || upper === "DOING") return "ACTIVE";
  if (upper === "DONE" || upper === "COMPLETED" || upper === "CLOSED") return "CLOSED";
  if (upper === "CUSTOM") return "CUSTOM";
  return "CUSTOM";
}

function GroupIcon({ type }: { type: GroupType }) {
  if (type === "ACTIVE") {
    return (
      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-zinc-500">
        <span className="h-1 w-1 rounded-full bg-zinc-500" />
      </span>
    );
  }
  if (type === "CLOSED") {
    return (
      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-zinc-500">
        <Check className="h-2.5 w-2.5 text-white stroke-[3]" />
      </span>
    );
  }
  // NOT_STARTED / CUSTOM / default
  return <span className="h-3.5 w-3.5 rounded-full border border-dashed border-zinc-500" />;
}

function StatusIcon({ status }: { status: any }) {
  const normType = normalizeStatusType(status?.type);
  const color = status?.color;

  if (normType === "ACTIVE") {
    return (
      <span
        className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2"
        style={{ borderColor: color || "#3B82F6" }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color || "#3B82F6" }}
        />
      </span>
    );
  }
  if (normType === "CLOSED") {
    return (
      <span
        className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: color || "#10B981" }}
      >
        <Check className="h-2.5 w-2.5 text-white stroke-[3]" />
      </span>
    );
  }
  // NOT_STARTED / CUSTOM / default
  return (
    <span
      className="h-3.5 w-3.5 shrink-0 rounded-full border border-dashed"
      style={{ borderColor: color || "#94A3B8" }}
    />
  );
}

export function StatusMultiSelect({
  value, // string | string[]
  onChange,
  statuses,
}: {
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
  statuses: any[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const selectedIds = useMemo(() => {
    if (!value || value === ANY) return [];
    if (Array.isArray(value)) return value;
    return [value];
  }, [value]);

  const selectedStatusObjs = useMemo(
    () => selectedIds.map((id) => statuses.find((s) => s.id === id)).filter(Boolean) as any[],
    [selectedIds, statuses]
  );

  const filteredStatuses = useMemo(() => {
    if (!search.trim()) return statuses;
    return statuses.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));
  }, [statuses, search]);

  const groups = useMemo(() => {
    return GROUP_ORDER.map((type) => ({
      type,
      label: GROUP_LABEL[type],
      items: filteredStatuses.filter((s) => normalizeStatusType(s.type) === type),
    })).filter((g) => g.items.length > 0);
  }, [filteredStatuses]);

  const allSelected = statuses.length > 0 && selectedIds.length === statuses.length;

  const toggleStatus = (id: string) => {
    if (selectedIds.includes(id)) {
      const next = selectedIds.filter((x) => x !== id);
      onChange(next.length === 0 ? ANY : next);
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const toggleGroup = (items: any[]) => {
    const ids = items.map((s) => s.id);
    const allChecked = ids.every((id) => selectedIds.includes(id));
    if (allChecked) {
      const next = selectedIds.filter((id) => !ids.includes(id));
      onChange(next.length === 0 ? ANY : next);
    } else {
      const next = Array.from(new Set([...selectedIds, ...ids]));
      onChange(next);
    }
  };

  const toggleCollapsed = (type: string) => {
    setCollapsed((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const selectAll = () => {
    onChange(statuses.map((s) => s.id));
  };

  const deselectAll = () => {
    onChange(ANY);
  };

  const toggleAll = () => {
    if (allSelected) {
      deselectAll();
    } else {
      selectAll();
    }
  };

  // Renders what shows inside the closed trigger button.
  // 0 selected -> "Any Status"
  // 1-2 selected -> icon + uppercase name for each, like the list rows
  // 3+ (not all) -> "N Statuses"
  // all -> "All Statuses"
  const renderTriggerContent = () => {
    if (!value || value === ANY || selectedIds.length === 0) {
      return <span className="truncate text-sm text-zinc-500">Any Status</span>;
    }
    if (selectedIds.length === statuses.length && statuses.length > 0) {
      return <span className="truncate text-sm text-zinc-800">All Statuses</span>;
    }
    if (selectedIds.length <= 2) {
      return (
        <span className="flex min-w-0 items-center gap-1.5 overflow-hidden">
          {selectedStatusObjs.map((s, i) => (
            <React.Fragment key={s.id}>
              <span className="flex min-w-0 items-center gap-1.5">
                <StatusIcon status={s} />
                <span className="truncate uppercase text-[11px] tracking-wider text-zinc-800">
                  {s.name}
                </span>
              </span>
              {i < selectedStatusObjs.length - 1 && (
                <span className="h-3 w-px shrink-0 bg-zinc-200" />
              )}
            </React.Fragment>
          ))}
        </span>
      );
    }
    return <span className="truncate text-sm text-zinc-800">{selectedIds.length} Statuses</span>;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="mt-1 flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          {renderTriggerContent()}
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <div className="p-2.5">
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 mb-2.5 text-sm bg-zinc-50/50 border-zinc-200"
          />
          <div className="flex items-center justify-between px-1 py-1 mb-1">
            <span className="text-xs font-semibold text-zinc-500">Statuses</span>
            <button
              onClick={toggleAll}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              {allSelected ? "Deselect All" : "Select All"}
            </button>
          </div>
          <div className="max-h-[260px] overflow-y-auto space-y-1">
            {groups.map((group) => {
              const groupIds = group.items.map((s) => s.id);
              const groupChecked = groupIds.length > 0 && groupIds.every((id) => selectedIds.includes(id));
              const isCollapsed = collapsed[group.type];
              return (
                <div key={group.type} className="relative">
                  <div className="flex items-center gap-1.5 py-1 px-1.5 rounded-md hover:bg-zinc-100/70 group/row">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        toggleCollapsed(group.type);
                      }}
                      className="flex h-5 w-5 items-center justify-center rounded cursor-pointer text-zinc-700 hover:bg-zinc-200/60 transition-colors"
                      title={isCollapsed ? "Expand group" : "Collapse group"}
                    >
                      {/* Normal group icon (hidden on hover) */}
                      <span className="flex items-center justify-center group-hover/row:hidden">
                        <GroupIcon type={group.type} />
                      </span>
                      {/* Play triangle button (shown on hover) */}
                      <span className="hidden items-center justify-center group-hover/row:flex">
                        <Play
                          className={cn(
                            "h-2.5 w-2.5 fill-zinc-800 text-zinc-800 transition-transform duration-100",
                            !isCollapsed ? "rotate-90 translate-x-[0.5px]" : ""
                          )}
                        />
                      </span>
                    </button>
                    <label className="flex flex-1 items-center gap-2 text-sm cursor-pointer select-none">
                      <span className="flex-1 truncate text-zinc-800">{group.label}</span>
                      <Checkbox
                        checked={groupChecked}
                        onCheckedChange={() => toggleGroup(group.items)}
                        className="h-4 w-4 rounded cursor-pointer data-[state=checked]:bg-zinc-800 data-[state=checked]:border-zinc-800"
                      />
                    </label>
                  </div>

                  {!isCollapsed && (
                    <div className="relative pl-6">
                      {/* Vertical connector line */}
                      <div className="absolute left-[15px] top-0 bottom-2 w-px bg-zinc-200" />

                      <div className="space-y-0.5">
                        {group.items.map((s) => {
                          const isChecked = selectedIds.includes(s.id);
                          return (
                            <label
                              key={s.id}
                              className={cn(
                                "flex items-center gap-2 pl-2.5 pr-1 py-1 rounded-md cursor-pointer hover:bg-zinc-50 select-none",
                                isChecked && "bg-zinc-50/70"
                              )}
                            >
                              <StatusIcon status={s} />
                              <span className="flex-1 truncate uppercase text-[11px] font-semibold tracking-wider text-zinc-700">
                                {s.name}
                              </span>
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => toggleStatus(s.id)}
                                className="h-4 w-4 rounded cursor-pointer data-[state=checked]:bg-zinc-800 data-[state=checked]:border-zinc-800 mr-0.5"
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {groups.length === 0 && (
              <div className="p-3 text-center text-xs text-zinc-500">No statuses found.</div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}