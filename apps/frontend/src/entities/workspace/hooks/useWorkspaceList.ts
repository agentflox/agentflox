"use client";
import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { keepPreviousData } from "@tanstack/react-query";

export type WorkspaceScope = "owned" | "member" | "all";
export type WorkspaceStatusFilter = "active" | "archived" | "";

type FilterState = {
	status?: WorkspaceStatusFilter;
};

export interface UseWorkspaceListOptions {
	initialScope?: WorkspaceScope;
	initialPage?: number;
	pageSize?: number;
	includeCounts?: boolean;
	syncWithUrl?: boolean;
	initialFilters?: FilterState;
}

export function useWorkspaceList(
	initialScopeOrOptions: WorkspaceScope | UseWorkspaceListOptions = "owned",
	legacyOptions: { includeCounts?: boolean } = {}
) {
	const options: UseWorkspaceListOptions =
		typeof initialScopeOrOptions === "string"
			? { initialScope: initialScopeOrOptions, ...legacyOptions }
			: initialScopeOrOptions;

	const {
		initialScope = "owned",
		initialPage = 1,
		pageSize: initialPageSize = 12,
		includeCounts = true,
		syncWithUrl = true,
		initialFilters = { status: "active" },
	} = options;

	const [page, setPage] = useState(initialPage);
	const [pageSize, setPageSize] = useState(initialPageSize);
	const [query, setQuery] = useState("");
	const [scope, setScope] = useState<WorkspaceScope>(initialScope);
	const [filters, setFilters] = useState<FilterState>(initialFilters);

	useEffect(() => {
		if (options.pageSize && options.pageSize !== pageSize) {
			setPageSize(options.pageSize);
		}
	}, [options.pageSize]);

	const listInput = useMemo(() => {
		const trimmedQuery = query.trim();
		const normalizedStatus =
			filters.status === "active" || filters.status === "archived"
				? filters.status
				: undefined;

		return {
			page,
			pageSize,
			includeCounts,
			scope,
			query: trimmedQuery || undefined,
			status: normalizedStatus,
		};
	}, [page, pageSize, scope, query, filters.status, includeCounts]);

	const queryResult = trpc.workspace.list.useQuery(listInput, {
		staleTime: 30_000,
		placeholderData: keepPreviousData
	});
	const utils = trpc.useUtils();

	useEffect(() => {
		const prefetchInput = { ...listInput, page: 1 };
		utils.workspace.list.prefetch(prefetchInput);
	}, [utils, listInput.query, listInput.scope, listInput.status]);

	useEffect(() => {
		if ((queryResult.data?.items?.length || 0) === pageSize) {
			utils.workspace.list.prefetch({ ...listInput, page: page + 1 });
		}
	}, [utils, queryResult.data?.items?.length, pageSize, page, listInput]);

	useEffect(() => {
		if (!syncWithUrl) return;
		const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
		if (query) params.set("q", query); else params.delete("q");
		if (scope && scope !== "owned") params.set("scope", scope); else params.delete("scope");
		if (filters.status) params.set("status", filters.status); else params.delete("status");
		if (page > 1) params.set("page", String(page)); else params.delete("page");
		if (pageSize !== 12) params.set("pageSize", String(pageSize)); else params.delete("pageSize");
		if (typeof window !== "undefined") {
			const search = params.toString();
			const newUrl = search ? `${window.location.pathname}?${search}` : window.location.pathname;
			window.history.replaceState(null, "", newUrl);
		}
	}, [query, scope, filters.status, page, pageSize, syncWithUrl]);

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

export function useWorkspaceDetail(id: string) {
	const utils = trpc.useUtils();
	const query = trpc.workspace.get.useQuery({ id }, { enabled: Boolean(id) });

	const invalidate = () => utils.workspace.get.invalidate({ id });

	return {
		...query,
		refresh: invalidate,
	};
}



