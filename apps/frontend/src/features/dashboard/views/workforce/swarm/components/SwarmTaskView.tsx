import React from "react";
import { LayoutGrid, Loader2, Zap, CheckCircle2, XCircle, Shield, AlertCircle, Clock, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SwarmTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  agentId?: string | null;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  metadata?: any;
  blockedBy?: string[];
}

const TASK_COLS: { key: string; label: string; color: string }[] = [
  { key: "PENDING", label: "Queued", color: "text-zinc-500" },
  { key: "QUEUED|RUNNING", label: "Processing", color: "text-blue-600" },
  { key: "PENDING_APPROVAL", label: "HITL Review", color: "text-amber-600" },
  { key: "COMPLETED", label: "Done", color: "text-emerald-600" },
  { key: "FAILED_PERMANENTLY|FAILED", label: "Failed", color: "text-red-600" },
];

function taskMatchesCol(task: SwarmTask, colKey: string) {
  return colKey.split("|").includes(task.status);
}

function TaskDescription({ content, className }: { content?: string | null; className?: string }) {
  if (!content) return null;
  const isHtml = /<[a-z][\s\S]*>/i.test(content);
  if (isHtml) {
    return (
      <div 
        className={cn(className, "prose prose-sm max-w-none leading-snug [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-1 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-xs [&_strong]:font-bold")}
        dangerouslySetInnerHTML={{ __html: content }} 
      />
    );
  }
  return <p className={className}>{content}</p>;
}

function TaskCard({ task, onApprove }: { task: SwarmTask; onApprove?: (id: string) => void }) {
  const statusIcon = {
    PENDING: <Clock className="h-3 w-3 text-zinc-400" />,
    QUEUED: <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />,
    RUNNING: <Zap className="h-3 w-3 text-blue-600 animate-pulse" />,
    COMPLETED: <CheckCircle2 className="h-3 w-3 text-emerald-500" />,
    FAILED_PERMANENTLY: <XCircle className="h-3 w-3 text-red-500" />,
    FAILED: <XCircle className="h-3 w-3 text-red-400" />,
    PENDING_APPROVAL: <Shield className="h-3 w-3 text-amber-500" />,
    BLOCKED: <AlertCircle className="h-3 w-3 text-orange-400" />,
  }[task.status] ?? <Clock className="h-3 w-3 text-zinc-300" />;

  const priorityBadge = { CRITICAL: "bg-red-100 text-red-700", HIGH: "bg-orange-100 text-orange-700", LOW: "bg-blue-100 text-blue-700", NORMAL: "bg-zinc-100 text-zinc-500" }[task.priority] ?? "bg-zinc-100 text-zinc-500";

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded uppercase", priorityBadge)}>{task.priority || "NORMAL"}</span>
        <div className="flex items-center gap-1">{statusIcon}<span className="text-[9px] text-zinc-400">#{task.id.slice(0, 6)}</span></div>
      </div>
      <p className="text-xs font-semibold text-zinc-800 leading-snug line-clamp-2">{task.title}</p>
      {task.description && <TaskDescription content={task.description} className="text-[10px] text-zinc-500 mt-1 line-clamp-2" />}
      {task.status === "PENDING_APPROVAL" && onApprove && (
        <button onClick={() => onApprove(task.id)} className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-bold rounded-lg border border-amber-200 transition-colors">
          <Check className="h-3 w-3" /> Approve
        </button>
      )}
      {task.error && <p className="mt-1.5 text-[9px] text-red-500 bg-red-50 px-2 py-1 rounded border border-red-100 leading-snug">{task.error.slice(0, 80)}</p>}
    </div>
  );
}

interface SwarmTaskViewProps {
  tasks: SwarmTask[];
  onApprove: (id: string) => void;
}

export function SwarmTaskView({ tasks, onApprove }: SwarmTaskViewProps) {
  return (
    <div className="flex h-full gap-0 overflow-x-auto p-4">
      {TASK_COLS.map(col => {
        const colTasks = tasks.filter(t => taskMatchesCol(t, col.key));
        return (
          <div key={col.key} className="flex-1 min-w-[200px] max-w-[260px] flex flex-col bg-zinc-50 border border-zinc-200 rounded-xl mr-3 overflow-hidden">
            <div className="p-3 border-b border-zinc-200 bg-white flex items-center justify-between">
              <span className={cn("text-[11px] font-bold uppercase tracking-wider", col.color)}>{col.label}</span>
              <span className="bg-zinc-100 text-zinc-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{colTasks.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {colTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 opacity-30">
                  <LayoutGrid className="h-6 w-6 mb-1" /><p className="text-[10px]">Empty</p>
                </div>
              ) : colTasks.map(t => <TaskCard key={t.id} task={t} onApprove={onApprove} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
