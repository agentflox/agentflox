"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getDashboardSubpathFromPathname, parseDashboardState } from "@/features/dashboard/utils/dashboardUrl";

export function useDashboardState(subpath?: string[]) {
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const parsedState = useMemo(
        () => parseDashboardState(
            searchParams,
            subpath && subpath.length > 0 ? subpath : getDashboardSubpathFromPathname(pathname)
        ),
        [searchParams, pathname, subpath]
    );

    return { searchParams, pathname, parsedState };
}
