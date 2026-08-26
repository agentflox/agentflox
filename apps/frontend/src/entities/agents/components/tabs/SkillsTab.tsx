"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Sparkles, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SkillsTabProps {
  agentId: string;
  isReconfiguring?: boolean;
  onUpdate?: () => void;
}

export function SkillsTab({
  agentId,
  isReconfiguring = false,
  onUpdate,
}: SkillsTabProps) {
  const { data: skillsData, isLoading } = trpc.skill.list.useQuery(
    { pageSize: 50 },
    { refetchOnWindowFocus: false }
  );

  const skills = skillsData?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Skills
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Specialized capabilities and instructions this agent can perform.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
        </div>
      ) : skills.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 mb-3">
            <Sparkles className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            No skills attached
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            Skills extend agent behaviors with pre-configured abilities.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {skills.map((skill: any) => (
            <div
              key={skill.id}
              className="flex items-start gap-3 p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-2xs hover:border-zinc-300 transition-colors"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 font-semibold text-xs">
                {skill.displayName?.slice(0, 2).toUpperCase() || skill.name?.slice(0, 2).toUpperCase() || "SK"}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {skill.displayName || skill.name}
                </h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-0.5">
                  {skill.description || "No description provided"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
