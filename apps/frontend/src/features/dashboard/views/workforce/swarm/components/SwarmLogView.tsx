import React, { useState } from "react";
import { Search, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface SwarmEvent {
  sessionId: string;
  type: string;
  payload: any;
  timestamp: string;
}

interface SwarmLogViewProps {
  swarmEvents: SwarmEvent[];
}

export function SwarmLogView({ swarmEvents }: SwarmLogViewProps) {
  const [logFilter, setLogFilter] = useState("");
  const [logLevelFilter, setLogLevelFilter] = useState<string>("ALL");

  const logs = swarmEvents.map((e, i) => ({
    id: `${i}`, timestamp: e.timestamp, type: e.type,
    level: e.type.includes("ERROR") ? "ERROR" : e.type.includes("IDLE") ? "WARN" : "INFO",
    message: JSON.stringify(e.payload ?? {}),
  }));

  const filteredLogs = logs.filter(l =>
    (!logFilter || l.message.toLowerCase().includes(logFilter.toLowerCase()) || l.type.toLowerCase().includes(logFilter.toLowerCase())) &&
    (logLevelFilter === "ALL" || l.level === logLevelFilter)
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none p-3 border-b border-zinc-200 bg-white flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
          <input value={logFilter} onChange={e => setLogFilter(e.target.value)}
            placeholder="Filter logs…" className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:border-indigo-300" />
        </div>
        {["ALL", "INFO", "WARN", "ERROR"].map(lvl => (
          <button key={lvl} onClick={() => setLogLevelFilter(lvl)}
            className={cn("px-2.5 py-1 text-[10px] font-bold rounded uppercase border transition-colors",
              logLevelFilter === lvl ? "bg-indigo-600 text-white border-indigo-600" : "border-zinc-200 text-zinc-500 hover:bg-zinc-50")}>
            {lvl}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-zinc-400">{filteredLogs.length} entries</span>
      </div>
      <div className="flex-1 overflow-auto p-3 font-mono">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-40">
            <FileText className="h-10 w-10 mb-2" /><p className="text-sm">No logs yet — start the swarm</p>
          </div>
        ) : filteredLogs.map(l => (
          <div key={l.id} className={cn("flex items-start gap-2 py-1 text-[11px] border-b border-zinc-100 hover:bg-zinc-50",
            l.level === "ERROR" ? "text-red-700" : l.level === "WARN" ? "text-amber-700" : "text-zinc-700")}>
            <span className="text-[9px] text-zinc-400 w-20 flex-shrink-0 tabular-nums pt-0.5">{new Date(l.timestamp).toLocaleTimeString()}</span>
            <span className={cn("w-10 text-[9px] font-bold flex-shrink-0 pt-0.5",
              l.level === "ERROR" ? "text-red-500" : l.level === "WARN" ? "text-amber-500" : "text-blue-400")}>{l.level}</span>
            <span className="flex-1 font-bold text-violet-600 text-[10px] flex-shrink-0 pt-0.5 w-28 truncate">{l.type}</span>
            <span className="flex-1 text-zinc-600 leading-relaxed">{l.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
