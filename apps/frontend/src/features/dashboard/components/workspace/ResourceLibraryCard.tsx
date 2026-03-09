"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";

type ResourceLibraryCardProps = {
    workspace: any;
    isLoading?: boolean;
};

export function ResourceLibraryCard({ workspace, isLoading }: ResourceLibraryCardProps) {
    const resources = workspace?.resources || [];

    return (
        <Card className="col-span-full overflow-hidden rounded-[2rem] border-slate-200 shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold">Resource Library</CardTitle>
                    {isLoading ? <Skeleton className="h-5 w-6 rounded-full" /> : <Badge variant="outline">{resources.length}</Badge>}
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-white p-4">
                                <Skeleton className="h-8 w-8 rounded-lg" />
                                <Skeleton className="h-4 w-2/3" />
                                <Skeleton className="h-3 w-1/3" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        {resources.length > 0 ? (
                            resources.slice(0, 3).map((resource: any) => (
                                <Link
                                    key={resource.id}
                                    href={`/dashboard/resources/${resource.id}`}
                                    className="group flex flex-col gap-2 rounded-xl border border-slate-100 bg-white p-4 transition-all hover:bg-slate-50 hover:shadow-sm"
                                >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-100">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900">{resource.name}</p>
                                        <p className="text-xs text-slate-500">{resource.type || "Document"}</p>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="col-span-3 py-12 text-center text-slate-500">
                                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50">
                                    <FileText className="h-6 w-6 text-slate-300" />
                                </div>
                                <p>No resources uploaded yet.</p>
                                <Button variant="link" className="mt-2 h-auto p-0 text-indigo-600">
                                    Upload your first resource
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
