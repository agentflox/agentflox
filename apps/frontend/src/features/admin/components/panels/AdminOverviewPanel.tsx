"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Activity, DollarSign, TrendingDown, Users } from "lucide-react";

function formatMoney(v: number) {
  const nf = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  return nf.format(v);
}

function formatPct(v: number) {
  return `${Math.max(0, v).toFixed(1)}%`;
}

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  isLoading,
}: {
  title: string;
  value: string;
  hint?: string;
  icon: any;
  tone?: "neutral" | "good" | "warn";
  isLoading?: boolean;
}) {
  const toneClasses =
    tone === "good"
      ? "bg-gradient-to-br from-emerald-50/90 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20 border-emerald-200/80 dark:border-emerald-800/50 shadow-emerald-500/5"
      : tone === "warn"
        ? "bg-gradient-to-br from-amber-50/90 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/20 border-amber-200/80 dark:border-amber-800/50 shadow-amber-500/5"
        : "bg-gradient-to-br from-white/90 to-zinc-50/50 dark:from-zinc-950/60 dark:to-zinc-900/30 border-zinc-200/80 dark:border-zinc-800/60 shadow-zinc-500/5";

  return (
    <Card className={cn("relative overflow-hidden p-4 sm:p-5 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5 dark:hover:shadow-indigo-500/10 hover:-translate-y-1 group backdrop-blur-xl", toneClasses)}>
      {/* Decorative gradient orb */}
      <div className={cn("absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500", tone === "good" ? "bg-emerald-500" : tone === "warn" ? "bg-amber-500" : "bg-indigo-500")} />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="space-y-2 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">{title}</p>
          {isLoading ? (
            <Skeleton className="h-8 w-40" />
          ) : (
            <div className="text-2xl sm:text-3xl font-semibold tracking-tight truncate">{value}</div>
          )}
          {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
        </div>
        <div className={cn("h-11 w-11 rounded-xl border flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 shadow-sm", tone === "good" ? "border-emerald-200/70 bg-emerald-100/50 dark:border-emerald-800 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300" : tone === "warn" ? "border-amber-200/70 bg-amber-100/50 dark:border-amber-800 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300" : "border-zinc-200/70 bg-zinc-50 dark:border-zinc-800/60 dark:bg-zinc-900/50 text-zinc-700 dark:text-zinc-200")}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

export default function AdminOverviewPanel({ data, isLoading }: { data: any; isLoading?: boolean }) {
  const system = data?.system?.status ?? "UNKNOWN";
  const degraded = system === "DEGRADED";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="MRR"
          value={isLoading ? "" : formatMoney(Number(data?.revenue?.mrr ?? 0))}
          hint={isLoading ? undefined : `ARR: ${formatMoney(Number(data?.revenue?.arr ?? 0))}`}
          icon={DollarSign}
          tone="neutral"
          isLoading={isLoading}
        />
        <StatCard
          title="Active users"
          value={isLoading ? "" : `${Number(data?.users?.activeWindow ?? 0).toLocaleString()}`}
          hint={isLoading ? undefined : `${Number(data?.users?.active ?? 0).toLocaleString()} active accounts`}
          icon={Users}
          tone="neutral"
          isLoading={isLoading}
        />
        <StatCard
          title="Churn rate (30d)"
          value={isLoading ? "" : formatPct(Number(data?.revenue?.churnRate ?? 0))}
          hint={isLoading ? undefined : `${Number(data?.revenue?.churnedWindow ?? 0)} churned • ${Number(data?.revenue?.activeSubscriptions ?? 0)} active`}
          icon={TrendingDown}
          tone={Number(data?.revenue?.churnRate ?? 0) >= 5 ? "warn" : "neutral"}
          isLoading={isLoading}
        />
        <StatCard
          title="System status"
          value={isLoading ? "" : degraded ? "Degraded" : "Healthy"}
          hint={
            isLoading
              ? undefined
              : `${Number(data?.system?.failedPayments7d ?? 0)} failed payments (7d) • ${Number(data?.system?.errors24h ?? 0)} errors (24h)`
          }
          icon={Activity}
          tone={degraded ? "warn" : "good"}
          isLoading={isLoading}
        />
      </div>

      <Card className="relative overflow-hidden p-4 sm:p-6 border border-white/20 dark:border-white/10 shadow-lg shadow-zinc-200/30 dark:shadow-black/30 bg-white/70 dark:bg-zinc-950/50 backdrop-blur-xl">
        {/* Subtle gradient accent line top */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500/40 via-purple-500/40 to-pink-500/40" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Signups</h3>
            <p className="text-sm text-muted-foreground">New account creation volume by time window.</p>
          </div>
          <Badge
            className={cn(
              "px-3 py-1.5 rounded-full border text-xs font-semibold tracking-wide shadow-sm",
              degraded
                ? "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900/60 animate-pulse"
                : "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60"
            )}
          >
            {isLoading ? "Loading…" : degraded ? "Attention needed" : "All systems normal"}
          </Badge>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Today", value: data?.users?.signups?.today ?? 0 },
            { label: "Last 7 days", value: data?.users?.signups?.week ?? 0 },
            { label: "Last 30 days", value: data?.users?.signups?.month ?? 0 },
          ].map((x) => (
            <div key={x.label} className="group rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/50 dark:bg-zinc-900/40 p-5 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{x.label}</div>
              <div className="mt-2 text-3xl font-semibold tracking-tight">
                {isLoading ? <Skeleton className="h-8 w-24" /> : Number(x.value).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

