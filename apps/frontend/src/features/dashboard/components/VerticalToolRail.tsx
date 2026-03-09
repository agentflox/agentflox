import { Button } from "@/components/ui/button";
import { Plus, Settings, Users } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VerticalToolRailProps {
  onAddClick: () => void;
  onMembersClick?: () => void;
  onSettingsClick: () => void;
  className?: string;
}

export function VerticalToolRail({ onAddClick, onMembersClick, onSettingsClick, className = "" }: VerticalToolRailProps) {
  return (
    <div className={`absolute right-0 top-20 z-[55] hidden lg:flex flex-col items-center gap-4 p-2 bg-background/80 backdrop-blur-sm rounded-l-lg border border-border shadow-lg ${className}`}>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              className="flex h-6 w-6 items-center justify-center rounded-full bg-background hover:bg-accent hover:text-accent-foreground transition-colors border shadow-sm"
              onClick={onAddClick}
              aria-label="Add new item"
            >
              <Plus className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Add new item</p>
          </TooltipContent>
        </Tooltip>

        {onMembersClick && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="flex h-6 w-6 items-center justify-center rounded-full bg-background hover:bg-accent hover:text-accent-foreground transition-colors border shadow-sm"
                onClick={onMembersClick}
                aria-label="Manage members"
              >
                <Users className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Members</p>
            </TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              className="flex h-6 w-6 items-center justify-center rounded-full bg-background hover:bg-accent hover:text-accent-foreground transition-colors border shadow-sm"
              onClick={onSettingsClick}
              aria-label="Space settings"
            >
              <Settings className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Space settings</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
