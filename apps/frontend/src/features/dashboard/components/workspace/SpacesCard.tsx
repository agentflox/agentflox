"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderKanban } from "lucide-react";
import { DASHBOARD_ROUTES } from "@/constants/routes.config";

type SpacesCardProps = {
    workspace: any;
    isLoading?: boolean;
};

export function SpacesCard({ workspace, isLoading }: SpacesCardProps) {
    const spaces = workspace?.spaces || [];

    return (
        <Card className="flex flex-col overflow-hidden rounded-[2rem] border-slate-200 text-slate-900 shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        Spaces
                    </CardTitle>
                    {isLoading ? (
                        <Skeleton className="h-5 w-8 rounded-full" />
                    ) : (
                        <Badge variant="secondary" className="bg-white shadow-sm">{spaces.length}</Badge>
                    )}
                </div>
                <p className="text-sm text-slate-500">Organize your work into spaces.</p>
            </CardHeader>

            <CardContent className="flex-1 p-0">
                {isLoading ? (
                    <div className="divide-y divide-slate-100">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex items-center justify-between px-6 py-4">
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-48" />
                                </div>
                                <Skeleton className="h-6 w-16 rounded-full" />
                            </div>
                        ))}
                    </div>
                ) : spaces.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                        {spaces.slice(0, 5).map((space: any) => (
                            <Link
                                key={space.id}
                                href={DASHBOARD_ROUTES.SPACE(space.id)}
                                className="flex items-center justify-between bg-white px-6 py-4 transition-colors hover:bg-slate-50"
                            >
                                <div className="grid gap-0.5">
                                    <p className="font-semibold text-slate-900">{space.name}</p>
                                    <p className="line-clamp-1 text-xs text-slate-500">{space.description || "No description"}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="flex h-40 flex-col items-center justify-center gap-2 p-6 text-center text-slate-500">
                        <FolderKanban className="h-8 w-8 opacity-20" />
                        <p>No spaces created yet.</p>
                    </div>
                )}
            </CardContent>

            <CardFooter className="bg-slate-50/50 p-4">
                <Button variant="ghost" className="w-full text-slate-600 hover:text-slate-900" asChild>
                    <Link href={DASHBOARD_ROUTES.SPACES}>View all spaces</Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
