"use client";

import React from "react";
import {
  Bot, Braces, Check, ChevronRight, Code, Code2, CornerDownRight, ExternalLink,
  GitBranch, Info, List, Maximize2, Pencil, Play, Plus, Repeat, Settings, Settings2,
  Sparkles, Trash2, Wrench, X,
  Type, AlignLeft, Hash, FileUp, Table as TableIcon, MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableSidebarInputWrapper } from "@/entities/tools/components/builder/nodes/InputsNode";
import { cn } from "@/lib/utils";
import { STEP_LIBRARY, BRANCH_OPERATORS, INPUT_TYPE_OPTIONS } from "@/entities/tools/constants/builder";
import { BranchConditionRuleRow } from "@/entities/tools/components/builder/BranchConditionRuleRow";
import { VariableMentionInput } from "@/entities/tools/components/builder/VariableMentionInput";
import { VariableSelectionModal } from "@/entities/tools/components/builder/VariableSelectionModal";
import { operatorHasRightValue, inferUiTypeFromProp } from "@/entities/tools/utils/builder";
import type { BranchConditionGroup, BranchConditionRule, InputUiType } from "@/entities/tools/types/builder";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { SidebarPanelProps } from "./types";

export function InputsConfigurePanel(props: SidebarPanelProps) {
  const { api } = props;
  const {
    workspaceId, initialTool, onClose, toast, utils, router, sensors,
    name, setName, description, setDescription, category, setCategory,
    activePanelTab, setActivePanelTab, activeTopTab, setActiveTopTab,
    settingsOpen, setSettingsOpen, assistantOpen, setAssistantOpen,
    toolIcon, setToolIcon, selectedNode, setSelectedNode,
    selectedSubBranchId, setSelectedSubBranchId, selectedStepId, setSelectedStepId,
    viewMode, setViewMode, navigatorOpen, setNavigatorOpen,
    navigatorQuery, setNavigatorQuery, toolStepSidebarOpen, setToolStepSidebarOpen,
    toolStepSidebarQuery, setToolStepSidebarQuery, systemToolsListOpen, setSystemToolsListOpen,
    replaceTargetStepId, setReplaceTargetStepId, inputSidebarOpen, setInputSidebarOpen,
    selectedInputField, setSelectedInputField, pendingBranchStep, setPendingBranchStep,
    sidebarOpen, setSidebarOpen, sidebarWidth, setSidebarWidth,
    isResizingSidebar, setIsResizingSidebar, fallbackText, setFallbackText,
    expandedNodes, setExpandedNodes, nodeMeasurements, setNodeMeasurements,
    modalStepId, setModalStepId, outputsModalOpen, setOutputsModalOpen,
    isSidebarTitleEditing, setIsSidebarTitleEditing, sidebarTitleDraft, setSidebarTitleDraft,
    isGuardOpen, setIsGuardOpen, isPublishModalOpen, setIsPublishModalOpen,
    bugReportOpen, setBugReportOpen, supportModalOpen, setSupportModalOpen,
    versionsOpen, setVersionsOpen, deleteOpen, setDeleteOpen, cloneOpen, setCloneOpen,
    cloneName, setCloneName, agentPromptOpen, setAgentPromptOpen,
    agentPromptDraft, setAgentPromptDraft, linkCopied, setLinkCopied,
    showOutputsSidebarPicker, setShowOutputsSidebarPicker, isSyncingTools, setIsSyncingTools,
    inputs, setInputs, outputMode, setOutputMode, outputs, setOutputs, steps, setSteps,
    isEditing, cloneMutation, deleteMutation, agentPromptMutation,
    handleShare, handleCopyLink, handleExport, handleSaveAgentPrompt, handlePublishClick,
    systemToolsQuery, syncSystemTools, createMutation, updateMutation, upsert,
    addInput, addOutput, addOutputFromSource, removeOutput, addCustomOutput,
    isRunningTool, runHistory, setRunHistory, selectedRunId, setSelectedRunId,
    runInput, setRunInput, selectedRun, liveRunState, runCompositeTool, buildVarTree,
    addStepFromLibrary, addBranchColumn, deleteStep, deleteBranchLogic, updateBranchLabel,
    updateStepName, openToolStepSidebar, openReplaceSidebar, addSystemToolStep,
    updateStepConfig, moveStep, duplicateStep, toggleStepDisabled, toggleStepSkipped,
    toggleStepStickyNote, updateStepStickyContent, applyToolOps,
    nodeTypes, edgeTypes, computedNodes, computedEdges,
    selectedStep, isSidebarTitleEditable, sidebarHeaderTitle, selectedStepTool,
    modalStep, modalStepTool, modalStepIndex, modalVarTree,
  } = api;

  return (
    <>
      {/* Missing required banner */}
      {(() => {
        const missing = inputs
          .filter((i) => i.required)
          .filter((i) =>
            i.fillMode === "manual"
              ? i.defaultValue == null || i.defaultValue === ""
              : true,
          )
          .map((i) => i.name)
          .filter(Boolean);
        if (missing.length === 0) return null;
        return (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <div className="font-medium">Missing required values for:</div>
            <ul className="mt-1 list-disc pl-4">
              {missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        );
      })()}

      <div className="space-y-2">
        <div className="flex items-center justify-between pb-1">
          <div className="text-xs font-semibold text-zinc-900">Inputs</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" className="h-7 px-2 text-xs text-zinc-700 shadow-sm" onClick={() => addInput("text")}>
            <Type className="w-3.5 h-3.5 mr-1 text-zinc-400" /> Text
          </Button>
          <Button type="button" variant="outline" className="h-7 px-2 text-xs text-zinc-700 shadow-sm" onClick={() => addInput("long_text")}>
            <AlignLeft className="w-3.5 h-3.5 mr-1 text-zinc-400" /> Long text
          </Button>
          <Button type="button" variant="outline" className="h-7 px-2 text-xs text-zinc-700 shadow-sm" onClick={() => addInput("number")}>
            <Hash className="w-3.5 h-3.5 mr-1 text-zinc-400" /> Number
          </Button>
          <Button type="button" variant="outline" className="h-7 px-2 text-xs text-zinc-700 shadow-sm" onClick={() => addInput("json")}>
            <Braces className="w-3.5 h-3.5 mr-1 text-zinc-400" /> JSON
          </Button>
          <Button type="button" variant="outline" className="h-7 px-2 text-xs text-zinc-700 shadow-sm" onClick={() => addInput("file_to_url")}>
            <FileUp className="w-3.5 h-3.5 mr-1 text-zinc-400" /> File to URL
          </Button>
          <Button type="button" variant="outline" className="h-7 px-2 text-xs text-zinc-700 shadow-sm" onClick={() => addInput("table")}>
            <TableIcon className="w-3.5 h-3.5 mr-1 text-zinc-400" /> Table
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" className="h-7 px-2 text-xs text-zinc-700 shadow-sm">
                <MoreHorizontal className="w-3.5 h-3.5 mr-1 text-zinc-400" /> More
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {INPUT_TYPE_OPTIONS.map((o) => {
                const Icon = o.icon;
                return (
                  <DropdownMenuItem key={o.value} onSelect={() => addInput(o.value)} className="font-normal cursor-pointer">
                    <Icon className="w-4 h-4 mr-2 text-zinc-400" />
                    {o.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Sortable inputs list */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event) => {
          const { active, over } = event;
          if (over && active.id !== over.id) {
            setInputs((prev) => {
              const oldIndex = prev.findIndex((_, i) => `input-${i}` === active.id);
              const newIndex = prev.findIndex((_, i) => `input-${i}` === over.id);
              if (oldIndex !== -1 && newIndex !== -1) {
                return arrayMove(prev, oldIndex, newIndex);
              }
              return prev;
            });
          }
        }}
      >
        <div className="space-y-2 mt-4">
          <SortableContext
            items={inputs.map((_, i) => `input-${i}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {inputs.map((field, realIdx) => {
                const uiType =
                  field.uiType ?? inferUiTypeFromProp({ type: field.type });
                return (
                  <SortableSidebarInputWrapper key={`input-${realIdx}`} id={`input-${realIdx}`}>
                    <div
                      className="rounded-lg border border-zinc-200 bg-white p-3 w-full"
                    >
                      <div className="flex items-center gap-2">
                        <Input
                          value={field.name}
                          onChange={(e) =>
                            setInputs((prev) =>
                              prev.map((f, i) =>
                                i === realIdx ? { ...f, name: e.target.value } : f,
                              ),
                            )
                          }
                          placeholder="variable_name"
                          className="h-8 text-xs"
                        />

                        <div className="ml-auto flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500">Required</span>
                            <Switch
                              checked={!!field.required}
                              onCheckedChange={(checked) =>
                                setInputs((prev) =>
                                  prev.map((f, i) =>
                                    i === realIdx ? { ...f, required: checked } : f,
                                  ),
                                )
                              }
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setInputs((prev) =>
                                prev.filter((_, i) => i !== realIdx),
                              )
                            }
                            className="text-zinc-400 hover:text-red-500 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3">
                        {uiType === "oauth_account" ? (
                          <Select
                            value={(field.defaultValue as string) || ""}
                            onValueChange={(val) =>
                              setInputs((prev) =>
                                prev.map((f, i) =>
                                  i === realIdx ? { ...f, defaultValue: val } : f,
                                ),
                              )
                            }
                          >
                            <SelectTrigger className="h-9 text-xs font-normal">
                              <SelectValue placeholder="Select connected account..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="demo_oauth_account" className="text-xs font-normal [&_span]:font-normal">
                                Demo connected account
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : uiType === "checkbox" ? (
                          <div className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2">
                            <div className="text-xs text-zinc-700">Default</div>
                            <Switch
                              checked={Boolean(field.defaultValue)}
                              onCheckedChange={(checked) =>
                                setInputs((prev) =>
                                  prev.map((f, i) =>
                                    i === realIdx
                                      ? { ...f, defaultValue: checked }
                                      : f,
                                  ),
                                )
                              }
                            />
                          </div>
                        ) : uiType === "long_text" ? (
                          <Textarea
                            value={(field.defaultValue as string) ?? ""}
                            onChange={(e) =>
                              setInputs((prev) =>
                                prev.map((f, i) =>
                                  i === realIdx
                                    ? { ...f, defaultValue: e.target.value }
                                    : f,
                                ),
                              )
                            }
                            placeholder="Type here..."
                            className="min-h-[72px] text-xs focus-visible:ring-1 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
                          />
                        ) : (
                          <Input
                            value={(field.defaultValue as any) ?? ""}
                            onChange={(e) =>
                              setInputs((prev) =>
                                prev.map((f, i) =>
                                  i === realIdx
                                    ? { ...f, defaultValue: e.target.value }
                                    : f,
                                ),
                              )
                            }
                            placeholder="Type here..."
                            className="h-9 text-xs focus-visible:ring-1 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
                          />
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <CornerDownRight className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-500 font-mono text-[10px]">params.</span>
                          <div className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-mono text-[10px]">
                            {field.name || 'unnamed'}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                          {field.type === 'number' ? (
                            <Hash className="w-3 h-3 text-slate-400" />
                          ) : field.type === 'boolean' ? (
                            <Check className="w-3 h-3 text-slate-400" />
                          ) : field.type === 'object' || field.type === 'array' ? (
                            <Braces className="w-3 h-3 text-slate-400" />
                          ) : (
                            <Type className="w-3 h-3 text-slate-400" />
                          )}
                          <span className="capitalize">{field.type}</span>
                        </div>
                      </div>
                    </div>
                  </SortableSidebarInputWrapper>
                );
              })}
            </div>
          </SortableContext>
        </div>
      </DndContext>
    </>
  );
}
