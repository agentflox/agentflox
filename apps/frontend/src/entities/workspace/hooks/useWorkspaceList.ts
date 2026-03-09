"use client";
import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { keepPreviousData } from "@tanstack/react-query";

export type WorkspaceScope = "owned" | "member" | "all";
export type WorkspaceStatusFilter = "active" | "archived" | "";

type FilterState = {
	status?: WorkspaceStatusFilter;
};

export function useWorkspaceList(initialScope: WorkspaceScope = "owned") {
	const [page, setPage] = useState(1);
	const pageSize = 12;
	const [query, setQuery] = useState("");
	const [scope, setScope] = useState<WorkspaceScope>(initialScope);
	const [filters, setFilters] = useState<FilterState>({ status: "active" });

	const listInput = useMemo(() => {
		const trimmedQuery = query.trim();
		const normalizedStatus =
			filters.status === "active" || filters.status === "archived"
				? filters.status
				: undefined;

		return {
			page,
			pageSize,
			includeCounts: true,
			scope,
			query: trimmedQuery || undefined,
			status: normalizedStatus,
		};
	}, [page, pageSize, scope, query, filters.status]);

	const queryResult = trpc.workspace.list.useQuery(listInput, {
		staleTime: 30_000,
		placeholderData: keepPreviousData
	});
	const utils = trpc.useUtils();

	useEffect(() => {
		setPage(1);
	}, [query, scope, filters.status]);

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
		const params = new URLSearchParams();
		if (query) params.set("q", query);
		if (scope) params.set("scope", scope);
		if (filters.status) params.set("status", filters.status);
		params.set("page", String(page));
		if (typeof window !== "undefined") {
			const url = `${window.location.pathname}?${params.toString()}`;
			window.history.replaceState(null, "", url);
		}
	}, [query, scope, filters.status, page]);

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

export function useWorkspaceDetail(id: string) {
	const utils = trpc.useUtils();
	const query = trpc.workspace.get.useQuery({ id }, { enabled: Boolean(id) });

	const invalidate = () => utils.workspace.get.invalidate({ id });

	return {
		...query,
		refresh: invalidate,
	};
}



