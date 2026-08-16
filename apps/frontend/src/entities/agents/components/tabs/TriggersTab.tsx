"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AtSign, MessageSquare, UserPlus, Calendar, X, GripVertical, Zap } from "lucide-react";
import { ScheduleModal, Schedule } from "./ScheduleModal";
import { AddTriggerModal, type TriggerIntegrationSelection } from "./AddTriggerModal";
import {
  TriggerInstructionModal,
  getManualTriggerMeta,
  type ManualTriggerKind,
} from "./TriggerInstructionModal";
import { IntegrationBrandImage } from "@/features/integrations/components/IntegrationBrandImage";
import { toast } from "sonner";
import { format } from "date-fns";
import { INTEGRATIONS_V2_ENABLED } from "@/features/integrations/catalogMapping";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

interface TriggersTabProps {
  agentId: string;
  triggers: Array<{
    id: string;
    triggerType: string;
    triggerConfig?: any;
    name?: string | null;
    description?: string | null;
    isActive: boolean;
    priority: number;
    tags?: string[];
  }>;
  schedules: Array<{
    id: string;
    name?: string | null;
    description?: string | null;
    repeatTime: string;
    startTime?: Date | string | null;
    endTime?: Date | string | null;
    timezone: string;
    instructions?: string | null;
    isActive: boolean;
    priority: number;
  }>;
  isReconfiguring: boolean;
  onUpdate?: () => void;
}

type LocalIntegrationTrigger = TriggerIntegrationSelection & {
  id: string;
  isActive: boolean;
};

function instructionsFromTrigger(trigger?: { triggerConfig?: any } | null): string {
  const cfg = trigger?.triggerConfig;
  if (cfg && typeof cfg === "object" && typeof cfg.instructions === "string") {
    return cfg.instructions;
  }
  return "";
}

const MANUAL_ROWS: Array<{
  kind: ManualTriggerKind;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  { kind: "mention", label: "Mention", Icon: AtSign },
  { kind: "directMessage", label: "Direct Message", Icon: MessageSquare },
  { kind: "assignTask", label: "Assign task", Icon: UserPlus },
];

