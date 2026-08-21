"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, Circle, X } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import type { AutomationScope } from "../types";

export type ActivityStatusFilter = "FAILED" | "AI_CONDITION_SKIPPED" | "SKIPPED" | "SUCCESS";

const STATUS_OPTIONS: Array<{
  id: ActivityStatusFilter;
  label: string;
  color: string;
}> = [
  { id: "FAILED", label: "Failed", color: "text-red-500" },
  { id: "AI_CONDITION_SKIPPED", label: "AI Condition skipped", color: "text-zinc-400" },
  { id: "SKIPPED", label: "Skipped", color: "text-zinc-400" },
  { id: "SUCCESS", label: "Success", color: "text-emerald-500" },
];

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function displayStatus(log: { status: string; error?: string | null }): ActivityStatusFilter {
  if (log.status === "SUCCESS") return "SUCCESS";
  if (log.status === "PARTIAL") return "SKIPPED";
  if (log.status === "FAILED" && (log.error || "").includes("condition_gate")) return "AI_CONDITION_SKIPPED";
  return "FAILED";
}

function StatusDot({ status }: { status: ActivityStatusFilter }) {
  const color =
    status === "FAILED" ? "text-red-500" : status === "SUCCESS" ? "text-emerald-500" : "text-zinc-400";
  return <Circle className={cn("h-3.5 w-3.5", color)} />;
}

function ActivityEmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <svg width="88" height="72" viewBox="0 0 88 72" fill="none" aria-hidden className="mb-5">
        <rect x="16" y="8" width="48" height="14" rx="4" className="fill-zinc-200" />
        <rect x="12" y="20" width="56" height="16" rx="4" className="fill-zinc-100 stroke-zinc-200" strokeWidth="1" />
        <rect x="8" y="34" width="64" height="18" rx="4" className="fill-white stroke-zinc-200" strokeWidth="1.5" />
        <circle cx="66" cy="52" r="14" className="fill-white stroke-zinc-300" strokeWidth="2" />
        <circle cx="66" cy="52" r="7" className="stroke-zinc-300" strokeWidth="2" />
        <path d="M76 62 L82 68" className="stroke-zinc-300" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <h3 className="text-base font-semibold text-zinc-900">No activity found</h3>
      <p className="mt-1 text-sm text-zinc-500">We couldn&apos;t find activity that matches your filters.</p>
      <Button
        type="button"
        className="mt-5 h-9 rounded-md bg-zinc-900 px-4 text-sm text-white hover:bg-zinc-800 cursor-pointer"
        onClick={onClear}
      >
        Clear filters
      </Button>
    </div>
  );
}

function DateRunCalendar({
  selected,
  onSelect,
}: {
  selected?: Date;
  onSelect: (date: Date | undefined) => void;
}) {
  const [month, setMonth] = useState<Date>(selected ?? new Date());
  const today = startOfDay(new Date());

  return (
    <div className="w-[280px] p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-semibold text-zinc-900">
          {month.toLocaleString("default", { month: "long", year: "numeric" })}
        </span>
        <button
          type="button"
          className="ml-auto text-xs text-zinc-500 hover:text-zinc-800 cursor-pointer"
          onClick={() => {
            const now = new Date();
            setMonth(now);
            onSelect(now);
          }}
        >
          Today
        </button>
        <div className="flex flex-col -space-y-1">
          <button
            type="button"
            className="h-4 w-4 flex items-center justify-center text-zinc-500 hover:text-zinc-800 cursor-pointer"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="h-4 w-4 flex items-center justify-center text-zinc-500 hover:text-zinc-800 cursor-pointer"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <DayPicker
        mode="single"
        month={month}
        onMonthChange={setMonth}
        selected={selected}
        onSelect={onSelect}
        showOutsideDays
        hideNavigation
        formatters={{
          formatWeekdayName: (date) => date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2),
        }}
        modifiers={{
          future: { after: today },
        }}
        classNames={{
          month_caption: "hidden",
          nav: "hidden",
          month: "w-full",
          weekdays: "flex",
          weekday: "flex-1 text-[11px] font-medium text-zinc-400 text-center py-1",
          week: "flex w-full",
          day: "flex-1 text-center",
          outside: "text-zinc-300",
          today: "",
        }}
        components={{
          DayButton: ({ day, modifiers, className, ...props }) => (
            <button
              type="button"
              className={cn(
                "h-8 w-8 mx-auto flex items-center justify-center text-sm rounded-full cursor-pointer",
                modifiers.outside && "text-zinc-300",
                modifiers.future && !modifiers.selected && "text-zinc-400",
                modifiers.selected && "bg-red-500 text-white font-medium",
                !modifiers.selected && "hover:bg-zinc-100",
                className,
              )}
              {...props}
            >
              {day.date.getDate()}
            </button>
          ),
        }}
      />
    </div>
  );
}

