"use client";

import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ChevronDown, Settings } from "lucide-react";
import { TagManagerModal } from "@/entities/tags/components/TagManagerModal";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

export function TagTriggerSelect({
  value,
  onChange,
  workspaceId,
}: {
  value?: string;
  onChange: (value: string) => void;
  workspaceId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: realTags = [] } = trpc.tags.list.useQuery(
    { workspaceId: workspaceId || undefined },
    { enabled: !!workspaceId }
  );

  const filteredTags = realTags.filter((t) =>
    !search.trim() || t.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedTag = realTags.find((t) => t.name === value || t.id === value);

  return (
    <>
      <div className="w-full">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between h-9 px-3 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-sm text-zinc-500 focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            >
              {value ? (
                <div className="flex items-center gap-1.5">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: selectedTag?.color ? `${selectedTag.color}20` : "#e4e4e7",
                      color: selectedTag?.color || "#18181b",
                    }}
                  >
                    {selectedTag?.name || value}
                  </span>
                </div>
              ) : (
                <span className="text-zinc-400">Select a tag</span>
              )}
              <ChevronDown className="h-4 w-4 text-zinc-400" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-0 rounded-xl shadow-xl border-zinc-200 bg-white" align="start">
            <Command className="rounded-xl" shouldFilter={false}>
              <div className="p-2 border-b border-zinc-100">
                <CommandInput
                  placeholder="Search or add tags..."
                  value={search}
                  onValueChange={setSearch}
                  className="text-sm"
                />
              </div>
              <CommandList className="max-h-[300px] overflow-y-auto p-1 space-y-1">
                <CommandEmpty>No tags found.</CommandEmpty>
                <CommandGroup
                  heading={
                    <div className="flex items-center justify-between w-full">
                      <span>Select an option</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpen(false);
                          setTagManagerOpen(true);
                        }}
                        className="p-1 rounded hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
                        title="Open Tag Manager"
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  }
                >
                  <CommandItem
                    value="__any_tag__"
                    onSelect={() => {
                      onChange("");
                      setOpen(false);
                    }}
                    className="cursor-pointer mb-1"
                  >
                    <span className="bg-black text-white text-xs font-medium px-2.5 py-1 rounded-full">
                      Any Tag
                    </span>
                  </CommandItem>
                </CommandGroup>

                {filteredTags.length > 0 && (
                  <CommandGroup
                    heading="Workspace Tags"
                    className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-zinc-500 [&_[cmdk-group-heading]]:tracking-wider"
                  >
                    {filteredTags.map((t) => (
                      <CommandItem
                        key={t.id}
                        value={t.id}
                        onSelect={() => {
                          onChange(t.name);
                          setOpen(false);
                        }}
                        className="cursor-pointer flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-zinc-100"
                      >
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: t.color ? `${t.color}20` : "#e4e4e7",
                            color: t.color || "#18181b",
                          }}
                        >
                          {t.name}
                        </span>
                        {t.usageCount !== undefined && t.usageCount > 0 && (
                          <span className="text-[10px] text-zinc-400">
                            {t.usageCount}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {workspaceId && (
        <TagManagerModal
          open={tagManagerOpen}
          onOpenChange={setTagManagerOpen}
          workspaceId={workspaceId}
        />
      )}
    </>
  );
}
