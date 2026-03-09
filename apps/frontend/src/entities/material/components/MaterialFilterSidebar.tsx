"use client";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type MaterialScope = "owned" | "all";

type MaterialFilters = {
	category?: string;
	isPublic?: boolean;
	priceRange?: [number | undefined, number | undefined];
};

type Props = {
	scope: MaterialScope;
	onScopeChange: (scope: MaterialScope) => void;
	values: MaterialFilters;
	onChange: (next: MaterialFilters) => void;
	categories?: string[];
	isOverlay?: boolean;
};

export function MaterialFilterSidebar({ scope, onScopeChange, values, onChange, categories = [], isOverlay = false }: Props) {
	const [collapsed, setCollapsed] = useState(false);
	const Wrapper: React.ElementType = "aside";

	if (typeof document !== "undefined" && !isOverlay) {
		const width = collapsed ? "3.5rem" : "18rem";
		document.documentElement.style.setProperty("--filter-sidebar-width", width);
	}

	const baseClasses = isOverlay
		? `${collapsed ? "w-16" : "w-72"} bg-background h-full transition-all duration-300`
		: `${collapsed ? "w-16 lg:w-[var(--filter-sidebar-width,_18rem)]" : "w-[var(--filter-sidebar-width,_18rem)]"} border-l bg-background/80 transition-all duration-300`;

	const uniqueCategories = useMemo(() => Array.from(new Set(categories.filter(Boolean))), [categories]);

	const setPrice = (index: 0 | 1, value?: number) => {
		const next: MaterialFilters["priceRange"] = [...(values.priceRange || [undefined, undefined])] as [
			number | undefined,
			number | undefined,
		];
		next[index] = value;
		onChange({ ...values, priceRange: next });
	};

	return (
		<Wrapper className={baseClasses}>
			<div
				className={cn(
					"flex h-full flex-col",
					isOverlay ? "overflow-y-auto" : "sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto",
				)}
			>
				<div className="flex items-center justify-between border-b px-3 py-2">
					{!collapsed && <h3 className="text-xs font-semibold uppercase text-muted-foreground">Material filters</h3>}
					<button
						className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
						onClick={() => setCollapsed((prev) => !prev)}
						aria-label="Toggle material filters"
					>
						{collapsed ? "›" : "‹"}
					</button>
				</div>

				{collapsed ? (
					<div className="flex flex-1 flex-col items-center justify-start gap-4 py-4 text-muted-foreground">
						<span title="Scope">🧭</span>
						<span title="Visibility">👁</span>
						<span title="Price">💵</span>
					</div>
				) : (
					<div className="space-y-6 px-3 py-4 text-sm">
						<section className="space-y-2">
							<h4 className="text-xs font-semibold uppercase text-muted-foreground">Scope</h4>
							<select
								value={scope}
								onChange={(event) => onScopeChange(event.target.value as MaterialScope)}
								className="w-full rounded-md border bg-background px-2 py-1 text-sm"
							>
								<option value="owned">My materials</option>
								<option value="all">Marketplace</option>
							</select>
						</section>

						<section className="space-y-2">
							<h4 className="text-xs font-semibold uppercase text-muted-foreground">Visibility</h4>
							<div className="grid grid-cols-3 gap-2">
								<button
									type="button"
									onClick={() => onChange({ ...values, isPublic: undefined })}
									className={cn(
										"rounded-md border px-2 py-1 text-xs transition-colors",
										typeof values.isPublic === "undefined"
											? "border-primary bg-primary/10 text-primary"
											: "hover:bg-muted",
									)}
								>
									All
								</button>
								<button
									type="button"
									onClick={() => onChange({ ...values, isPublic: true })}
									className={cn(
										"rounded-md border px-2 py-1 text-xs transition-colors",
										values.isPublic === true ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
									)}
								>
									Public
								</button>
								<button
									type="button"
									onClick={() => onChange({ ...values, isPublic: false })}
									className={cn(
										"rounded-md border px-2 py-1 text-xs transition-colors",
										values.isPublic === false ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
									)}
								>
									Private
								</button>
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
							<h4 className="text-xs font-semibold uppercase text-muted-foreground">Price (USD)</h4>
							<div className="grid grid-cols-2 gap-2">
								<input
									type="number"
									inputMode="decimal"
									min={0}
									className="w-full rounded-md border bg-background px-2 py-1 text-sm"
									placeholder="Min"
									value={values.priceRange?.[0] ?? ""}
									onChange={(event) => setPrice(0, event.target.value ? Number(event.target.value) : undefined)}
								/>
								<input
									type="number"
									inputMode="decimal"
									min={0}
									className="w-full rounded-md border bg-background px-2 py-1 text-sm"
									placeholder="Max"
									value={values.priceRange?.[1] ?? ""}
									onChange={(event) => setPrice(1, event.target.value ? Number(event.target.value) : undefined)}
								/>
							</div>
						</section>
					</div>
				)}
			</div>
		</Wrapper>
	);
}



