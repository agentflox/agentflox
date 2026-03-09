"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { INDUSTRY_OPTIONS } from "@/constants/shares";

type Props = {
  scope: "all" | "owned" | "participated";
  onScopeChange: (s: Props["scope"]) => void;
  values: { industries: string[]; status?: "DRAFT"|"PUBLISHED"|"ARCHIVED"|"" };
  onChange: (next: Props["values"]) => void;
  isOverlay?: boolean;
};

export default function ProjectFilterSidebar({ scope, onScopeChange, values, onChange, isOverlay = false }: Props) {
  const [local, setLocal] = useState(values);
  const [collapsed, setCollapsed] = useState(false);

  const Wrapper: React.ElementType = "aside";
  if (typeof document !== 'undefined' && !isOverlay) {
    const width = collapsed ? '3rem' : '18rem';
    document.documentElement.style.setProperty('--filter-sidebar-width', width);
  }
  const baseClasses = isOverlay
    ? `${collapsed ? 'w-12' : 'w-72'} bg-background h-full transition-all duration-300`
    : `${collapsed ? 'w-12 lg:w-[var(--filter-sidebar-width,_18rem)]' : 'w-[var(--filter-sidebar-width,_18rem)]'} border-l bg-background/50 transition-all duration-300`;

  const toggleArray = (key: keyof Props["values"], val: string) => {
    const arr = new Set((local[key] as string[]) || []);
    if (arr.has(val)) arr.delete(val); else arr.add(val);
    const next = { ...local, [key]: Array.from(arr) } as Props["values"];
    setLocal(next); onChange(next);
  };

  return (
    <Wrapper className={baseClasses}>
      <div className={cn(isOverlay ? "h-full overflow-y-auto" : "sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto")} style={{ padding: collapsed ? '0.5rem' : '1rem' }}>
        <div className="mb-3 flex items-center justify-between">
          {!collapsed && <h3 className="text-xs font-semibold uppercase text-muted-foreground">Filters</h3>}
          <button className="rounded p-1 hover:bg-muted" onClick={() => setCollapsed((c) => !c)} aria-label="Toggle filters">
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        {!collapsed && <div className="space-y-6">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Scope</h3>
            <select className="w-full rounded-md border px-2 py-1 text-sm" value={scope} onChange={(e) => onScopeChange(e.target.value as any)}>
              <option value="all">All</option>
              <option value="owned">Owned</option>
              <option value="participated">Participated</option>
            </select>
          </section>

          {scope === "owned" && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Status</h3>
              <div className="flex flex-wrap gap-2 text-sm">
                {(["", "DRAFT", "PUBLISHED", "ARCHIVED"] as const).map((s) => (
                  <label key={s || "all"} className="inline-flex items-center gap-2">
                    <input type="radio" name="prj-status" checked={(values.status || "") === s} onChange={() => { const next = { ...local, status: s as any }; setLocal(next); onChange(next); }} />
                    <span>{s || "All"}</span>
                  </label>
                ))}
              </div>
            </section>
          )}

          {scope === "participated" && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Participation</h3>
              <div className="text-sm text-muted-foreground">Filter roles coming soon</div>
            </section>
          )}

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Industry</h3>
            <div className="space-y-1">
              {INDUSTRY_OPTIONS.slice(0, 10).map((opt: any) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={local.industries.includes(opt.value)} onChange={() => toggleArray("industries", opt.value)} />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </section>
        </div>}

        {collapsed && (
          <div className="flex flex-col items-center gap-3 py-2 text-muted-foreground">
            <span title="Scope">🧭</span>
            <span title="Status">✅</span>
            <span title="Industry">🏭</span>
          </div>
        )}
      </div>
    </Wrapper>
  );
}


