import React from "react";
import { Activity, AlertCircle, CheckCircle2, XCircle, Shield, Zap } from "lucide-react";
import { SwarmTask } from "./SwarmTaskView";

interface SwarmEvent {
  sessionId: string;
  type: string;
  payload: any;
  timestamp: string;
}

interface SwarmMetricsViewProps {
  cycleCount: number;
  errorCount: number;
  tasksDone: number;
  tasksFailed: number;
  pendingApprovals: SwarmTask[];
  swarmEvents: SwarmEvent[];
}

export function SwarmMetricsView({
  cycleCount,
  errorCount,
  tasksDone,
  tasksFailed,
  pendingApprovals,
  swarmEvents,
}: SwarmMetricsViewProps) {
  return (
    <div className="p-6 grid grid-cols-2 gap-4 max-w-2xl mx-auto">
      {[
        { label: "Cycles", value: cycleCount, icon: <Activity className="h-5 w-5 text-indigo-500" />, sub: "Coordinator cycles", color: "indigo" },
        { label: "Errors", value: errorCount, icon: <AlertCircle className="h-5 w-5 text-red-500" />, sub: "Cycle errors", color: "red" },
        { label: "Tasks Done", value: tasksDone, icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />, sub: "Completed", color: "emerald" },
        { label: "Tasks Failed", value: tasksFailed, icon: <XCircle className="h-5 w-5 text-red-400" />, sub: "Failed permanently", color: "red" },
        { label: "HITL Pending", value: pendingApprovals.length, icon: <Shield className="h-5 w-5 text-amber-500" />, sub: "Awaiting review", color: "amber" },
        { label: "Total Events", value: swarmEvents.length, icon: <Zap className="h-5 w-5 text-violet-500" />, sub: "Swarm events", color: "violet" },
      ].map(m => (
        <div key={m.label} className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className={`h-12 w-12 rounded-xl bg-${m.color}-50 border border-${m.color}-100 flex items-center justify-center flex-shrink-0`}>{m.icon}</div>
          <div>
            <p className="text-2xl font-black text-zinc-900">{m.value}</p>
            <p className="text-xs font-bold text-zinc-700">{m.label}</p>
            <p className="text-[10px] text-zinc-400">{m.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
