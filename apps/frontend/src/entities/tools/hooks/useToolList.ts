"use client";
import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";

export type ToolScope = "owned" | "all";

type FilterState = {
	category?: string;
	isPublic?: boolean;
};

export function useToolList(initialScope: ToolScope = "owned") {
	const [page, setPage] = useState(1);
	const pageSize = 12;
	const [query, setQuery] = useState("");
	const [scope, setScope] = useState<ToolScope>(initialScope);
	const [filters, setFilters] = useState<FilterState>({});

	const serverInput = useMemo(
		() => ({
			query: query.trim() || undefined,
		}),
		[query],
	);

	const queryResult = trpc.compositeTool.list.useQuery(serverInput, {
		staleTime: 30_000,
	});

	const filteredItems = useMemo(() => {
		let items = (queryResult.data || []) as any[];

		if (filters.category) {
			items = items.filter((item) => item.category === filters.category);
		}

		if (typeof filters.isPublic === "boolean") {
			items = items.filter((item) => item.isPublic === filters.isPublic);
		}

		// For now, scope does not change the result set since composite tools
		// are always owned by the current user. We still keep it in state so
		// the UI remains consistent and can be extended later.

		return items;
	}, [queryResult.data, filters.category, filters.isPublic]);

	const paginatedData = useMemo(() => {
		const total = filteredItems.length;
		const start = (page - 1) * pageSize;
		const end = start + pageSize;

		return {
			items: filteredItems.slice(start, end),
			total,
			page,
			pageSize,
		};
	}, [filteredItems, page, pageSize]);

	useEffect(() => {
		setPage(1);
	}, [query, scope, filters.category, filters.isPublic]);

	useEffect(() => {
		const params = new URLSearchParams();
		if (query) params.set("q", query);
		params.set("scope", scope);
		if (filters.category) params.set("category", filters.category);
		if (typeof filters.isPublic === "boolean") params.set("isPublic", String(filters.isPublic));
		params.set("page", String(page));
		if (typeof window !== "undefined") {
			const nextUrl = `${window.location.pathname}?${params.toString()}`;
			window.history.replaceState(null, "", nextUrl);
		}
	}, [query, scope, filters.category, filters.isPublic, page]);

	return {
		...queryResult,
		data: paginatedData,
		page,
		pageSize,
		setPage,
		query,
		setQuery,
		scope,
		setScope,
		filters,
		setFilters,
	};
}



