"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLinkIcon, MoreVertical, Eye, Share2, PenSquare, Wrench } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

type ToolSummary = {
	id: string;
	name: string;
	description?: string | null;
	category?: string | null;
	productUrl?: string | null;
	isPublic?: boolean | null;
	updatedAt?: string | Date | null;
};

type Props = {
	item: ToolSummary;
	onOpen?: (id: string) => void;
	onManage?: (id: string) => void;
    isSelected?: boolean;
    onSelect?: (id: string, selected: boolean) => void;
};

export function ToolCard({ item, onOpen, onManage, isSelected, onSelect }: Props) {
	const updatedAt = item.updatedAt ? new Date(item.updatedAt) : undefined;

	return (
		<div
			className={cn(
				"group relative flex flex-col bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden h-full",
				isSelected ? "border-blue-400 ring-1 ring-blue-200 bg-blue-50/20" : "border-zinc-200 hover:border-zinc-300"
			)}
			onClick={() => onOpen?.(item.id)}
		>
			{/* Checkbox — top left */}
			<div
				className={cn(
					"absolute top-2 left-2 z-10 transition-opacity",
					isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
				)}
				onClick={(e) => { e.stopPropagation(); onSelect?.(item.id, !isSelected); }}
			>
				<Checkbox
					checked={isSelected}
					onCheckedChange={(checked) => onSelect?.(item.id, !!checked)}
					className="h-4 w-4 border-zinc-300 bg-white shadow-sm cursor-pointer"
				/>
			</div>

			{/* Actions — top right, vertical dots */}
			<div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
							<MoreVertical className="h-4 w-4 text-zinc-400" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpen?.(item.id); }}>
							<Eye className="mr-2 h-4 w-4" />
							View details
						</DropdownMenuItem>
						<DropdownMenuItem onClick={(e) => { e.stopPropagation(); onManage?.(item.id); }}>
							<PenSquare className="mr-2 h-4 w-4" />
							Edit tool
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<div className="p-4 flex flex-col gap-3 flex-1 pt-7">
				<div className="flex items-start justify-between gap-4">
					<div className="min-w-0 space-y-1">
						<h3 className="flex items-center gap-2 font-semibold text-[15px] leading-snug line-clamp-2 text-zinc-900 group-hover:text-blue-600 transition-colors">
							<Wrench className="h-4 w-4 text-zinc-400" />
							{item.name || "Untitled Tool"}
						</h3>
					</div>
				</div>

				<p className="line-clamp-2 text-[13px] text-zinc-500">
					{item.description || "No description provided."}
				</p>

				<div className="mt-auto pt-4 flex flex-col gap-3">
					<div className="flex flex-wrap items-center gap-2">
                        {item.category && (
                        <span className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 uppercase">
                            {item.category}
                        </span>
                        )}
                        <span className={cn(
                            "rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase",
                            item.isPublic ? "border-green-200 bg-green-50 text-green-700" : "border-zinc-200 bg-zinc-50 text-zinc-600"
                        )}>
                            {item.isPublic ? "Public" : "Private"}
                        </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-400 mt-2">
                        {item.productUrl && (
                            <a
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                                href={item.productUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                            >
                                Visit product <ExternalLinkIcon className="h-3 w-3" />
                            </a>
                        )}
                        {updatedAt && (
                            <span className="ml-auto text-xs text-zinc-400">
                                Updated {updatedAt.toLocaleDateString()}
                            </span>
                        )}
                    </div>
				</div>
			</div>
		</div>
	);
}



