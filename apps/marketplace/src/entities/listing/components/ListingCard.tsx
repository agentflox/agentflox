import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { AppWindow, CheckCircle2, MoreHorizontal, Store, PenSquare, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ListingCardProps {
    listing: any;
    onClick?: () => void;
}

export function ListingCard({ listing, onClick }: ListingCardProps) {
    return (
        <Card className="group relative flex flex-col justify-between overflow-hidden transition-all hover:shadow-md cursor-pointer border-zinc-200 dark:border-zinc-800" onClick={onClick}>
            <CardHeader className="p-5 pb-0">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 relative">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                            {listing.type === 'agent' ? <AppWindow className="h-5 w-5" /> : <Store className="h-5 w-5" />}
                        </div>
                        <div className="flex flex-col">
                            <h3 className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 transition-colors line-clamp-1">
                                {listing.title}
                            </h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">
                                {listing.type} • {listing.status.toLowerCase()}
                            </p>
                        </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4 text-zinc-500" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                    <PenSquare className="mr-2 h-4 w-4" />
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">
                                    <Trash className="mr-2 h-4 w-4" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-5 pt-4">
                <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 min-h-[40px]">
                    {listing.shortDesc || listing.description || "No description provided."}
                </p>
            </CardContent>

            <CardFooter className="flex items-center justify-between p-5 pt-0 text-xs text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800/80 mt-4 pt-4">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                            {listing._count?.orders ?? 0}
                        </span>
                        purchases
                    </span>
                </div>
                <span>
                    {formatDistanceToNow(new Date(listing.createdAt), { addSuffix: true })}
                </span>
            </CardFooter>
        </Card>
    );
}

