"use client";
import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Shell from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { PageHeader } from "@/entities/shared/components/PageHeader";
import { SearchSection } from "@/entities/shared/components/SearchSection";
import { TaskCard, TaskFilterSidebar, useTaskList } from "@/entities/task";
import { useToast } from "@/hooks/useToast";
import { trpc } from "@/lib/trpc";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Filter, Eye } from "lucide-react";

export default function TasksPage() {
	const router = useRouter();
	const { toast } = useToast();
	const {
		data,
		isLoading,
		isFetching,
		page,
		pageSize,
		setPage,
		query,
		setQuery,
		scope,
		setScope,
		filters,
		setFilters,
	} = useTaskList();

	const createTask = trpc.task.create.useMutation();
	const convertTask = trpc.task.createProposalFromTask.useMutation();
	const hasNextPage = (data?.items?.length || 0) === pageSize;
	const hasPreviousPage = page > 1;

	const filterChips = useMemo(() => {
		const chips: Array<{ id: string; label: string; onRemove: () => void }> = [];
		if (query) {
			chips.push({ id: "query", label: `Search: ${query}`, onRemove: () => setQuery("") });
		}
		if (filters.statuses.length) {
			chips.push({
				id: "status",
				label: `Status: ${filters.statuses.join(", ")}`,
				onRemove: () => setFilters((prev) => ({ ...prev, statuses: [] })),
			});
		}
		if (filters.visibility) {
			chips.push({
				id: "visibility",
				label: `Visibility: ${filters.visibility}`,
				onRemove: () => setFilters((prev) => ({ ...prev, visibility: undefined })),
			});
		}
		return chips;
	}, [query, filters, setQuery, setFilters]);

	const clearFilters = () => {
		setQuery("");
		setFilters({ statuses: [], visibility: undefined });
	};

	const handleCreateTask = async () => {
		try {
			const task = await createTask.mutateAsync({
				title: "New task",
				description: "",
				visibility: "PRIVATE",
				isPublic: false,
			} as any);
			toast({ title: "Draft task created", description: "You can now update task details." });
			router.push(`/dashboard/tasks/${task.id}`);
		} catch (error) {
			console.error(error);
			toast({
				title: "Unable to create task",
				description: "Something went wrong while creating the task.",
				variant: "destructive",
			});
		}
	};

	const handleConvertToProposal = async (taskId: string) => {
		try {
			const proposal = await convertTask.mutateAsync({ taskId, category: "PARTNER" } as any);
			toast({ title: "Proposal created", description: "Redirecting to proposal details…" });
			router.push(`/dashboard/proposals/${proposal?.id}`);
			toast({ title: "Proposal created", description: "Redirecting to proposal details…" });
		} catch (error) {
			console.error(error);
			toast({
				title: "Unable to convert task",
				description: "Conversion failed. Please try again.",
				variant: "destructive",
			});
		}
	};

	return (
		<Shell>
			<div className="space-y-6">
				<div className="space-y-6">
					<PageHeader
						title="Tasks"
						description="Capture work items and collaboration opportunities across your workspace."
						actions={
							<Button
								onClick={handleCreateTask}
								className="group relative overflow-hidden bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 px-5 py-2.5 text-white transition-all duration-300 hover:shadow-md"
							>
								<span className="relative z-10 flex items-center gap-2">
									<Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
									New task
								</span>
								<span className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-teal-500 to-sky-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
							</Button>
						}
					/>

					<SearchSection
						searchValue={query}
						searchPlaceholder="Search tasks by title or description..."
						resultsCount={data?.total ?? 0}
						onSearchChange={setQuery}
						onSearchSubmit={() => setPage(1)}
						onCreateNew={handleCreateTask}
						createButtonText="New task"
						showFilters={false}
						showSort={false}
					>
						<Select value={scope} onValueChange={(v) => setScope(v as any)}>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder="Scope" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Tasks</SelectItem>
								<SelectItem value="owned">Owned by me</SelectItem>
								<SelectItem value="member">Shared with me</SelectItem>
							</SelectContent>
						</Select>

						<Select value={filters.statuses[0] || "all"} onValueChange={(v) => setFilters((prev) => ({ ...prev, statuses: v === "all" ? [] : [v as any] }))}>
							<SelectTrigger className="w-[180px]">
								<Filter className="h-4 w-4 mr-2" />
								<SelectValue placeholder="Status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Status</SelectItem>
								<SelectItem value="OPEN">Open</SelectItem>
								<SelectItem value="IN_PROGRESS">In Progress</SelectItem>
								<SelectItem value="COMPLETED">Completed</SelectItem>
								<SelectItem value="ARCHIVED">Archived</SelectItem>
							</SelectContent>
						</Select>

						<Select value={filters.visibility || "all"} onValueChange={(v) => setFilters((prev) => ({ ...prev, visibility: v === "all" ? undefined : v as any }))}>
							<SelectTrigger className="w-[180px]">
								<Eye className="h-4 w-4 mr-2" />
								<SelectValue placeholder="Visibility" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Any Visibility</SelectItem>
								<SelectItem value="PUBLIC">Public</SelectItem>
								<SelectItem value="PRIVATE">Private</SelectItem>
								<SelectItem value="INTERNAL">Internal</SelectItem>
							</SelectContent>
						</Select>
					</SearchSection>

					{filterChips.length > 0 && (
						<div className="flex flex-wrap items-center gap-2">
							{filterChips.map((chip) => (
								<button
									key={chip.id}
									onClick={chip.onRemove}
									className="group inline-flex items-center gap-2 rounded-lg border-2 border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 transition-all hover:border-emerald-300 hover:bg-emerald-100 hover:shadow"
								>
									<span>{chip.label}</span>
									<X className="h-3.5 w-3.5 transition-transform group-hover:rotate-90" />
								</button>
							))}
							<Button variant="ghost" onClick={clearFilters}>
								Clear all
							</Button>
						</div>
					)}

					{isLoading ? (
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
							{Array.from({ length: 6 }).map((_, index) => (
								<div key={index} className="min-h-[220px] animate-pulse rounded-lg border bg-muted/30" />
							))}
						</div>
					) : data?.items && data.items.length > 0 ? (
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
							{data.items.map((item) => (
								<TaskCard
									key={item.id}
									item={item}
									onOpen={(id) => router.push(`/dashboard/tasks/${id}`)}
									onConvert={handleConvertToProposal}
								/>
							))}
						</div>
					) : (
						<div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted bg-muted/10 p-8 text-center">
							<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-100">
								<Plus className="h-8 w-8 text-emerald-600" />
							</div>
							<h3 className="mt-4 text-lg font-semibold text-foreground">No tasks yet</h3>
							<p className="mt-2 text-sm text-muted-foreground">
								{query ? "Try a different search or reset your filters." : "Create a task to track upcoming work."}
							</p>
							<Button onClick={handleCreateTask} variant="outline" className="mt-4">
								<Plus className="mr-2 h-4 w-4" />
								Add task
							</Button>
						</div>
					)}

					{data?.items && data.items.length > 0 && (
						<Pagination
							currentPage={page}
							hasNextPage={hasNextPage}
							hasPreviousPage={hasPreviousPage}
							onPageChange={setPage}
							isLoading={isFetching}
						/>
					)}
				</div>
			</div>
		</Shell>
	);
}