export function TriggersTab({
  agentId,
  triggers = [],
  schedules = [],
  isReconfiguring,
  onUpdate,
}: TriggersTabProps) {
  const [editingSchedule, setEditingSchedule] = useState<Schedule | undefined>();
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [addTriggerOpen, setAddTriggerOpen] = useState(false);
  const [localIntegrationTriggers, setLocalIntegrationTriggers] = useState<LocalIntegrationTrigger[]>([]);
  const [instructionKind, setInstructionKind] = useState<ManualTriggerKind | null>(null);

  const updateTrigger = trpc.agent.updateTrigger.useMutation({
    onSuccess: () => {
      toast.success("Trigger updated");
      onUpdate?.();
    },
    onError: (e) => toast.error(e.message || "Failed to update trigger"),
  });

  const dbSchedulesToSchedule = (dbSchedules: typeof schedules): Schedule[] => {
    return dbSchedules.map((s) => ({
      id: s.id,
      repeat: s.repeatTime.includes("daily")
        ? "daily"
        : s.repeatTime.includes("weekly")
          ? "weekly"
          : s.repeatTime.includes("monthly")
            ? "monthly"
            : "custom",
      repeatDay: s.repeatTime.includes("day")
        ? parseInt(s.repeatTime.match(/\d+/)?.[0] || "0")
        : undefined,
      time: s.startTime ? format(new Date(s.startTime), "HH:mm") : "09:00",
      startDate: s.startTime ? new Date(s.startTime) : new Date(),
      instructions: s.instructions || undefined,
      isActive: s.isActive,
    }));
  };

  const findTrigger = (kind: ManualTriggerKind) => {
    const type = getManualTriggerMeta(kind).triggerType;
    return triggers.find((t) => t.triggerType === type);
  };

  const manualTriggers = {
    mention: findTrigger("mention")?.isActive ?? false,
    directMessage: findTrigger("directMessage")?.isActive ?? false,
    assignTask: findTrigger("assignTask")?.isActive ?? false,
  };

  const handleManualTriggerToggle = async (kind: ManualTriggerKind, next: boolean) => {
    const meta = getManualTriggerMeta(kind);
    await updateTrigger.mutateAsync({
      agentId,
      triggerType: meta.triggerType,
      isActive: next,
    });
  };

  const handleInstructionSave = async (instructions: string) => {
    if (!instructionKind) return;
    const meta = getManualTriggerMeta(instructionKind);
    await updateTrigger.mutateAsync({
      agentId,
      triggerType: meta.triggerType,
      instructions,
      // Saving instructions also activates the trigger if it wasn't created yet
      isActive: findTrigger(instructionKind)?.isActive ?? true,
    });
    setInstructionKind(null);
  };

  const handleScheduleSave = async (_schedule: Omit<Schedule, "id">) => {
    toast.info("Schedule update functionality coming soon. Please use the API to update schedules.");
  };

  const handleScheduleToggle = async (_scheduleId: string) => {
    toast.info("Schedule update functionality coming soon. Please use the API to update schedules.");
  };

  const handleScheduleDelete = async (_scheduleId: string) => {
    toast.info("Schedule delete functionality coming soon. Please use the API to delete schedules.");
  };

  const handleAddIntegrationTrigger = (selection: TriggerIntegrationSelection) => {
    setLocalIntegrationTriggers((prev) => {
      if (prev.some((t) => t.providerId === selection.providerId && t.accountId === selection.accountId)) {
        return prev;
      }
      return [
        ...prev,
        {
          ...selection,
          id: `${selection.providerId}:${selection.accountId}`,
          isActive: true,
        },
      ];
    });
    setAddTriggerOpen(false);
    toast.success(`${selection.displayName} trigger added`);
    onUpdate?.();
  };

  const getRepeatText = (schedule: (typeof schedules)[0]) => {
    const repeatTime = schedule.repeatTime.toLowerCase();
    if (repeatTime.includes("daily")) {
      return "Daily";
    } else if (repeatTime.includes("weekly")) {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dayMatch = repeatTime.match(/day\s*(\d+)/);
      const dayIndex = dayMatch ? parseInt(dayMatch[1]) : 0;
      return `Weekly on ${days[dayIndex] || "Sunday"}`;
    } else if (repeatTime.includes("monthly")) {
      const dayMatch = repeatTime.match(/day\s*(\d+)/);
      const day = dayMatch ? parseInt(dayMatch[1]) : 1;
      return `Monthly on day ${day}`;
    }
    return "Custom schedule";
  };

  const manualTriggerCount = Object.values(manualTriggers).filter(Boolean).length;
  const displaySchedules = dbSchedulesToSchedule(schedules);
  const dbIntegrationTriggers = triggers.filter((t) => t.triggerType === "INTEGRATION");
  const instructionTrigger = instructionKind ? findTrigger(instructionKind) : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
          <Zap className="w-4 h-4 text-zinc-900" />
          Triggers
        </h3>
        <p className="text-sm text-zinc-500 mt-0.5">
          How should this agent start?
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Manual ({manualTriggerCount})</h3>
        </div>

        <div className="space-y-3">
          {MANUAL_ROWS.map(({ kind, label, Icon }) => {
            const trigger = findTrigger(kind);
            const hasInstructions = Boolean(instructionsFromTrigger(trigger).trim());
            return (
              <div
                key={kind}
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border bg-card",
                  !isReconfiguring && "hover:bg-zinc-50/80 transition-colors",
                )}
              >
                <button
                  type="button"
                  className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer disabled:cursor-not-allowed"
                  onClick={() => setInstructionKind(kind)}
                  disabled={isReconfiguring || updateTrigger.isPending}
                >
                  <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <Label className="cursor-pointer !font-normal">{label}</Label>
                    {hasInstructions && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        Instructions configured
                      </p>
                    )}
                  </div>
                </button>
                <Switch
                  checked={manualTriggers[kind]}
                  onCheckedChange={(v) => handleManualTriggerToggle(kind, v)}
                  disabled={isReconfiguring || updateTrigger.isPending}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Scheduled</h3>
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  Run your agent on a daily, weekly, monthly, or custom schedule
                </p>
                <Button
                  variant="primary"
                  onClick={() => {
                    setEditingSchedule(undefined);
                    setScheduleModalOpen(true);
                  }}
                  disabled={isReconfiguring}
                  className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700"
                >
                  + Add schedule
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {schedules.length > 0 && (
          <div className="space-y-2">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Switch
                    checked={schedule.isActive}
                    onCheckedChange={() => handleScheduleToggle(schedule.id)}
                    disabled={isReconfiguring}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {getRepeatText(schedule)}{" "}
                      {schedule.startTime && `at ${format(new Date(schedule.startTime), "HH:mm")}`}
                    </p>
                    {schedule.instructions && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {schedule.instructions}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const scheduleForEdit = displaySchedules.find((s) => s.id === schedule.id);
                      setEditingSchedule(scheduleForEdit);
                      setScheduleModalOpen(true);
                    }}
                    disabled={isReconfiguring}
                    className="text-sm py-2 px-4"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleScheduleDelete(schedule.id)}
                    disabled={isReconfiguring}
                    className="text-sm py-2 px-4"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {INTEGRATIONS_V2_ENABLED && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Integrations</h3>
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Zap className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Run your agent when something happens in a connected app
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => setAddTriggerOpen(true)}
                    disabled={isReconfiguring}
                    className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700"
                  >
                    + Add trigger
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {(dbIntegrationTriggers.length > 0 || localIntegrationTriggers.length > 0) && (
            <div className="space-y-2">
              {dbIntegrationTriggers.map((trigger) => (
                <div
                  key={trigger.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Switch checked={trigger.isActive} disabled />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {trigger.name || "Integration trigger"}
                      </p>
                      {trigger.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {trigger.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {localIntegrationTriggers.map((trigger) => (
                <div
                  key={trigger.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Switch
                      checked={trigger.isActive}
                      onCheckedChange={() => {
                        setLocalIntegrationTriggers((prev) =>
                          prev.map((t) =>
                            t.id === trigger.id ? { ...t, isActive: !t.isActive } : t,
                          ),
                        );
                      }}
                      disabled={isReconfiguring}
                    />
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-white">
                      <IntegrationBrandImage provider={trigger.providerId} size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{trigger.displayName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {trigger.accountLabel}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setLocalIntegrationTriggers((prev) => prev.filter((t) => t.id !== trigger.id))
                    }
                    disabled={isReconfiguring}
                    className="text-sm py-2 px-4"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ScheduleModal
        open={scheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
        onSave={handleScheduleSave}
        initialSchedule={editingSchedule}
        isLoading={false}
      />

      <AddTriggerModal
        open={addTriggerOpen}
        onOpenChange={setAddTriggerOpen}
        onContinue={handleAddIntegrationTrigger}
      />

      <TriggerInstructionModal
        open={instructionKind != null}
        onOpenChange={(open) => {
          if (!open) setInstructionKind(null);
        }}
        kind={instructionKind}
        initialInstructions={instructionsFromTrigger(instructionTrigger)}
        isLoading={updateTrigger.isPending}
        onSave={handleInstructionSave}
      />
    </div>
  );
}
