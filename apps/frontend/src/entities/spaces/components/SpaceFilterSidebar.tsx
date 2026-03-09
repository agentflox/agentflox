"use client";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { type SpaceScope, type FilterState } from "../hooks/useSpaceList";



type Props = {
	scope: SpaceScope;
	onScopeChange: (scope: SpaceScope) => void;
	values: FilterState;
	onChange: (next: FilterState) => void;
	isOverlay?: boolean;
};

export function SpaceFilterSidebar({ scope, onScopeChange, values, onChange, isOverlay = false }: Props) {
	const [collapsed, setCollapsed] = useState(false);

	const { data: workspaceOptions } = trpc.workspace.list.useQuery(
		{ scope: "all", pageSize: 50, includeCounts: false },
		{ staleTime: 60_000 }
	);

	if (typeof document !== "undefined" && !isOverlay) {
		const width = collapsed ? "3.25rem" : "18rem";
		document.documentElement.style.setProperty("--filter-sidebar-width", width);
	}

	const baseClasses = isOverlay
		? `${collapsed ? "w-14" : "w-72"} bg-background h-full transition-all duration-300`
		: `${collapsed ? "w-14 lg:w-[var(--filter-sidebar-width,_18rem)]" : "w-[var(--filter-sidebar-width,_18rem)]"} border-l bg-background/80 transition-all duration-300`;

	const workspaceChoices = useMemo(() => {
		if (!workspaceOptions?.items) return [];
		return workspaceOptions.items.map((item) => ({ id: item.id, name: item.name }));
	}, [workspaceOptions?.items]);

	return (
		<aside className={baseClasses}>
			<div
				className={cn(
					"flex h-full flex-col",
					isOverlay ? "overflow-y-auto" : "sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto",
				)}
			>
				<div className="flex items-center justify-between border-b px-3 py-2">
					{!collapsed && <h3 className="text-xs font-semibold uppercase text-muted-foreground">Space filters</h3>}
					<button
						className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
						onClick={() => setCollapsed((prev) => !prev)}
						aria-label="Toggle space filters"
					>
						{collapsed ? "›" : "‹"}
					</button>
				</div>

				{collapsed ? (
					<div className="flex flex-1 flex-col items-center justify-start gap-4 py-4 text-muted-foreground">
						<span title="Scope">🧭</span>
						<span title="Status">📁</span>
						<span title="Workspace">🏢</span>
					</div>
				) : (
					<div className="space-y-6 px-3 py-4 text-sm">
						<section className="space-y-2">
							<h4 className="text-xs font-semibold uppercase text-muted-foreground">Scope</h4>
							<select
								value={scope}
								onChange={(event) => onScopeChange(event.target.value as SpaceScope)}
								className="w-full rounded-md border bg-background px-2 py-1 text-sm"
							>
								<option value="owned">My spaces</option>
								<option value="member">I'm a member</option>
								<option value="all">All accessible</option>
							</select>
						</section>

						<section className="space-y-2">
							<h4 className="text-xs font-semibold uppercase text-muted-foreground">Status</h4>
							<div className="flex flex-wrap gap-2">
								{[
									["", "All"],
									["active", "Active"],
									["archived", "Archived"],
								].map(([value, label]) => (
									<button
										type="button"
										key={label}
										onClick={() => onChange({ ...values, status: value as FilterState["status"] })}
										className={cn(
											"rounded-md border px-2 py-1 text-xs transition-colors",
											(values.status || "") === value
												? "border-primary bg-primary/10 text-primary"
												: "hover:bg-muted",
										)}
									>
										{label}
									</button>
								))}
							</div>
						</section>

						<section className="space-y-2">
							<h4 className="text-xs font-semibold uppercase text-muted-foreground">Workspace</h4>
							<select
								className="w-full rounded-md border bg-background px-2 py-1 text-sm"
								value={values.workspaceId ?? ""}
								onChange={(event) => onChange({ ...values, workspaceId: event.target.value || undefined })}
							>
								<option value="">All workspaces</option>
								{workspaceChoices.map((workspace) => (
									<option key={workspace.id} value={workspace.id}>
										{workspace.name}
									</option>
								))}
							</select>
						</section>
					</div>
				)}
			</div>
		</aside>
	);
}


