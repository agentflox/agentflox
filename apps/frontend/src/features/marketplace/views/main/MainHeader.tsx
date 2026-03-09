"use client";
import { cn } from "@/lib/utils";
import { Sparkles, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Protect } from "@/features/permissions/components/Protect";
import { Capability } from "@/features/permissions/capabilities";
import { Input } from "@/components/ui/input";

interface MainHeaderProps {
  title?: string;
  description?: string;
  className?: string;
}

export default function MainHeader({
  title = "Marketplace",
  description = "Discover trusted agents, expert teams, and innovative projects.",
  className,
}: MainHeaderProps) {
  return (
    <div className={cn("space-y-6 pb-6 border-b border-zinc-200", className)}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
            {title}
            <Sparkles className="h-5 w-5 text-amber-500 fill-amber-500" />
          </h1>
          <p className="text-base text-zinc-500 max-w-2xl">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-dashed">
            My Listings
          </Button>
          <Protect permission={Capability.MARKETPLACE_LIST_ITEM}>
            <Button className="bg-zinc-900 text-white hover:bg-zinc-800 gap-2">
              <Plus className="h-4 w-4" />
              List Item
            </Button>
          </Protect>
        </div>
      </div>
    </div>
  );
}
