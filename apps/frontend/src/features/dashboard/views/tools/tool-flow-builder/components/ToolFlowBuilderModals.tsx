"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Bot } from "lucide-react";
import { StepDetailModal } from "@/entities/tools/components/builder/StepDetailModal";
import { OutputsDetailModal } from "@/entities/tools/components/builder/OutputsDetailModal";
import { LoopDetailModal } from "@/entities/tools/components/builder/LoopDetailModal";
import { MarketplaceGuardDialog } from "@/features/marketplace/components/MarketplaceGuardDialog";
import { PublishEntityModal } from "@/features/marketplace/components/PublishEntityModal";
import { BugReportModal } from "@/entities/tools/components/BugReportModal";
import { SupportAssistantModal } from "@/components/assistant/SupportAssistantModal";
import { ToolVersionsSheet } from "@/entities/tools/components/ToolVersionsSheet";
import type { ToolFlowBuilderApi } from "../hooks/useToolFlowBuilder";
import { IconColorSelector } from "@/components/ui/icon-color-selector";
import { EntityIcon } from "@/entities/shared/components/EntityIcon";

export function ToolFlowBuilderModals({ api }: { api: ToolFlowBuilderApi }) {
  const {
    modalStepId, setModalStepId, modalStep, modalStepTool, modalVarTree, updateStepConfig,
    runCompositeTool, isRunningTool, liveRunState, outputsModalOpen, setOutputsModalOpen,
    outputMode, outputs, buildVarTree, steps, addOutputFromSource, removeOutput, setOutputMode,
    settingsOpen, setSettingsOpen, toolIcon, setToolIcon, toolColor, setToolColor, name, setName, description, setDescription,
    isGuardOpen, setIsGuardOpen, isPublishModalOpen, setIsPublishModalOpen, initialTool, category,
    inputs, bugReportOpen, setBugReportOpen, supportModalOpen, setSupportModalOpen,
    versionsOpen, setVersionsOpen,
    agentPromptOpen, setAgentPromptOpen, agentPromptDraft, setAgentPromptDraft,
    agentPromptMutation, handleSaveAgentPrompt, updateMutation,
  } = api;

  return (
    <>
      <StepDetailModal
        open={!!modalStepId && modalStep?.type !== "LOOP"}
        step={modalStep}
        systemTool={modalStepTool}
        varTree={modalVarTree}
        onClose={() => setModalStepId(null)}
        onUpdateStepConfig={updateStepConfig}
        onRunStep={() => { if (modalStepId) runCompositeTool({ startStepId: modalStepId, endStepId: modalStepId }); }}
        isRunning={isRunningTool}
        runOutput={modalStepId ? liveRunState[modalStepId]?.output : undefined}
      />
      <LoopDetailModal
        open={!!modalStepId && modalStep?.type === "LOOP"}
        step={modalStep}
        onClose={() => setModalStepId(null)}
        onUpdateStepConfig={updateStepConfig}
      />
      <OutputsDetailModal
        open={outputsModalOpen}
        onClose={() => setOutputsModalOpen(false)}
        outputMode={outputMode}
        outputs={outputs}
        varTree={buildVarTree(steps.length)}
        onSetOutputMode={setOutputMode}
        onAddOutput={(source, sourceLabel, name, type) => addOutputFromSource(source, sourceLabel, name, type)}
        onRemoveOutput={removeOutput}
        runState={liveRunState["outputs"]}
        onRunStep={() => runCompositeTool()}
      />

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tool settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-3">
              <IconColorSelector
                icon={toolIcon}
                color={toolColor}
                onIconChange={(newIcon) => {
                  setToolIcon(newIcon);
                  if (initialTool?.id) updateMutation.mutate({ id: initialTool.id, icon: newIcon });
                }}
                onColorChange={(newColor) => {
                  setToolColor(newColor);
                  if (initialTool?.id) updateMutation.mutate({ id: initialTool.id, color: newColor });
                }}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-lg shrink-0 overflow-hidden"
                  style={{ backgroundColor: toolIcon ? toolColor : '#f4f4f5', color: toolIcon ? '#ffffff' : '#27272a', border: 'none' }}
                >
                  {toolIcon ? <EntityIcon icon={toolIcon} size={20} fallback={Bot} /> : "T"}
                </Button>
              </IconColorSelector>
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-700 !mb-1.5">Title</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="New Workflow Tool"
                  className="h-8 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 !mb-1.5">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this tool does..."
                className="min-h-[80px] text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-400 shadow-none"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="button" size="sm" className="h-8 px-4 text-xs" onClick={() => setSettingsOpen(false)}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <MarketplaceGuardDialog isOpen={isGuardOpen} onOpenChange={setIsGuardOpen} />
      {isPublishModalOpen && (
        <PublishEntityModal
          open={isPublishModalOpen}
          onOpenChange={setIsPublishModalOpen}
          entityType="tool"
          entityId={initialTool?.id || ""}
          initialTitle={name}
          initialDescription={description}
          entityContext={{
            avatar: toolIcon,
            description: description,
            status: category || "Custom",
            metadata: [
              { label: "Steps", value: steps.length },
              { label: "Inputs", value: inputs.length },
              { label: "Outputs", value: outputs.length },
            ],
            capabilities: steps.map((s) => s.name || s.type).filter(Boolean),
          }}
        />
      )}
      <BugReportModal
        isOpen={bugReportOpen}
        onClose={() => setBugReportOpen(false)}
        entityType="tool"
        entityId={initialTool?.id}
        onOpenSupport={() => setSupportModalOpen(true)}
      />
      <SupportAssistantModal isOpen={supportModalOpen} onClose={() => setSupportModalOpen(false)} />
      <ToolVersionsSheet toolId={initialTool?.id} isOpen={versionsOpen} onClose={() => setVersionsOpen(false)} />

      <Dialog open={agentPromptOpen} onOpenChange={setAgentPromptOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-4 w-4" />Edit Agent Prompt
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-xs text-zinc-500">This prompt is injected when an AI agent uses this tool to understand its purpose and constraints.</p>
            <Textarea
              value={agentPromptDraft}
              onChange={(e) => setAgentPromptDraft(e.target.value)}
              placeholder="You are a helpful assistant that…"
              className="min-h-[180px] text-sm resize-none focus-visible:ring-1"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" className="border border-zinc-200 hover:border-zinc-300" onClick={() => setAgentPromptOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAgentPrompt} disabled={agentPromptMutation.isPending}>
              {agentPromptMutation.isPending ? "Saving…" : "Save prompt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
