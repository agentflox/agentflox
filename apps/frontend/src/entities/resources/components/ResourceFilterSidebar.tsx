"use client";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type ResourceScope = "owned" | "public" | "all";

const PUBLIC_FILTERS = [
  { label: "All", value: undefined },
  { label: "Public", value: true },
  { label: "Private", value: false },
] as const;

type ResourceFilters = {
  category?: string;
  isPublic?: boolean;
  priceRange?: [number | undefined, number | undefined];
};

type Props = {
  scope: ResourceScope;
  onScopeChange: (scope: ResourceScope) => void;
  values: ResourceFilters;
  onChange: (next: ResourceFilters) => void;
  categories?: string[];
  isOverlay?: boolean;
};

export function ResourceFilterSidebar({ scope, onScopeChange, values, onChange, categories = [], isOverlay = false }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const Wrapper: React.ElementType = "aside";

  if (typeof document !== "undefined" && !isOverlay) {
    const width = collapsed ? "3.25rem" : "18rem";
    document.documentElement.style.setProperty("--filter-sidebar-width", width);
  }

  const baseClasses = isOverlay
    ? `${collapsed ? "w-14" : "w-72"} bg-background h-full transition-all duration-300`
    : `${collapsed ? "w-14 lg:w-[var(--filter-sidebar-width,_18rem)]" : "w-[var(--filter-sidebar-width,_18rem)]"} border-l bg-background/80 transition-all duration-300`;

  const uniqueCategories = useMemo(() => {
    if (!categories.length) return [];
    return Array.from(new Set(categories.filter(Boolean)));
  }, [categories]);

  return (
    <Wrapper className={baseClasses}>
      <div
        className={cn(
          "flex h-full flex-col",
          isOverlay ? "overflow-y-auto" : "sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto",
        )}
      >
        <div className="flex items-center justify-between border-b px-3 py-2">
          {!collapsed && <h3 className="text-xs font-semibold uppercase text-muted-foreground">Resource filters</h3>}
          <button
            className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
            onClick={() => setCollapsed((prev) => !prev)}
            aria-label="Toggle resource filters"
          >
            {collapsed ? "›" : "‹"}
          </button>
        </div>

        {collapsed ? (
          <div className="flex flex-1 flex-col items-center justify-start gap-4 py-4 text-muted-foreground">
            <span title="Scope">🧭</span>
            <span title="Visibility">👁</span>
            <span title="Category">🧰</span>
            <span title="Price">💲</span>
          </div>
        ) : (
          <div className="space-y-6 px-3 py-4 text-sm">
            <section className="space-y-2">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">Scope</h4>
              <select
                value={scope}
                onChange={(event) => onScopeChange(event.target.value as ResourceScope)}
                className="w-full rounded-md border bg-background px-2 py-1 text-sm"
              >
                <option value="owned">My resources</option>
                <option value="public">Public resources</option>
                <option value="all">All workspace resources</option>
              </select>
            </section>

            <section className="space-y-2">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">Visibility</h4>
              <div className="grid grid-cols-3 gap-2">
                {PUBLIC_FILTERS.map(({ label, value }) => (
                  <button
                    type="button"
                    key={label}
                    onClick={() => onChange({ ...values, isPublic: value })}
                    className={cn(
                      "rounded-md border px-2 py-1 text-xs transition-colors",
                      values.isPublic === value ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">Category</h4>
              <select
                className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                value={values.category ?? ""}
                onChange={(event) => onChange({ ...values, category: event.target.value || undefined })}
              >
                <option value="">All categories</option>
                {uniqueCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </section>

            <section className="space-y-2">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">Price</h4>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={0}
                  placeholder="Min"
                  className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                  value={values.priceRange?.[0] ?? ""}
                  onChange={(e) => {
                    const nextMin = e.target.value ? Number(e.target.value) : undefined;
                    const nextMax = values.priceRange?.[1];
                    onChange({ ...values, priceRange: [nextMin, nextMax] });
                  }}
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Max"
                  className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                  value={values.priceRange?.[1] ?? ""}
                  onChange={(e) => {
                    const nextMax = e.target.value ? Number(e.target.value) : undefined;
                    const nextMin = values.priceRange?.[0];
                    onChange({ ...values, priceRange: [nextMin, nextMax] });
                  }}
                />
              </div>
            </section>
          </div>
        )}
      </div>
    </Wrapper>
  );
}

