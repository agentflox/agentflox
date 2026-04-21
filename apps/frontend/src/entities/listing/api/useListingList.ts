"use client";
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { keepPreviousData } from "@tanstack/react-query";

export function useListingList() {
    const [query, setQuery] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    const { data: listings, isLoading, refetch } = trpc.marketplace.myListings.useQuery(undefined, {
        staleTime: 30_000,
        placeholderData: keepPreviousData,
    });

    const filteredListings = useMemo(() => {
        if (!listings) return [];
        if (!query) return listings;
        return listings.filter(l => l.title.toLowerCase().includes(query.toLowerCase()));
    }, [listings, query]);

    return {
        listings: filteredListings,
        total: filteredListings.length,
        isLoading,
        refetch,
        query,
        setQuery,
        viewMode,
        setViewMode,
    };
}
