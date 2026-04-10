import React from "react";
import { GitFork, Zap, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { SwarmTask } from "./SwarmTaskView";

interface SwarmEvent {
  sessionId: string;
  type: string;
  payload: any;
  timestamp: string;
}

interface SwarmGraphViewProps {
  swarmEvents: SwarmEvent[];
  swarmSessionId: string | null;
  sessionStatus: string;
  tasks: SwarmTask[];
  cycleCount: number;
}

export function SwarmGraphView({ swarmEvents, swarmSessionId, sessionStatus, tasks, cycleCount }: SwarmGraphViewProps) {
  return (
    <div className="flex flex-col h-full items-center justify-center p-8">
      {swarmEvents.length === 0 ? (
        <div className="flex flex-col items-center gap-3 opacity-40">
          <GitFork className="h-16 w-16" /><p className="text-sm font-medium">Start the swarm to see agent topology</p>
        </div>
      ) : (
        <div className="w-full max-w-2xl">
          <p className="text-xs text-zinc-500 text-center mb-6">Agent interaction graph — session {swarmSessionId?.slice(0, 8)}</p>
          <div className="relative bg-white border border-zinc-200 rounded-2xl p-8 shadow-sm" style={{ minHeight: 320 }}>
            {/* coordinator */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5">
              <div className={cn("h-14 w-14 rounded-full flex items-center justify-center border-2 shadow-lg",
                sessionStatus === "running" ? "bg-violet-100 border-violet-400" : "bg-zinc-100 border-zinc-300")}>
                <Zap className={cn("h-6 w-6", sessionStatus === "running" ? "text-violet-600" : "text-zinc-400")} />
              </div>
              <span className="text-[10px] font-bold text-zinc-700">Coordinator</span>
              {sessionStatus === "running" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
            </div>
            {/* worker agents */}
            {tasks.slice(0, 6).map((t, i, arr) => {
              const angle = (i / Math.max(arr.length, 1)) * 2 * Math.PI - Math.PI / 2;
              const r = 110;
              const cx = 50 + r * 0.45 * Math.cos(angle);
              const cy = 45 + r * 0.35 * Math.sin(angle);
              return (
                <div key={t.id} className="absolute flex flex-col items-center gap-1" style={{ left: `${cx}%`, top: `${cy}%`, transform: "translate(-50%,-50%)" }}>
                  <div className={cn("h-10 w-10 rounded-full border-2 flex items-center justify-center shadow-sm",
                    t.status === "RUNNING" ? "border-blue-400 bg-blue-50 animate-pulse" :
                    t.status === "COMPLETED" ? "border-emerald-400 bg-emerald-50" :
                    "border-zinc-300 bg-zinc-50")}>
                    <Bot className="h-4 w-4 text-zinc-500" />
                  </div>
                  <span className="text-[8px] font-bold text-zinc-600 text-center max-w-[60px] truncate">{t.title}</span>
                </div>
              );
            })}
            {/* cycle count */}
            <div className="absolute bottom-4 right-4 text-[10px] text-zinc-400">{cycleCount} cycles completed</div>
          </div>
        </div>
      )}
    </div>
  );
}
