"use client";
import Button from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { MoreVertical, Folder, Calendar, Eye, Share2, Heart } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function ProposalCard({
  item,
  onInterest,
  onShare,
  onOpen,
  isSelected,
  onSelect
}: {
  item: any;
  onInterest?: (id: string) => void;
  onShare?: (id: string) => void;
  onOpen?: (id: string) => void;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}) {
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
              View Proposal
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onInterest?.(item.id); }}>
              <Heart className="mr-2 h-4 w-4" />
              I'm Interested
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShare?.(item.id); }}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1 pt-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <h3 className="font-semibold text-[15px] leading-snug line-clamp-2 text-zinc-900 group-hover:text-blue-600 transition-colors">
              {item.title || "Untitled Proposal"}
            </h3>
          </div>
        </div>

        <p className="line-clamp-2 text-[13px] text-zinc-500">
          {item.shortSummary || "No description provided."}
        </p>

        <div className="mt-auto pt-4 flex flex-col gap-3">
          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {(item.keywords || []).slice(0, 3).map((t: string) => (
              <span key={t} className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
                {t}
              </span>
            ))}
            {(item.keywords || []).length > 3 && (
              <span className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
                +{(item.keywords || []).length - 3}
              </span>
            )}
            {item.category && (
              <span className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 uppercase">
                {item.category}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-zinc-300" />
              <span>{new Date(item.createdAt || item.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