export function ActivityAutomations({
  workspaceId,
  locationScope,
  onLocationChange,
  locationPicker,
}: {
  workspaceId?: string;
  locationScope: AutomationScope | null;
  onLocationChange: (scope: AutomationScope | null) => void;
  locationPicker: React.ReactNode;
}) {
  const [dateRun, setDateRun] = useState<Date | undefined>();
  const [statuses, setStatuses] = useState<ActivityStatusFilter[]>([]);
  const [locationOpen, setLocationOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  useEffect(() => {
    setLocationOpen(false);
  }, [locationScope?.contextId, locationScope?.contextType]);

  const logs = trpc.automation.listLogs.useQuery(
    {
      workspaceId: workspaceId || "",
      teamId: locationScope?.teamId,
      spaceId: locationScope?.spaceId,
      projectId: locationScope?.projectId,
      folderId: locationScope?.folderId,
      listId: locationScope?.listId,
      exactScope: !!locationScope,
      dateFrom: dateRun ? startOfDay(dateRun).toISOString() : undefined,
      dateTo: dateRun ? endOfDay(dateRun).toISOString() : undefined,
      activityStatuses: statuses.length ? statuses : undefined,
      pageSize: 50,
    },
    { enabled: !!workspaceId },
  );

  const items = logs.data?.items ?? [];
  const hasFilters = !!locationScope || !!dateRun || statuses.length > 0;

  const clearFilters = () => {
    onLocationChange(null);
    setDateRun(undefined);
    setStatuses([]);
  };

  const toggleStatus = (id: ActivityStatusFilter) => {
    setStatuses((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const statusLabel = useMemo(() => {
    if (statuses.length === 1) return STATUS_OPTIONS.find((s) => s.id === statuses[0])?.label ?? "Status";
    if (statuses.length > 1) return `Status (${statuses.length})`;
    return "Status";
  }, [statuses]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-5 pt-4 pb-3 flex-wrap">
        {locationScope ? (
          <Popover open={locationOpen} onOpenChange={setLocationOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 h-8 rounded-md bg-zinc-100 px-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200 cursor-pointer"
              >
                <span className="truncate max-w-[180px]">{locationScope.contextName}</span>
                <span
                  role="button"
                  tabIndex={0}
                  className="h-4 w-4 rounded-full bg-zinc-300/80 text-zinc-600 flex items-center justify-center hover:bg-zinc-400 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLocationChange(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      onLocationChange(null);
                    }
                  }}
                >
                  <X className="h-2.5 w-2.5" />
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[420px] p-0">
              {locationPicker}
            </PopoverContent>
          </Popover>
        ) : (
          <Popover open={locationOpen} onOpenChange={setLocationOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 h-8 rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer"
              >
                Location
                <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[420px] p-0">
              {locationPicker}
            </PopoverContent>
          </Popover>
        )}

        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 h-8 rounded-md border px-3 text-xs font-medium cursor-pointer",
                dateRun
                  ? "border-zinc-300 bg-zinc-50 text-zinc-800"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
              )}
            >
              Date run
              <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0 rounded-xl shadow-xl border-zinc-200">
            <DateRunCalendar
              selected={dateRun}
              onSelect={(date) => {
                setDateRun(date);
                if (date) setDateOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>

        <Popover open={statusOpen} onOpenChange={setStatusOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 h-8 rounded-md border px-3 text-xs font-medium cursor-pointer",
                statuses.length > 0
                  ? "border-zinc-300 bg-zinc-50 text-zinc-800"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
              )}
            >
              {statusLabel}
              <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[240px] p-1.5 rounded-xl shadow-xl border-zinc-200">
            <div className="space-y-0.5">
              {STATUS_OPTIONS.map((opt) => {
                const checked = statuses.includes(opt.id);
                return (
                  <div
                    key={opt.id}
                    role="button"
                    tabIndex={0}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-sm text-zinc-800 hover:bg-zinc-50 cursor-pointer"
                    onClick={() => toggleStatus(opt.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleStatus(opt.id);
                      }
                    }}
                  >
                    <Circle className={cn("h-3.5 w-3.5 shrink-0", opt.color)} />
                    <span className="flex-1 text-left">{opt.label}</span>
                    <span
                      aria-hidden
                      className={cn(
                        "h-4 w-4 shrink-0 rounded-[4px] border border-zinc-300 flex items-center justify-center",
                        checked && "bg-zinc-900 border-zinc-900 text-white",
                      )}
                    >
                      {checked && <Check className="h-3 w-3" />}
                    </span>
                  </div>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-6">
        {logs.isLoading ? (
          <p className="py-16 text-center text-sm text-zinc-400">Loading activity…</p>
        ) : items.length === 0 ? (
          <ActivityEmptyState onClear={hasFilters ? clearFilters : () => onLocationChange(null)} />
        ) : (
          <div className="divide-y border rounded-lg">
            {items.map((log: any) => {
              const status = displayStatus(log);
              const meta = STATUS_OPTIONS.find((s) => s.id === status);
              return (
                <div key={log.id} className="flex items-center gap-3 px-3 py-2.5">
                  <StatusDot status={status} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-800 truncate">{log.automation?.name || "Automation"}</p>
                    <p className="text-xs text-zinc-500 truncate">{meta?.label}{log.error ? ` · ${log.error}` : ""}</p>
                  </div>
                  {status === "SUCCESS" && <Check className="h-4 w-4 text-emerald-500 shrink-0" />}
                  <span className="text-xs text-zinc-400 shrink-0">
                    {new Date(log.executedAt).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
