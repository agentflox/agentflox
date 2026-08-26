"use client";
import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { keepPreviousData } from "@tanstack/react-query";

export type TaskScope = "owned" | "assigned" | "all";
export type TaskListRelationMode = boolean | "card";

type FilterState = {
	statuses: string[];
	visibility?: string;
};

export interface UseTaskListOptions {
	initialScope?: TaskScope;
	initialPage?: number;
	pageSize?: number;
	includeRelations?: TaskListRelationMode;
	syncWithUrl?: boolean;
	initialFilters?: FilterState;
}

export function useTaskList(
	initialScopeOrOptions: TaskScope | UseTaskListOptions = "owned",
	legacyOptions: { includeRelations?: TaskListRelationMode } = {}
) {
	const options: UseTaskListOptions =
		typeof initialScopeOrOptions === "string"
			? { initialScope: initialScopeOrOptions, ...legacyOptions }
			: initialScopeOrOptions;

	const {
		initialScope = "owned",
		initialPage = 1,
		pageSize: initialPageSize = 12,
		includeRelations = true,
		syncWithUrl = true,
		initialFilters = { statuses: [] },
	} = options;

	const [page, setPage] = useState(initialPage);
	const [pageSize, setPageSize] = useState(initialPageSize);
	const [query, setQuery] = useState("");
	const [scope, setScope] = useState<TaskScope>(initialScope);
	const [filters, setFilters] = useState<FilterState>(initialFilters);

	useEffect(() => {
		if (options.pageSize && options.pageSize !== pageSize) {
			setPageSize(options.pageSize);
		}
	}, [options.pageSize]);

	const parsedStatuses = filters.statuses.length ? filters.statuses : undefined;

	const listInput = useMemo(
		() => ({
			page,
			pageSize,
			scope,
			query: query.trim() || undefined,
			status: parsedStatuses,
			visibility: filters.visibility,
			includeRelations,
		}),
		[page, pageSize, scope, query, filters.visibility, parsedStatuses, includeRelations],
	);

	const queryResult = trpc.task.list.useQuery(listInput as any, {
		staleTime: 30_000,
		placeholderData: keepPreviousData,
	});

	const utils = trpc.useUtils();

	useEffect(() => {
		if (!syncWithUrl) return;
		const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
		if (query) params.set("q", query); else params.delete("q");
		if (scope && scope !== "owned") params.set("scope", scope); else params.delete("scope");
		if (filters.visibility) params.set("visibility", filters.visibility); else params.delete("visibility");
		if (filters.statuses.length) params.set("status", filters.statuses.join(",")); else params.delete("status");
		if (page > 1) params.set("page", String(page)); else params.delete("page");
		if (pageSize !== 12) params.set("pageSize", String(pageSize)); else params.delete("pageSize");
		if (typeof window !== "undefined") {
			const url = `${window.location.pathname}?${params.toString()}`;
			window.history.replaceState(null, "", url);
		}
	}, [query, scope, filters.visibility, filters.statuses, page, pageSize, syncWithUrl]);

	useEffect(() => {
		utils.task.list.prefetch({
			page: 1,
			pageSize,
			scope,
			query: query.trim() || undefined,
			visibility: filters.visibility,
			status: parsedStatuses,
			includeRelations,
		} as any);
	}, [utils, pageSize, scope, query, filters.visibility, parsedStatuses, includeRelations]);

	useEffect(() => {
		if ((queryResult.data?.items?.length || 0) === pageSize) {
			utils.task.list.prefetch({
				page: page + 1,
				pageSize,
				scope,
				query: query.trim() || undefined,
				visibility: filters.visibility,
				status: parsedStatuses,
				includeRelations,
			} as any);
		}
	}, [utils, queryResult.data?.items?.length, page, pageSize, scope, query, filters.visibility, parsedStatuses, includeRelations]);

	const total = queryResult.data?.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / pageSize));

	return {
		...queryResult,
		page,
		pageSize,
		setPage,
		setPageSize,
		totalPages,
		total,
		scope,
		setScope,
		query,
		setQuery,
		filters,
		setFilters,
	};
}
