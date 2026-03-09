"use client";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type TaskScope = "owned" | "assigned" | "all";

const TASK_STATUSES = ["OPEN", "IN_PROGRESS", "COMPLETED", "BLOCKED"] as const;
const TASK_VISIBILITY = ["PRIVATE", "TEAM", "WORKSPACE", "PUBLIC"] as const;

type TaskFilters = {
	statuses: string[];
	visibility?: string;
};

type Props = {
	scope: TaskScope;
	onScopeChange: (scope: TaskScope) => void;
	values: TaskFilters;
	onChange: (next: TaskFilters) => void;
	isOverlay?: boolean;
};

export function TaskFilterSidebar({ scope, onScopeChange, values, onChange, isOverlay = false }: Props) {
	const [collapsed, setCollapsed] = useState(false);
	const Wrapper: React.ElementType = "aside";

	if (typeof document !== "undefined" && !isOverlay) {
		const width = collapsed ? "3.25rem" : "18rem";
		document.documentElement.style.setProperty("--filter-sidebar-width", width);
	}

	const baseClasses = isOverlay
		? `${collapsed ? "w-14" : "w-72"} bg-background h-full transition-all duration-300`
		: `${collapsed ? "w-14 lg:w-[var(--filter-sidebar-width,_18rem)]" : "w-[var(--filter-sidebar-width,_18rem)]"} border-l bg-background/70 transition-all duration-300`;

	const currentStatuses = useMemo(() => new Set(values.statuses ?? []), [values.statuses]);

	const toggleStatus = (status: string) => {
		const next = new Set(currentStatuses);
		if (next.has(status)) {
			next.delete(status);
		} else {
			next.add(status);
		}
		onChange({ ...values, statuses: Array.from(next) });
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
					{!collapsed && <h3 className="text-xs font-semibold uppercase text-muted-foreground">Task filters</h3>}
					<button
						className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
						onClick={() => setCollapsed((prev) => !prev)}
						aria-label="Toggle task filters"
					>
						{collapsed ? "›" : "‹"}
					</button>
				</div>

				{collapsed ? (
					<div className="flex flex-1 flex-col items-center justify-start gap-4 py-4 text-muted-foreground">
						<span title="Scope">🧭</span>
						<span title="Status">📌</span>
						<span title="Visibility">👀</span>
					</div>
				) : (
					<div className="space-y-6 px-3 py-4 text-sm">
						<section className="space-y-2">
							<h4 className="text-xs font-semibold uppercase text-muted-foreground">Scope</h4>
							<select
								value={scope}
								onChange={(event) => onScopeChange(event.target.value as TaskScope)}
								className="w-full rounded-md border bg-background px-2 py-1 text-sm"
							>
								<option value="owned">Created by me</option>
								<option value="assigned">Assigned to me</option>
								<option value="all">Everything</option>
							</select>
						</section>

						<section className="space-y-2">
							<h4 className="text-xs font-semibold uppercase text-muted-foreground">Status</h4>
							<div className="flex flex-wrap gap-2">
								{TASK_STATUSES.map((status) => {
									const active = currentStatuses.has(status);
									return (
										<button
											type="button"
											key={status}
											onClick={() => toggleStatus(status)}
											className={cn(
												"rounded-md border px-2 py-1 text-xs transition-colors",
												active ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
											)}
										>
											{status}
										</button>
									);
								})}
							</div>
						</section>

						<section className="space-y-2">
							<h4 className="text-xs font-semibold uppercase text-muted-foreground">Visibility</h4>
							<div className="grid grid-cols-2 gap-2">
								<button
									type="button"
									onClick={() => onChange({ ...values, visibility: undefined })}
									className={cn(
										"rounded-md border px-2 py-1 text-xs transition-colors",
										!values.visibility ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
									)}
								>
									Any
								</button>
								{TASK_VISIBILITY.map((vis) => (
									<button
										type="button"
										key={vis}
										onClick={() => onChange({ ...values, visibility: vis })}
										className={cn(
											"rounded-md border px-2 py-1 text-xs uppercase tracking-wide transition-colors",
											values.visibility === vis ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
										)}
									>
										{vis}
									</button>
								))}
							</div>
						</section>
					</div>
				)}
			</div>
		</Wrapper>
	);
}



