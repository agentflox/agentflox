import React from "react";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { SwarmTask } from "./SwarmTaskView";

interface SwarmTimelineViewProps {
  tasks: SwarmTask[];
}

export function SwarmTimelineView({ tasks }: SwarmTimelineViewProps) {
  return (
    <div className="flex flex-col h-full p-6 overflow-auto">
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full opacity-40">
          <Timer className="h-12 w-12 mb-2" /><p className="text-sm">No tasks to display. Start the swarm and assign tasks.</p>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto w-full">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Execution Timeline</p>
          {tasks.map(t => {
            const start = t.createdAt ? new Date(t.createdAt).getTime() : 0;
            const end = t.completedAt ? new Date(t.completedAt).getTime() : Date.now();
            const baseline = tasks.reduce((mn, tt) => Math.min(mn, tt.createdAt ? new Date(tt.createdAt).getTime() : mn), Date.now());
            const total = Date.now() - baseline || 1;
            const left = ((start - baseline) / total) * 100;
            const width = Math.max(0.5, ((end - start) / total) * 100);
            const colors: Record<string, string> = { COMPLETED: "bg-emerald-400", RUNNING: "bg-blue-400 animate-pulse", FAILED_PERMANENTLY: "bg-red-400", PENDING: "bg-zinc-300", QUEUED: "bg-indigo-300" };
            const bar = colors[t.status] || "bg-zinc-300";
            return (
              <div key={t.id} className="flex items-center gap-3 mb-2 group">
                <div className="w-40 flex-shrink-0 text-[10px] font-semibold text-zinc-700 text-right truncate" title={t.title}>{t.title}</div>
                <div className="flex-1 relative h-7 bg-zinc-100 rounded-lg overflow-hidden border border-zinc-200">
                  <div className={cn("absolute h-full rounded-lg transition-all", bar)} style={{ left: `${left}%`, width: `${width}%` }} />
                  <span className="absolute inset-0 flex items-center px-2 text-[9px] font-bold text-zinc-600">{t.status}</span>
                </div>
                <div className="w-16 flex-shrink-0 text-[9px] text-zinc-400 text-right">{Math.round((end - start) / 1000)}s</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
