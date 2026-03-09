"use client";

import React from "react";
import { X, MessageCircle, Mail, Zap, Clock, ChevronLeft } from "lucide-react";
import { useWorkforceStore } from "./store/useWorkforceStore";
import { cn } from "@/lib/utils";
import WorkforceRunView from "./WorkforceRunView";

interface WorkforceTestSidebarProps {
  workforceId: string;
  workforceName: string;
  selectedTrigger: { id: string; label: string } | null;
  onSelectTrigger: (triggerId: string, triggerLabel: string) => void;
  onBackToTriggerList: () => void;
  onClose?: () => void;
}

function TriggerIcon({ label }: { label: string }) {
  const l = label.toLowerCase();
  if (l.includes("mail") || l.includes("gmail")) return <Mail className="h-5 w-5 text-zinc-500" />;
  if (l.includes("user") || l.includes("message")) return <MessageCircle className="h-5 w-5 text-zinc-500" />;
  return <Zap className="h-5 w-5 text-zinc-500" />;
}

export default function WorkforceTestSidebar({
  workforceId,
  workforceName,
  selectedTrigger,
  onSelectTrigger,
  onBackToTriggerList,
  onClose,
}: WorkforceTestSidebarProps) {
  const { nodes, isTestSidebarOpen, setTestSidebarOpen } = useWorkforceStore();

  const handleClose = () => {
    setTestSidebarOpen(false);
    onClose();
  };

  const triggerNodes = nodes.filter(
    (n) => n.type === "eventNode" && n.data?.label
  );
  const defaultTrigger = {
    id: "user-message",
    label: "User message received",
  };

  if (!isTestSidebarOpen) return null;

  const showRunView = !!selectedTrigger;

  return (
    <div className="absolute right-0 top-0 bottom-0 z-50 w-[400px] border-l border-zinc-200 bg-white shadow-xl flex flex-col overflow-hidden">
      {showRunView ? (
        <>
          <div className="flex-none flex items-center gap-2 px-4 py-3 border-b border-zinc-100">
            <button
              onClick={onBackToTriggerList}
              className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500"
              title="Back to triggers"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-zinc-700">
              {selectedTrigger!.label}
            </span>
            <div className="ml-auto flex items-center gap-1">
              <button
                className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500"
                title="History"
              >
                <Clock className="h-4 w-4" />
              </button>
              <button
                onClick={() => setTestSidebarOpen(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <WorkforceRunView
              workforceId={workforceId}
              workforceName={workforceName}
              triggerLabel={selectedTrigger!.label}
              embeddedInSidebar
            />
          </div>
        </>
      ) : (
        <>
          <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-zinc-100">
            <h3 className="text-sm font-semibold text-zinc-900">
              Choose a trigger to test
            </h3>
            <div className="flex items-center gap-2">
              <button
                className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500"
                title="History"
              >
                <Clock className="h-4 w-4" />
              </button>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="text-xs text-zinc-500 px-4 py-2">
            Select which trigger to use for testing your workforce
          </p>
          <div className="flex-1 overflow-auto px-4 pb-6 space-y-2">
            <button
              onClick={() => onSelectTrigger(defaultTrigger.id, defaultTrigger.label)}
              className={cn(
                "w-full flex items-center gap-3 p-4 rounded-xl border border-zinc-200",
                "hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors text-left"
              )}
            >
              <div className="h-10 w-10 rounded-lg bg-zinc-100 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-zinc-600" />
              </div>
              <span className="text-sm font-medium text-zinc-900">
                {defaultTrigger.label}
              </span>
            </button>
            {triggerNodes.map((node) => (
              <button
                key={node.id}
                onClick={() => onSelectTrigger(node.id, node.data?.label || "Trigger")}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-xl border border-zinc-200",
                  "hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors text-left"
                )}
              >
                <div className="h-10 w-10 rounded-lg bg-zinc-100 flex items-center justify-center">
                  <TriggerIcon label={node.data?.label || ""} />
                </div>
                <span className="text-sm font-medium text-zinc-900">
                  {node.data?.label || "Trigger"}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
