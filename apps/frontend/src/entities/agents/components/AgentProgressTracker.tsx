"use client";

import { cn } from "@/lib/utils";

export interface ProgressStep {
  id: string;
  label: string;
  status: "pending" | "in_progress" | "completed";
  description?: string;
}

interface AgentProgressTrackerProps {
  steps: ProgressStep[];
  currentStep: string;
}

export function AgentProgressTracker({
  steps,
  currentStep,
}: AgentProgressTrackerProps) {
  return (
    <div className="space-y-3">
      {steps.map((step) => (
        <div
          key={step.id}
          className={cn(
            "rounded-lg border p-3",
            step.id === currentStep && "border-primary bg-primary/5",
            step.status === "completed" && "border-emerald-200 bg-emerald-50",
          )}
        >
          <div className="text-sm font-medium">{step.label}</div>
          {step.description ? (
            <div className="mt-1 text-xs text-muted-foreground">{step.description}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
