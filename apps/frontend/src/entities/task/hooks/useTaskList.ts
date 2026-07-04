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
	includeRelations?: TaskListRelationMode;
}

export function useTaskList(initialScope: TaskScope = "owned", options: UseTaskListOptions = {}) {
	const { includeRelations = true } = options;
	const [page, setPage] = useState(1);
	const pageSize = 12;
	const [query, setQuery] = useState("");
	const [scope, setScope] = useState<TaskScope>(initialScope);
	const [filters, setFilters] = useState<FilterState>({ statuses: [] });

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
		setPage(1);
	}, [query, scope, filters.statuses, filters.visibility]);

	useEffect(() => {
		const params = new URLSearchParams();
		if (query) params.set("q", query);
		if (scope) params.set("scope", scope);
		if (filters.visibility) params.set("visibility", filters.visibility);
		if (filters.statuses.length) params.set("status", filters.statuses.join(","));
		params.set("page", String(page));
		if (typeof window !== "undefined") {
			const url = `${window.location.pathname}?${params.toString()}`;
			window.history.replaceState(null, "", url);
		}
	}, [query, scope, filters.visibility, filters.statuses, page]);

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

	return {
		...queryResult,
		page,
		pageSize,
		setPage,
		scope,
		setScope,
		query,
		setQuery,
		filters,
		setFilters,
	};
}
