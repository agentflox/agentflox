"use client";
import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { keepPreviousData } from "@tanstack/react-query";

export type TaskScope = "owned" | "assigned" | "all";

type FilterState = {
	statuses: string[];
	visibility?: string;
};

export function useTaskList(initialScope: TaskScope = "owned") {
	const [page, setPage] = useState(1);
	const pageSize = 12;
	const [query, setQuery] = useState("");
	const [scope, setScope] = useState<TaskScope>(initialScope);
	const [filters, setFilters] = useState<FilterState>({ statuses: [] });

	const listInput = useMemo(
		() => ({
			page,
			pageSize,
			scope,
			query: query.trim() || undefined,
			status: filters.statuses.length ? filters.statuses.join(",") : undefined,
			visibility: filters.visibility,
			includeRelations: true,
		}),
		[page, pageSize, scope, query, filters],
	);

	const parsedStatuses = filters.statuses.length ? filters.statuses : undefined;

	const queryResult = trpc.task.list.useQuery(
		{
			page: listInput.page,
			pageSize: listInput.pageSize,
			scope: listInput.scope,
			query: listInput.query,
			visibility: listInput.visibility,
			status: parsedStatuses,
			includeRelations: true,
		} as any,
		{
			staleTime: 30_000,
			placeholderData: keepPreviousData
		},
	);

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
			includeRelations: true,
		} as any);
	}, [utils, pageSize, scope, query, filters.visibility, parsedStatuses]);

	useEffect(() => {
		if ((queryResult.data?.items?.length || 0) === pageSize) {
			utils.task.list.prefetch({
				page: page + 1,
				pageSize,
				scope,
				query: query.trim() || undefined,
				visibility: filters.visibility,
				status: parsedStatuses,
				includeRelations: true,
			} as any);
		}
	}, [utils, queryResult.data?.items?.length, page, pageSize, scope, query, filters.visibility, parsedStatuses]);

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



