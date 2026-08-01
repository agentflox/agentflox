"use client";
import { Plus, Settings, Users } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VerticalToolRailProps {
  onMembersClick?: () => void;
  onSettingsClick: () => void;
  activeItem?: "members" | "settings";
  className?: string;
}

export function VerticalToolRail({ onMembersClick, onSettingsClick, activeItem, className = "" }: VerticalToolRailProps) {
  const baseBtn = "flex h-7 w-7 items-center justify-center rounded-lg transition-colors cursor-pointer";
  const activeBtn = "bg-slate-900 text-white";
  const inactiveBtn = "text-slate-600 hover:bg-slate-100";

  return (
    <div className={`absolute right-2 top-20 z-[70] hidden lg:flex flex-col items-center gap-1 py-2 px-0.5 bg-white/90 backdrop-blur-md rounded-md border border-slate-200/60 shadow-sm ${className}`}>
      <TooltipProvider delayDuration={300}>
        {onMembersClick && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={`${baseBtn} ${activeItem === "members" ? activeBtn : inactiveBtn}`}
                onClick={onMembersClick}
                aria-label="Manage members"
              >
                <Users className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="z-[80]">
              <p>Members</p>
            </TooltipContent>
          </Tooltip>
        )}

        <div className="w-5 h-px bg-slate-200 my-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={`${baseBtn} ${activeItem === "settings" ? activeBtn : inactiveBtn}`}
              onClick={onSettingsClick}
              aria-label="Space settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="z-[80]">
            <p>Space settings</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}