import React, { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ChevronDown, Check, Play } from "lucide-react";
import { cn } from "@/lib/utils";

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
        className="flex h-3.5 w-3.5 items-center justify-center rounded-full border-2"
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
        className="flex h-3.5 w-3.5 items-center justify-center rounded-full"
        style={{ backgroundColor: color || "#10B981" }}
      >
        <Check className="h-2.5 w-2.5 text-white stroke-[3]" />
      </span>
    );
  }
  // NOT_STARTED / CUSTOM / default
  return (
    <span
      className="h-3.5 w-3.5 rounded-full border border-dashed"
      style={{ borderColor: color || "#94A3B8" }}
    />
  );
}

export function StatusSingleSelect({
  value,
  onChange,
  statuses = [],
  placeholder = "Select a status",
}: {
  value?: string;
  onChange: (value: string) => void;
  statuses?: any[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

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

  const toggleCollapsed = (type: string) => {
    setCollapsed((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const selectedStatus = statuses.find((s) => s.id === value || s.name === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm hover:bg-zinc-50 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
        >
          <span className="flex items-center gap-2 truncate">
            {selectedStatus ? (
              <>
                <StatusIcon status={selectedStatus} />
                <span className="truncate uppercase text-xs tracking-wide text-zinc-900">
                  {selectedStatus.name}
                </span>
              </>
            ) : (
              <span className="text-zinc-400">{placeholder}</span>
            )}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 rounded-xl shadow-xl border-zinc-200 bg-white" align="start">
        <div className="p-2.5 space-y-2.5">
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-zinc-100/70 text-[11px] text-zinc-600 leading-snug">
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-zinc-400 text-[10px] font-bold text-zinc-500 shrink-0 mt-0.5">
              i
            </span>
            <span>
              This status may not exist in every List at this location, so the action won&apos;t apply to tasks in Lists without it.
            </span>
          </div>
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs bg-white border-zinc-200"
          />
          <div className="max-h-[260px] overflow-y-auto space-y-1">
            {groups.map((group) => {
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
                    <div
                      onClick={() => toggleCollapsed(group.type)}
                      className="flex flex-1 items-center gap-2 text-sm cursor-pointer select-none"
                    >
                      <span className="flex-1 truncate text-zinc-800">{group.label}</span>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="relative pl-6">
                      {/* Vertical connector line */}
                      <div className="absolute left-[15px] top-0 bottom-2 w-px bg-zinc-200" />

                      <div className="space-y-0.5">
                        {group.items.map((s) => {
                          const isSelected = value === s.id || value === s.name;
                          return (
                            <button
                              type="button"
                              key={s.id}
                              onClick={() => {
                                onChange(s.id);
                                setOpen(false);
                              }}
                              className={cn(
                                "flex w-full items-center gap-2 pl-2.5 pr-2 py-1.5 rounded-md cursor-pointer hover:bg-zinc-100/80 text-left transition-colors select-none",
                                isSelected && "bg-zinc-100"
                              )}
                            >
                              <StatusIcon status={s} />
                              <span className="flex-1 truncate uppercase text-[11px] font-semibold tracking-wider text-zinc-700">
                                {s.name}
                              </span>
                              {isSelected && (
                                <Check className="h-3.5 w-3.5 text-zinc-800 stroke-[2.5]" />
                              )}
                            </button>
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
