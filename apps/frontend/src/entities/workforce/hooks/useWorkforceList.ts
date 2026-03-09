"use client";
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { WorkforceFilterValues, WorkforceScope } from "../types";
import { keepPreviousData } from "@tanstack/react-query";

const PAGE_SIZE = 12;

export function useWorkforceList(initialScope: WorkforceScope = "owned") {
    const [page, setPage] = useState(1);
    const [query, setQuery] = useState("");
    const [scope, setScope] = useState<WorkforceScope>(initialScope);
    const [filters, setFilters] = useState<WorkforceFilterValues>({ status: "", mode: "" });

    const listInput = useMemo(
        () => ({
            page,
            pageSize: PAGE_SIZE,
            scope,
            query,
            status: filters.status,
            mode: filters.mode,
            includeCounts: true,
        }),
        [page, scope, query, filters.status, filters.mode]
    );

    const queryResult = trpc.workforce.list.useQuery(listInput, {
        staleTime: 30_000,
        placeholderData: keepPreviousData,
    });

    const hasNextPage =
        queryResult.data?.items.length === PAGE_SIZE &&
        page * PAGE_SIZE < (queryResult.data?.total ?? 0);
    const hasPreviousPage = page > 1;

    return {
        data: queryResult.data,
        isLoading: queryResult.isLoading,
        isFetching: queryResult.isFetching,
        page,
        pageSize: PAGE_SIZE,
        setPage,
        query,
        setQuery,
        scope,
        setScope,
        filters,
        setFilters,
        hasNextPage,
        hasPreviousPage,
    };
}
