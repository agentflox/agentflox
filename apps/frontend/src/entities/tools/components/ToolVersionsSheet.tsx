import React, { useState } from "react";
import { format } from "date-fns";
import { MoreVertical, CheckCircle2, History } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface ToolVersionsSheetProps {
  toolId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ToolVersionsSheet({ toolId, isOpen, onClose }: ToolVersionsSheetProps) {
  const utils = trpc.useUtils();
  const { data: versions, isLoading } = trpc.compositeTool.listVersions.useQuery(
    { toolId },
    { enabled: isOpen && !!toolId }
  );

  const setLiveMutation = trpc.compositeTool.setLiveVersion.useMutation({
    onSuccess: () => {
      toast.success("Version is now live.");
      utils.compositeTool.listVersions.invalidate({ toolId });
    },
    onError: (err) => toast.error(err.message),
  });

  const createVersionMutation = trpc.compositeTool.createVersion.useMutation({
    onSuccess: () => {
      toast.success("New version created.");
      utils.compositeTool.listVersions.invalidate({ toolId });
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-semibold flex items-center gap-2">
              <History className="w-4 h-4" />
              Version History
            </SheetTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => createVersionMutation.mutate({ toolId })}
              disabled={createVersionMutation.isPending}
            >
              {createVersionMutation.isPending ? "Creating..." : "Save New Version"}
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="text-xs text-muted-foreground mb-4 uppercase tracking-wider font-semibold">
            Published versions
          </p>

          <div className="space-y-4">
            {isLoading && <p className="text-sm text-zinc-500">Loading versions...</p>}
            {!isLoading && versions?.length === 0 && (
              <p className="text-sm text-zinc-500">No versions published yet.</p>
            )}

            {versions?.map((v) => (
              <div key={v.id} className="flex items-start justify-between border-b pb-4 last:border-0">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-semibold text-zinc-900">
                      {format(new Date(v.createdAt), "MMM d, h:mm a")}
                    </span>
                    {v.isLive && (
                      <span className="flex items-center gap-1 text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full border border-green-200 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        Live
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Avatar className="w-5 h-5 bg-indigo-500">
                      <AvatarImage src={v.createdBy.image ?? undefined} />
                      <AvatarFallback className="text-[10px] text-white bg-indigo-500">
                        {v.createdBy.name?.charAt(0).toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-zinc-600">
                      {v.createdBy.name ?? v.createdBy.email ?? "Unknown"}
                    </span>
                    {v.name && v.name !== `v${v.version}` && (
                      <>
                        <span className="text-zinc-300">•</span>
                        <span className="text-xs text-zinc-500">{v.name}</span>
                      </>
                    )}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 hover:bg-zinc-100 rounded-md text-zinc-500">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      disabled={v.isLive}
                      onClick={() => setLiveMutation.mutate({ toolId, versionId: v.id })}
                    >
                      Set as live
                    </DropdownMenuItem>
                    {/* Additional actions like restore/view could go here */}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
