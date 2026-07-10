"use client";

import React from "react";
import {
  GitBranch,
  Play,
  Plus,
  Code,
  Bot,
  Wrench,
  Share2,
  Hammer,
  ArrowUp,
  ArrowDown,
  Copy,
  Repeat,
  StickyNote,
  Info,
  Braces,
  Code2,
  CornerDownRight,
  ExternalLink,
  Globe,
  Download,
  Trash2,
  Check,
  List,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import {
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import {
  type StepType,
  type BuilderStep,
  type InputFillMode,
  type InputUiType,
  type BuilderInputField,
  type BuilderOutputField,
  type OutputMode,
  type VarLeaf,
  type VarTreeEntry,
  type ToolCanvasNodeData,
} from "@/entities/tools/types/builder";
import {
  STEP_LIBRARY,
  INPUT_TYPE_OPTIONS,
} from "@/entities/tools/constants/builder";
import {
  toVarName,
  inferUiTypeFromProp,
} from "@/entities/tools/utils/builder";
import { InputsNode } from "@/entities/tools/components/builder/nodes/InputsNode";
import { StepNode } from "@/entities/tools/components/builder/nodes/StepNode";
import { BranchNode } from "@/entities/tools/components/builder/nodes/BranchNode";
import { LoopNode } from "@/entities/tools/components/builder/nodes/LoopNode";
import { BranchPathNode } from "@/entities/tools/components/builder/nodes/BranchPathNode";
import { BranchEndNode } from "@/entities/tools/components/builder/nodes/BranchEndNode";
import { StepsEmptyNode } from "@/entities/tools/components/builder/nodes/StepsEmptyNode";
import { OutputsNode } from "@/entities/tools/components/builder/nodes/OutputsNode";
import { PlusEdge } from "@/entities/tools/components/builder/edges/PlusEdge";
import { useToolRun } from "@/entities/tools/hooks/useToolRun";
import type { ToolOp } from "@/entities/tools/components/assistant/types";
import { useMarketplaceGuard } from "@/features/marketplace/hooks/useMarketplaceGuard";
import type { ToolFlowBuilderViewProps } from "../types";


export function useToolFlowBuilder({ workspaceId, initialTool, onClose }: ToolFlowBuilderViewProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // We define handleDragEnd but don't use it directly here to access local states, actually we can access it through the function scope, but setInputs is defined later.


  const [name, setName] = React.useState(initialTool?.name ?? "");
  const [description, setDescription] = React.useState<string>(initialTool?.description ?? "");
  const [category, setCategory] = React.useState<string>(initialTool?.category ?? "Custom");

  const [activePanelTab, setActivePanelTab] =
    React.useState<"configure" | "outputs" | "fallback">("configure");
  const [activeTopTab, setActiveTopTab] = React.useState<"build" | "run">("build");
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [assistantOpen, setAssistantOpen] = React.useState(false);
  const [toolIcon, setToolIcon] = React.useState<string>("T");
  const [selectedNode, setSelectedNode] = React.useState<"inputs" | "outputs" | "step" | "branch_path">("inputs");
  const [selectedSubBranchId, setSelectedSubBranchId] = React.useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<"flow" | "notebook">("flow");
  const [navigatorOpen, setNavigatorOpen] = React.useState(false);
  const [navigatorQuery, setNavigatorQuery] = React.useState("");
  const [toolStepSidebarOpen, setToolStepSidebarOpen] = React.useState(false);
  const [toolStepSidebarQuery, setToolStepSidebarQuery] = React.useState("");
  const [systemToolsListOpen, setSystemToolsListOpen] = React.useState(false);
  const [replaceTargetStepId, setReplaceTargetStepId] = React.useState<string | null>(null);
  const [inputSidebarOpen, setInputSidebarOpen] = React.useState(false);
  const [selectedInputField, setSelectedInputField] = React.useState<{ stepId: string; fieldName: string } | { kind: "tool"; fieldIdx: number } | null>(null);
  const [pendingBranchStep, setPendingBranchStep] = React.useState<{ branchStepId?: string, branchId?: string, insertIndex?: number } | null>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [sidebarWidth, setSidebarWidth] = React.useState(420);
  const [isResizingSidebar, setIsResizingSidebar] = React.useState(false);
  const [fallbackText, setFallbackText] = React.useState<string>((initialTool?.functionSchema as any)?.["x-fallback"] ?? "");
  const [expandedNodes, setExpandedNodes] = React.useState<Record<string, boolean>>({});
  // Actual DOM-measured node heights keyed by node id
  const [nodeMeasurements, setNodeMeasurements] = React.useState<Record<string, number>>({});

  // Step detail modal
  const [modalStepId, setModalStepId] = React.useState<string | null>(null);
  const [outputsModalOpen, setOutputsModalOpen] = React.useState(false);
  const [isSidebarTitleEditing, setIsSidebarTitleEditing] = React.useState(false);
  const [sidebarTitleDraft, setSidebarTitleDraft] = React.useState("");

  // Marketplace Injection
  const { checkProfileAndProceed, isGuardOpen, setIsGuardOpen } = useMarketplaceGuard();
  const [isPublishModalOpen, setIsPublishModalOpen] = React.useState(false);
  const [bugReportOpen, setBugReportOpen] = React.useState(false);
  const [supportModalOpen, setSupportModalOpen] = React.useState(false);
  const [versionsOpen, setVersionsOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [cloneOpen, setCloneOpen] = React.useState(false);
  const [cloneName, setCloneName] = React.useState("");
  const [agentPromptOpen, setAgentPromptOpen] = React.useState(false);
  const [agentPromptDraft, setAgentPromptDraft] = React.useState(
    (initialTool?.functionSchema as any)?.["x-agentPrompt"] ?? ""
  );
  const [linkCopied, setLinkCopied] = React.useState(false);

  const router = useRouter();

  const handlePublishClick = () => {
    checkProfileAndProceed(() => {
      setIsPublishModalOpen(true);
    });
  };

  const isEditing = !!initialTool?.id;

  // Clone mutation
  const cloneMutation = trpc.compositeTool.clone.useMutation({
    onSuccess: (cloned) => {
      toast({ title: "Cloned", description: `"${cloned.name}" created.` });
      utils.compositeTool.list.invalidate();
      setCloneOpen(false);
      router.push(`/dashboard/tools/build/flow/${cloned.id}`);
    },
    onError: (err) => toast({ title: "Clone failed", description: err.message, variant: "destructive" }),
  });

  // Delete mutation
  const deleteMutation = trpc.compositeTool.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Tool deleted" });
      utils.compositeTool.list.invalidate();
      if (onClose) onClose();
      else router.push("/dashboard/tools");
    },
    onError: (err) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });

  // Agent prompt mutation (reuses updateMutation built later, so inline here)
  const agentPromptMutation = trpc.compositeTool.update.useMutation({
    onSuccess: () => {
      toast({ title: "Agent prompt saved" });
      setAgentPromptOpen(false);
      utils.compositeTool.get.invalidate({ id: initialTool?.id });
    },
    onError: (err) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  const handleShare = React.useCallback(async () => {
    const url = `${window.location.origin}/dashboard/tools/build/flow/${initialTool?.id ?? ""}`;
    await navigator.clipboard.writeText(url);
    setLinkCopied(true);
    toast({ title: "Link copied" });
    setTimeout(() => setLinkCopied(false), 2000);
  }, [initialTool?.id, toast]);

  const handleCopyLink = React.useCallback(async () => {
    const url = `${window.location.origin}/dashboard/tools/build/flow/${initialTool?.id ?? ""}`;
    await navigator.clipboard.writeText(url);
    toast({ title: "Link copied" });
  }, [initialTool?.id, toast]);

  const handleExport = React.useCallback(() => {
    if (!initialTool) return;
    const blob = new Blob([JSON.stringify(initialTool, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${initialTool.name ?? "tool"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported" });
  }, [initialTool, toast]);

  const handleSaveAgentPrompt = React.useCallback(() => {
    if (!isEditing) return;
    const currentSchema = (initialTool?.functionSchema as any) ?? {};
    agentPromptMutation.mutate({
      id: initialTool.id,
      functionSchema: { ...currentSchema, "x-agentPrompt": agentPromptDraft },
    });
  }, [isEditing, initialTool, agentPromptDraft, agentPromptMutation]);

  const systemToolsQuery = trpc.tool.systemList.useQuery({
    query: systemToolsListOpen ? toolStepSidebarQuery || undefined : undefined,
  }, { staleTime: 60_000, gcTime: 5 * 60_000 });
  const [isSyncingTools, setIsSyncingTools] = React.useState(false);
  const syncSystemTools = React.useCallback(async () => {
    setIsSyncingTools(true);
    try {
      const base = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_SERVER_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3002") : "";
      const res = await fetch(`${base}/api/sync-tools`, { method: "POST" });
      if (res.ok) {
        await systemToolsQuery.refetch();
        toast({ title: "Tools synced", description: "System tools have been synced." });
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Sync failed", description: err?.error || res.statusText, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Sync failed", description: e?.message || "Could not reach sync endpoint.", variant: "destructive" });
    } finally {
      setIsSyncingTools(false);
    }
  }, [systemToolsQuery, toast]);

  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isResizingSidebar) return;
      const w = window.innerWidth - e.clientX;
      if (w > 320 && w < 900) setSidebarWidth(w);
    };
    const onUp = () => setIsResizingSidebar(false);
    if (isResizingSidebar) {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isResizingSidebar]);

  const [inputs, setInputs] = React.useState<BuilderInputField[]>(() => {
    const fn = initialTool?.functionSchema as any;
    const props = fn?.parameters?.properties || initialTool?.params_schema?.properties || {};
    const required: string[] = fn?.parameters?.required || initialTool?.params_schema?.required || [];
    return Object.keys(props).map((key) => ({
      name: key,
      type: (props[key].type as any) || "string",
      description: props[key].description as string | undefined,
      required: required.includes(key),
      uiType: inferUiTypeFromProp(props[key]),
      fillMode: (props[key]?.["x-fillMode"] as InputFillMode | undefined) ?? "agent",
      defaultValue: props[key]?.default,
      options: Array.isArray(props[key]?.enum) ? (props[key].enum as string[]) : undefined,
      jsonSchema: props[key]?.["x-jsonSchema"],
    }));
  });

  const [outputMode, setOutputMode] = React.useState<OutputMode>(
    () => ((initialTool?.functionSchema as any)?.["x-outputMode"] as OutputMode) ?? "last_step"
  );

  const [showOutputsSidebarPicker, setShowOutputsSidebarPicker] = React.useState(false);
  const outputsPickerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (outputsPickerRef.current && !outputsPickerRef.current.contains(event.target as globalThis.Node)) {
        setShowOutputsSidebarPicker(false);
      }
    }
    if (showOutputsSidebarPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showOutputsSidebarPicker]);

  const [outputs, setOutputs] = React.useState<BuilderOutputField[]>(() => {
    const fn = initialTool?.functionSchema as any;
    const props = fn?.returns?.properties || initialTool?.output_schema?.properties || {};
    return Object.keys(props).map((key) => ({
      name: key,
      type: (props[key].type as any) || "string",
      description: props[key].description as string | undefined,
      expression: props[key]?.["x-expression"] as string | undefined,
      source: props[key]?.["x-source"] as string | undefined,
      sourceLabel: props[key]?.["x-sourceLabel"] as string | undefined,
    }));
  });

  const [steps, setSteps] = React.useState<BuilderStep[]>(() => {
    const rawSteps = (initialTool?.steps as any[]) || (initialTool?.transformations?.steps as any[]) || [];
    return rawSteps.map((s) => {
      let type: StepType = "SYSTEM_TOOL";
      if (s.type === "LLM" || s.transformation === "prompt_completion") type = "LLM";
      else if (s.type === "API" || s.transformation === "api_call") type = "API";
      else if (s.type === "LOOP" || s.transformation === "loop") type = "LOOP";
      else if (s.type === "BRANCH" || s.transformation === "branch") type = "BRANCH";
      else if (s.type === "PYTHON" || s.transformation === "python_code_transformation") type = "PYTHON";
      else if (s.type === "JAVASCRIPT" || s.transformation === "javascript_code_transformation") type = "JAVASCRIPT";
      else if (s.type) type = s.type as StepType;

      const configObj = s.params || s.config || {};
      // Ensure kind is present for structural steps if it's missing but we inferred the type
      if (type === "LOOP" && !configObj.kind) configObj.kind = "LOOP";
      if (type === "BRANCH" && !configObj.kind) configObj.kind = "BRANCH";
      if (type === "PYTHON" && !configObj.kind) configObj.kind = "PYTHON";
      if (type === "JAVASCRIPT" && !configObj.kind) configObj.kind = "JAVASCRIPT";

      return {
        id: s.id || s.name || crypto.randomUUID(),
        name: s.name || "",
        type,
        config: JSON.stringify(configObj, null, 2),
        varName: s.varName || s.variableName || s.name || s.id || toVarName(s.name || "step"),
        kind: configObj.kind,
      };
    });
  });


  const seededDefaultsRef = React.useRef(false);

  // Always include default inputs (Relevance-like): oauth account + sessionId + text.
  React.useEffect(() => {
    if (seededDefaultsRef.current) return;
    // Only auto-seed when creating a new tool and there are no inputs defined yet.
    if (isEditing) return;
    if (inputs.length > 0) return;
    seededDefaultsRef.current = true;
    setInputs([
      {
        name: "oauth_account_id",
        type: "string",
        uiType: "oauth_account",
        fillMode: "manual",
        required: true,
        description: "Connected account used for authorization. Requests will run on behalf of this account.",
      },
      {
        name: "text",
        type: "string",
        uiType: "text",
        fillMode: "agent",
        required: true,
        description: "Text to process for this tool run.",
        defaultValue: "",
      },
      {
        name: "sessionId",
        type: "string",
        uiType: "text",
        fillMode: "agent",
        required: false,
        description: "Optional session id to group related tool runs.",
      },
    ]);
  }, [inputs.length, isEditing]);

  const createMutation = trpc.compositeTool.create.useMutation({
    onSuccess: async (tool) => {
      toast({ title: "Tool created", description: "Your tool was created successfully." });
      await utils.compositeTool.list.invalidate();
      window.history.replaceState(null, "", `/dashboard/tools/${tool.id}`);
    },
    onError: (err) => {
      toast({ title: "Error creating tool", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = trpc.compositeTool.update.useMutation({
    onSuccess: async () => {
      toast({ title: "Tool saved", description: "Changes have been saved." });
      await utils.compositeTool.get.invalidate({ id: initialTool.id });
      await utils.compositeTool.list.invalidate();
    },
    onError: (err) => {
      toast({ title: "Error saving tool", description: err.message, variant: "destructive" });
    },
  });

  const upsert = async () => {
    if (!name.trim()) {
      toast({ title: "Name required", description: "Give your tool a name before saving." });
      return;
    }

    const parameters: any = {
      type: "object",
      properties: {},
      required: [] as string[],
    };
    inputs.forEach((field) => {
      if (!field.name) return;
      parameters.properties[field.name] = {
        type: field.type === "object" || field.type === "array" ? field.type : field.type,
        description: field.description ?? undefined,
        default: field.defaultValue === undefined ? undefined : field.defaultValue,
        enum: field.uiType === "options" && field.options?.length ? field.options : undefined,
        "x-uiType": field.uiType ?? undefined,
        "x-fillMode": field.fillMode ?? undefined,
        "x-jsonSchema": field.jsonSchema ?? undefined,
      };
      if (field.required) parameters.required.push(field.name);
    });

    const returns: any = {
      type: "object",
      properties: {},
    };
    outputs.forEach((field) => {
      if (!field.name) return;
      returns.properties[field.name] = {
        type: field.type,
        description: field.description ?? undefined,
        "x-expression": field.expression ?? (field.source ? `{{${field.source}}}` : undefined),
        "x-source": field.source ?? undefined,
        "x-sourceLabel": field.sourceLabel ?? undefined,
      };
    });

    const functionSchema = {
      name,
      description,
      parameters,
      returns,
      "x-fallback": fallbackText,
      "x-outputMode": outputMode,
    };

    const normalizedSteps = steps.map((s) => {
      let parsedConfig: any = {};
      try {
        parsedConfig = s.config ? JSON.parse(s.config) : {};
      } catch {
        parsedConfig = { raw: s.config };
      }
      return {
        id: s.id,
        name: s.name,
        type: s.type,
        config: parsedConfig,
      };
    });

    if (isEditing) {
      await updateMutation.mutateAsync({
        id: initialTool.id,
        name,
        description,
        category,
        functionSchema,
        steps: normalizedSteps,
      });
    } else {
      await createMutation.mutateAsync({
        workspaceId,
        name,
        description,
        category,
        functionSchema,
        steps: normalizedSteps,
        isPublic: true,
      });
    }
  };

  const addInput = (uiType: InputUiType = "text") => {
    const meta = INPUT_TYPE_OPTIONS.find((o) => o.value === uiType) ?? INPUT_TYPE_OPTIONS[0];
    setInputs((prev) => [
      ...prev,
      {
        name: "",
        description: "",
        required: false,
        uiType,
        fillMode: uiType === "oauth_account" || uiType === "api_key" ? "manual" : "agent",
        type: meta.baseType,
        defaultValue: undefined,
      },
    ]);
  };

  const addOutput = () => {
    setOutputs((prev) => [...prev, { name: "", type: "string" }]);
  };

  const addOutputFromSource = React.useCallback(
    (source: string, sourceLabel: string, name: string, type: string) => {
      setOutputs((prev) => {
        if (prev.some((o) => o.source === source)) return prev;
        return [...prev, { name, type: type as any, source, sourceLabel, expression: `{{${source}}}` }];
      });
    },
    []
  );

  const removeOutput = React.useCallback((idx: number) => {
    setOutputs((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const addCustomOutput = React.useCallback(() => {
    setOutputs((prev) => [...prev, { name: "", type: "string" as const, expression: "" }]);
  }, []);



  const {
    isRunningTool,
    runHistory,
    setRunHistory,
    selectedRunId,
    setSelectedRunId,
    runInput,
    setRunInput,
    selectedRun,
    liveRunState,
    runCompositeTool: baseRunCompositeTool,
  } = useToolRun({ initialTool, inputs });

  const runCompositeTool = React.useCallback(
    (opts?: any) => {
      // Don't switch layout directly anymore, just let it run.
      // The user wants to see the node run state ON THE CANVAS!
      baseRunCompositeTool(opts);
    },
    [baseRunCompositeTool]
  );

  const buildVarTree = React.useCallback((beforeStepIndex: number): VarTreeEntry[] => {
    const vt: VarTreeEntry[] = [];
    if (inputs.length > 0) {
      vt.push({
        nodeId: "inputs",
        nodeName: "Inputs",
        nodeType: "inputs",
        sections: [
          {
            id: "inputs",
            label: "Input fields",
            leaves: inputs.map((inp) => ({
              value: `inputs.${inp.name}`,
              label: inp.name,
              field: inp.name,
              type:
                inp.type === "number"
                  ? "Number"
                  : inp.type === "object"
                    ? "Object"
                    : "String",
            })),
          },
        ],
      });
    }
    if (beforeStepIndex > 0) {
      const prevSteps = steps.slice(0, beforeStepIndex);
      prevSteps.forEach((ps) => {
        const identifier = ps.varName || ps.name || ps.id;
        let pcfg: any = {};
        try {
          pcfg = JSON.parse(ps.config || "{}");
        } catch {
          pcfg = {};
        }

        const leaves: VarLeaf[] = [];

        // Parse fields correctly based on step type instead of generic placeholder
        if (ps.type === "LLM") {
          leaves.push({
            value: `steps.${identifier}`,
            label: `${identifier} / response`,
            field: "response",
            type: "String",
          });
        } else if (ps.type === "API") {
          leaves.push({
            value: `steps.${identifier}`,
            label: `${identifier} / body`,
            field: "body",
            type: "Object",
          });
        } else if (ps.type === "PYTHON" || ps.type === "JAVASCRIPT") {
          if (Array.isArray(pcfg.outputFields) && pcfg.outputFields.length > 0) {
            pcfg.outputFields.forEach((field: any) => {
              leaves.push({
                value: `steps.${identifier}.${field.name}`,
                label: `${identifier} / ${field.name}`,
                field: field.name,
                type: field.type ?? "Any",
              });
            });
          } else {
            leaves.push({
              value: `steps.${identifier}`,
              label: `${identifier} / result`,
              field: "result",
              type: "Object",
            });
          }
        } else if (ps.type === "SYSTEM_TOOL") {
          const isCodeStep = pcfg.kind === "PYTHON" || pcfg.kind === "JAVASCRIPT";

          if (isCodeStep && Array.isArray(pcfg.outputFields)) {
            pcfg.outputFields.forEach((field: any) => {
              leaves.push({
                value: `steps.${identifier}.${field.name}`,
                label: `${identifier} / ${field.name}`,
                field: field.name,
                type: field.type ?? "Any",
              });
            });
          } else if (pcfg.toolId) {
            const systemTool = (systemToolsQuery.data ?? []).find((t: any) => t.id === pcfg.toolId);
            const schema = systemTool?.functionSchema as any;
            if (schema?.returns?.properties) {
              const props = schema.returns.properties;
              Object.entries(props).forEach(([key, propSchema]: [string, any]) => {
                leaves.push({
                  value: `steps.${identifier}.${key}`,
                  label: `${identifier} / ${key}`,
                  field: key,
                  type: propSchema.type ?? "Any",
                });
              });
            } else {
              leaves.push({
                value: `steps.${identifier}`,
                label: `${identifier} / result`,
                field: "result",
                type: "Object",
              });
            }
          } else {
            leaves.push({
              value: `steps.${identifier}`,
              label: `${identifier} / result`,
              field: "result",
              type: "Any",
            });
          }
        } else {
          // Fallback for LOOP, BRANCH, etc.
          leaves.push({
            value: `steps.${identifier}`,
            label: `${identifier} / result`,
            field: "result",
            type: "Any",
          });
        }

        vt.push({
          nodeId: ps.id,
          nodeName: ps.name || "Previous step",
          nodeType: "tool",
          sections: [
            {
              id: "outputs",
              label: "Outputs",
              leaves,
            },
          ],
        });
      });
    }
    return vt;
  }, [inputs, steps, systemToolsQuery.data]);

  const doInsertStep = React.useCallback((created: BuilderStep) => {
    setSteps((prev) => {
      if (!pendingBranchStep) return [...prev, created];

      const { branchStepId, branchId, insertIndex } = pendingBranchStep;

      // Inserting into the main flow
      if (!branchStepId || !branchId) {
        if (typeof insertIndex === "number") {
          const next = [...prev];
          next.splice(insertIndex, 0, created);
          return next;
        }
        return [...prev, created];
      }

      // Inserting into a branch
      return prev.map((s) => {
        if (s.id !== branchStepId) return s;
        let cfg: any = {};
        try { cfg = JSON.parse(s.config || "{}"); } catch { }
        const branches = (cfg.branches ?? []).map((b: any) => {
          if (b.id !== branchId) return b;
          const currentSteps = b.steps ?? [];
          if (typeof insertIndex === "number") {
            const nextInner = [...currentSteps];
            nextInner.splice(insertIndex, 0, created);
            return { ...b, steps: nextInner };
          }
          return { ...b, steps: [...currentSteps, created] };
        });
        return { ...s, config: JSON.stringify({ ...cfg, branches }, null, 2) };
      });
    });
    setPendingBranchStep(null);
  }, [pendingBranchStep, setSteps]);

  const addStepFromLibrary = (libId: string) => {
    const item = STEP_LIBRARY.find((s) => s.id === libId);
    if (!item) return;
    const nextIndex = steps.length + 1;
    const stepName = `${item.label} ${nextIndex}`;
    const nextConfig = JSON.stringify(item.defaultConfig ?? {}, null, 2);
    if (replaceTargetStepId) {
      setSteps((prev) =>
        prev.map((s) =>
          s.id === replaceTargetStepId
            ? {
              ...s,
              type: item.type,
              name: stepName,
              varName: toVarName(stepName),
              config: nextConfig,
            }
            : s,
        ),
      );
      setReplaceTargetStepId(null);
      setToolStepSidebarOpen(false);
      return;
    }
    doInsertStep({
      id: crypto.randomUUID(),
      name: stepName,
      type: item.type,
      varName: toVarName(stepName),
      config: nextConfig,
    });
  };

  /** Add a new branch column to an existing Branch step (Branch C, D, 窶ｦ). */
  const addBranchColumn = React.useCallback((branchStepId: string) => {
    setSteps((prev) => prev.map((s) => {
      if (s.id !== branchStepId) return s;
      let cfg: any = {};
      try { cfg = JSON.parse(s.config || "{}"); } catch { }
      const existing: any[] = cfg.branches ?? [];
      const letter = String.fromCharCode(65 + existing.length); // A竊達竊辰窶ｦ
      const newBranch = { id: letter.toLowerCase(), label: `Branch ${letter}`, condition: "", steps: [], assessmentMode: "rules" };
      return { ...s, config: JSON.stringify({ ...cfg, branches: [...existing, newBranch] }, null, 2) };
    }));
  }, []);

  const deleteStep = React.useCallback((stepId: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== stepId));
    if (selectedStepId === stepId) {
      setSelectedStepId(null);
      setSelectedNode("inputs");
      setActivePanelTab("configure");
    }
  }, [selectedStepId]);

  const deleteBranchLogic = React.useCallback((branchStepId: string, branchId: string) => {
    setSteps((prev) => {
      const step = prev.find((s) => s.id === branchStepId);
      if (!step) return prev;
      let cfg: any = {};
      try { cfg = JSON.parse(step.config || "{}"); } catch { }
      const currentBranches = cfg.branches || [];
      if (currentBranches.length <= 2) {
        toast({
          description: "Branch steps must have at least two branches",
          variant: "destructive"
        });
        return prev;
      }
      return prev.map((s) => {
        if (s.id !== branchStepId) return s;
        const newBranches = currentBranches.filter((b: any) => b.id !== branchId);
        return { ...s, config: JSON.stringify({ ...cfg, branches: newBranches }, null, 2) };
      });
    });
  }, [toast]);

  const updateBranchLabel = React.useCallback((branchStepId: string, branchId: string, newLabel: string) => {
    setSteps((prev) => prev.map((s) => {
      if (s.id !== branchStepId) return s;
      let cfg: any = {};
      try { cfg = JSON.parse(s.config || "{}"); } catch { }
      const branches = (cfg.branches ?? []).map((b: any) => {
        if (b.id !== branchId) return b;
        return { ...b, label: newLabel };
      });
      return { ...s, config: JSON.stringify({ ...cfg, branches }, null, 2) };
    }));
  }, []);

  const updateStepName = React.useCallback((stepId: string, newName: string) => {
    setSteps((prev) =>
      prev.map((s) => {
        if (s.id !== stepId) return s;
        return { ...s, name: newName, varName: toVarName(newName) };
      })
    );
  }, []);

  const openToolStepSidebar = React.useCallback((target?: { branchStepId?: string; branchId?: string; insertIndex?: number }) => {
    setPendingBranchStep(target ?? null);
    setReplaceTargetStepId(null);
    setSidebarOpen(true);
    setToolStepSidebarOpen(true);
    setSystemToolsListOpen(false);
    setInputSidebarOpen(false);
    setSelectedInputField(null);
    setToolStepSidebarQuery("");
  }, []);

  const openReplaceSidebar = React.useCallback((stepId: string) => {
    setReplaceTargetStepId(stepId);
    setPendingBranchStep(null);
    setSidebarOpen(true);
    setToolStepSidebarOpen(true);
    setSystemToolsListOpen(false);
    setInputSidebarOpen(false);
    setSelectedInputField(null);
    setToolStepSidebarQuery("");
  }, []);

  const addSystemToolStep = React.useCallback((tool: any) => {
    const nextIndex = steps.length + 1;
    const stepName = tool?.displayName ?? tool?.name ?? `System tool ${nextIndex}`;
    if (replaceTargetStepId) {
      setSteps((prev) =>
        prev.map((s) =>
          s.id === replaceTargetStepId
            ? {
              ...s,
              type: "SYSTEM_TOOL" as StepType,
              name: stepName,
              varName: toVarName(stepName),
              config: JSON.stringify({ toolId: tool.id, input: {} }, null, 2),
            }
            : s,
        ),
      );
      setReplaceTargetStepId(null);
    } else {
      const newId = crypto.randomUUID();
      doInsertStep({
        id: newId,
        name: stepName,
        type: "SYSTEM_TOOL" as StepType,
        varName: toVarName(stepName),
        config: JSON.stringify({ toolId: tool.id, input: {} }, null, 2),
      });
      setSelectedNode("step");
      setSelectedStepId(newId);
      setActivePanelTab("configure");
    }
    setToolStepSidebarOpen(false);
    setSystemToolsListOpen(false);
  }, [steps.length, doInsertStep, replaceTargetStepId]);

  const updateStepConfig = React.useCallback((stepId: string, updater: (cfg: any) => any) => {
    setSteps((prev) =>
      prev.map((s) => {
        if (s.id !== stepId) return s;
        let cfg: any = {};
        try {
          cfg = JSON.parse(s.config || "{}");
        } catch {
          cfg = {};
        }
        const nextCfg = updater(cfg) ?? cfg;
        return { ...s, config: JSON.stringify(nextCfg, null, 2) };
      }),
    );
  }, []);

  const moveStep = React.useCallback((stepId: string, dir: -1 | 1) => {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.id === stepId);
      if (idx < 0) return prev;
      const nextIdx = idx + dir;
      if (nextIdx < 0 || nextIdx >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.splice(nextIdx, 0, item);
      return next;
    });
  }, []);

  const duplicateStep = React.useCallback((stepId: string) => {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.id === stepId);
      if (idx < 0) return prev;
      const original = prev[idx];
      const newId = crypto.randomUUID();
      const baseName = (original.name || "Step").trim();
      const copyName = baseName.endsWith(" copy") ? `${baseName} 2` : `${baseName} copy`;
      const dup: BuilderStep = {
        ...original,
        id: newId,
        name: copyName,
        varName: toVarName(copyName),
        config: original.config,
      };
      const next = [...prev];
      next.splice(idx + 1, 0, dup);
      return next;
    });
  }, []);

  const toggleStepDisabled = React.useCallback((stepId: string) => {
    updateStepConfig(stepId, (cfg) => ({ ...cfg, disabled: !cfg?.disabled }));
  }, [updateStepConfig]);

  const toggleStepSkipped = React.useCallback((stepId: string) => {
    updateStepConfig(stepId, (cfg) => ({ ...cfg, skipped: !cfg?.skipped }));
  }, [updateStepConfig]);

  const toggleStepStickyNote = React.useCallback((stepId: string) => {
    updateStepConfig(stepId, (cfg) => ({
      ...cfg,
      stickyNoteVisible: !cfg?.stickyNoteVisible,
      stickyNoteContent: cfg?.stickyNoteContent ?? "",
    }));
  }, [updateStepConfig]);

  const updateStepStickyContent = React.useCallback((stepId: string, content: string) => {
    updateStepConfig(stepId, (cfg) => ({ ...cfg, stickyNoteContent: content }));
  }, [updateStepConfig]);

  const applyToolOps = React.useCallback(
    (ops: ToolOp[]) => {
      for (const op of ops) {
        try {
          if (op.op === "updateToolMeta") {
            if (typeof op.patch.name === "string") setName(op.patch.name);
            if (typeof op.patch.description === "string") setDescription(op.patch.description);
            if (typeof op.patch.category === "string") setCategory(op.patch.category);
            continue;
          }

          if (op.op === "addStep") {
            const newId = op.step.id ?? crypto.randomUUID();
            const stepName = op.step.name;
            const varName = op.step.varName ?? toVarName(stepName);
            const configStr = JSON.stringify(op.step.config ?? {}, null, 2);
            const created: BuilderStep = {
              id: newId,
              name: stepName,
              type: op.step.type,
              varName,
              config: configStr,
            };
            const after = op.afterStepId ?? null;
            setSteps((prev) => {
              if (!after) return [...prev, created];
              const idx = prev.findIndex((s) => s.id === after);
              if (idx === -1) return [...prev, created];
              const next = [...prev];
              next.splice(idx + 1, 0, created);
              return next;
            });
            continue;
          }

          if (op.op === "deleteStep") {
            deleteStep(op.stepId);
            continue;
          }

          if (op.op === "moveStep") {
            moveStep(op.stepId, op.direction === "up" ? -1 : 1);
            continue;
          }

          if (op.op === "replaceStep") {
            setSteps((prev) =>
              prev.map((s) => {
                if (s.id !== op.stepId) return s;
                const nextName = op.replacement.name;
                return {
                  ...s,
                  name: nextName,
                  type: op.replacement.type,
                  varName: toVarName(nextName),
                  config: JSON.stringify(op.replacement.config ?? {}, null, 2),
                };
              }),
            );
            continue;
          }

          if (op.op === "updateStep") {
            setSteps((prev) =>
              prev.map((s) => {
                if (s.id !== op.stepId) return s;
                const nextName = typeof op.patch.name === "string" ? op.patch.name : s.name;
                return {
                  ...s,
                  name: nextName,
                  type: op.patch.type ?? s.type,
                  varName:
                    typeof op.patch.varName === "string"
                      ? op.patch.varName
                      : typeof op.patch.name === "string"
                        ? toVarName(op.patch.name)
                        : s.varName,
                  config:
                    op.patch.config !== undefined
                      ? JSON.stringify(op.patch.config ?? {}, null, 2)
                      : s.config,
                };
              }),
            );
            continue;
          }
        } catch {
          // ignore individual op failures; keep applying what we can
        }
      }

      toast({
        title: "Applied changes",
        description: "Review the tool and click Save changes to persist.",
      });
    },
    [deleteStep, moveStep, toast],
  );

  const nodeTypes = React.useMemo<NodeTypes>(() => {
    return {
      inputsNode: InputsNode as any,
      stepNode: StepNode as any,
      branchNode: BranchNode as any,
      loopNode: LoopNode as any,
      branchPathNode: BranchPathNode as any,
      branchEndNode: BranchEndNode as any,
      outputsNode: OutputsNode as any,
      stepsEmptyNode: StepsEmptyNode as any,
    };
  }, []);

  const edgeTypes = React.useMemo<EdgeTypes>(() => {
    return {
      plusEdge: PlusEdge as any,
    };
  }, []);

  const computedNodes = React.useMemo<Node<ToolCanvasNodeData>[]>(() => {
    const baseX = 0;
    const baseY = 0;
    // Target visible segment length (px) 窶・every connection line should look this long.
    const SEG = 100;
    // Estimated rendered heights 窶・visible line = nextNode.y - sourceNode.y - sourceNode.height = SEG
    // Each input card is ~220px tall; base expanded header ~100px; add-type bar ~60px
    const inputCardH = 220;


    const nodes: Node<ToolCanvasNodeData>[] = [];

    nodes.push({
      id: "node_inputs",
      type: "inputsNode",
      position: { x: baseX, y: baseY },
      data: {
        kind: "inputs",
        title: "Inputs",
        subtitle: "What you or your agent should pass into this tool",
        runState: liveRunState["node_inputs"],
        inputs,
        viewMode,
        isExpanded: !!expandedNodes["node_inputs"],
        onToggleExpand: () => setExpandedNodes((prev) => ({ ...prev, node_inputs: !prev.node_inputs })),
        onMeasureHeight: (h: number) => setNodeMeasurements((prev) => prev["node_inputs"] === h ? prev : { ...prev, "node_inputs": h }),
        onAddInput: (uiType: InputUiType) => {
          const meta = INPUT_TYPE_OPTIONS.find((o) => o.value === uiType) ?? INPUT_TYPE_OPTIONS[0];
          setInputs((prev) => [
            ...prev,
            {
              name: "",
              description: "",
              required: false,
              uiType,
              fillMode: uiType === "oauth_account" || uiType === "api_key" ? "manual" : "agent",
              type: meta.baseType,
              defaultValue: undefined,
            },
          ]);
        },
        onUpdateInput: (idx: number, patch: Record<string, any>) => {
          setInputs((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
        },
        onDeleteInput: (idx: number) => {
          setInputs((prev) => prev.filter((_, i) => i !== idx));
        },
        onReorderInputs: (newOrder: any[]) => {
          setInputs(newOrder);
        },
        onOpen: () => {
          setSidebarOpen(true);
          setToolStepSidebarOpen(false);
          setSystemToolsListOpen(false);
          setInputSidebarOpen(false);
          setSelectedInputField(null);
          setSelectedNode("inputs");
          setActivePanelTab("configure");
        },
      },
    });

    const getInputsNodeHeight = () => {
      const measured = nodeMeasurements["node_inputs"];
      if (measured && measured > 0) return measured;
      const isExpanded = !!expandedNodes["node_inputs"] && viewMode === "notebook";
      if (!isExpanded) return 72;
      const N = inputs.length;
      if (N === 0) return 135;
      return 140 + N * 255;
    };

    const H_INPUTS = getInputsNodeHeight();
    const gapY = H_INPUTS + SEG;

    if (steps.length === 0) {
      nodes.push({
        id: "node_steps_empty",
        type: "stepsEmptyNode",
        position: { x: baseX, y: baseY + gapY },
        data: {
          kind: "step",
          title: "Steps",
          subtitle: "Define the logic of your tool. Chain together LLM prompts, call APIs, run code and more.",
          viewMode,
          onAddStep: () => openToolStepSidebar({ insertIndex: 0 }),
          onQuickAdd: (libId: string) => addStepFromLibrary(libId),
        } as any,
      });
      return nodes;
    }

    // Estimated rendered node heights (px) for layout math:
    //   BranchNode 竕・68px, BranchPathNode 竕・56px, BranchEndNode 竕・46px
    // Math: so every path segment (straight or elbow half) equals SEG exactly.
    //   Branch 竊・BranchPath gap   = H_B + 2ﾂｷSEG  竊・midpoint gives SEG on each elbow side
    //   BranchPath 竊・BranchEnd gap = H_P + SEG    竊・straight line equals SEG
    //   BranchEnd 竊・Next gap       = H_E + 2ﾂｷSEG  竊・midpoint convergence gives SEG each side
    // Exact measured heights to guarantee SEG gap
    const BRANCH_SEG = 50;
    const H_B = 62, H_P = 50, H_E = 34;
    const branchOffsetX = viewMode === "notebook" ? 720 : 400;
    const branchToPathGapY = H_B + 2 * BRANCH_SEG;

    // Helper: get actual measured height for a node, falling back to a reasonable default
    const getStepNodeHeight = (stepId: string, s: any, config: any, isLoop: boolean = false) => {
      // Return actual measured height if available
      const measured = nodeMeasurements[stepId];
      if (measured && measured > 0) return measured;

      // Fallback estimates when DOM measurement isn't ready yet
      if (isLoop) {
        const stickyVisible = Boolean(config?.stickyNoteVisible);
        return 230 + (stickyVisible ? 120 : 0);
      }
      const isExpanded = !!expandedNodes[stepId] && viewMode === "notebook";
      if (!isExpanded) return 128;

      const kind = config.kind || s.kind;
      if (s.type === "API") return 475;
      if (kind === "PYTHON" || kind === "JAVASCRIPT") return 330;
      if (s.type === "SYSTEM_TOOL") {
        const tool = systemToolsQuery.data?.find((t: any) => t.id === config.toolId);
        if (tool) {
          const schema = tool.functionSchema as any;
          const params = Object.keys(schema?.parameters?.properties ?? {});
          return params.length === 0 ? 210 : 110 + params.length * 105;
        }
        return 210;
      }
      return 210;
    };

    let currentY = baseY + gapY;

    steps.forEach((s, idx) => {
      let config: { kind?: string; branches?: Array<{ id: string; label: string }> } = {};
      try { config = JSON.parse(s.config || "{}"); } catch { }

      const isDisabled = Boolean((config as any)?.disabled);
      const isSkipped = Boolean((config as any)?.skipped);
      const canMoveUp = idx > 0;
      const canMoveDown = idx < steps.length - 1;

      const isBranch = config.kind === "BRANCH" && Array.isArray(config.branches) && config.branches.length >= 2;
      const isLoop = (config as any)?.kind === "LOOP";
      const branches = isBranch ? config.branches! : [];

      if (isBranch && branches.length >= 2) {
        const stickyVisible = Boolean((config as any)?.stickyNoteVisible);
        const STICKY_H = 120;
        const H_B_BASE = 62;
        const H_B_LOCAL = H_B_BASE + (stickyVisible ? STICKY_H : 0);
        const branchToPathGapYLocal = H_B_LOCAL + 2 * BRANCH_SEG;
        const branchId = `node_branch_${s.id}`;

        let maxBranchHeight = 0;
        branches.forEach((b: any) => {
          const pathId = `node_branch_${s.id}_${b.id}`;
          let currentH = H_P;
          const measuredPath = nodeMeasurements[pathId];
          if (measuredPath && measuredPath > 0) {
            currentH = measuredPath;
          } else if (viewMode === "notebook" && expandedNodes[pathId]) {
            currentH += 180;
          }

          currentH += SEG;

          (b.steps ?? []).forEach((inner: any, iIdx: number) => {
            const innerNodeId = `node_branch_${s.id}_${b.id}_inner_${iIdx}`;
            let branchStepConfig: any = {};
            try { branchStepConfig = JSON.parse(inner.config || "{}"); } catch { }
            const innerH = getStepNodeHeight(innerNodeId, inner, branchStepConfig, false);
            currentH += innerH + SEG;
          });

          if (currentH > maxBranchHeight) maxBranchHeight = currentH;
        });

        const dynamicPathToEndGapY = branchToPathGapYLocal + maxBranchHeight;
        const dynamicBlockAdvance = dynamicPathToEndGapY + H_E + 2 * BRANCH_SEG;

        // Central branch node
        nodes.push({
          id: branchId,
          type: "branchNode",
          position: { x: baseX, y: currentY },
          data: {
            kind: "step",
            title: "Branch",
            stepId: s.id,
            runState: liveRunState[s.id],
            viewMode,
            isSkipped,
            stickyNoteVisible: Boolean((config as any)?.stickyNoteVisible),
            stickyNoteContent: (config as any)?.stickyNoteContent ?? "",
            onToggleSkip: () => toggleStepSkipped(s.id),
            onToggleStickyNote: () => toggleStepStickyNote(s.id),
            onUpdateStickyNote: (content) => updateStepStickyContent(s.id, content),
            onRunUpToHere: () => runCompositeTool({ startStepId: steps[0]?.id }),
            onCopyRunStepSnippet: () => {
              const snippet = `agent.run_step("${s.varName}")`;
              navigator.clipboard.writeText(snippet);
              toast({ title: "Copied", description: "Python run_step snippet copied to clipboard." });
            },
            onReplaceNode: () => openReplaceSidebar(s.id),
            onOpen: () => { setSelectedNode("step"); setSelectedStepId(s.id); setActivePanelTab("configure"); },
            onAddStep: () => openToolStepSidebar({ insertIndex: idx + 1 }),
            onDelete: () => deleteStep(s.id),
            onCopySnippet: () => {
              // Copy to clipboard or trigger toast
              navigator.clipboard.writeText(`agent.run_step("${s.varName}")`);
              toast({ title: "Copied Python Snippet", description: "The snippet has been copied to your clipboard." });
            },
            onRunStep: () => runCompositeTool({ startStepId: s.id }),
            onOpenModal: () => setModalStepId(s.id),
            onUpdateStepName: (newName: string) => updateStepName(s.id, newName),
          },
        });

        // Render each branch column (path node, inner steps, end node)
        branches.forEach((branch: any, bIdx: number) => {
          // Spread columns symmetrically: col 0竊・leftmost, last竊・rightmost
          const totalCols = branches.length;
          const colOffset = (bIdx - (totalCols - 1) / 2) * branchOffsetX;
          const pathNodeId = `node_branch_${s.id}_${branch.id}`;
          const endNodeId = `node_branch_${s.id}_${branch.id}_end`;

          nodes.push({
            id: pathNodeId,
            type: "branchPathNode",
            position: { x: baseX + colOffset, y: currentY + branchToPathGapYLocal },
            data: {
              kind: "step",
              title: branch.label,
              stepId: s.id,
              branchLabel: branch.label,
              branchConfig: branch,
              branchIdx: bIdx,
              otherHasFallback: (config as any)?.branches?.some((b: any, i: number) => i !== bIdx && (b.assessmentMode ?? (i === 1 ? "fallback" : "rules")) === "fallback"),
              varTree: buildVarTree(idx),
              viewMode,
              isExpanded: !!expandedNodes[pathNodeId],
              onToggleExpand: () => setExpandedNodes((prev) => ({ ...prev, [pathNodeId]: !prev[pathNodeId] })),
              onOpen: () => { setSelectedNode("branch_path"); setSelectedStepId(s.id); setSelectedSubBranchId(branch.id); setActivePanelTab("configure"); },
              onDeleteBranch: () => deleteBranchLogic(s.id, branch.id),
              onUpdateBranchLabel: (newLabel) => updateBranchLabel(s.id, branch.id, newLabel),
              onUpdateBranchConfig: (patch: any) => {
                updateStepConfig(s.id, (cfg) => {
                  if (cfg.kind !== "BRANCH" || !Array.isArray(cfg.branches)) return cfg;
                  const branches = cfg.branches.map((b: any) => b.id === branch.id ? { ...b, ...patch } : b);
                  return { ...cfg, branches };
                });
              },
              onMeasureHeight: (h: number) => setNodeMeasurements((prev) => prev[pathNodeId] === h ? prev : { ...prev, [pathNodeId]: h }),
            },
          });

          // Inner steps inside this branch
          let currentInnerY = branchToPathGapYLocal + H_P;
          if (viewMode === "notebook" && expandedNodes[pathNodeId]) currentInnerY += 180;
          currentInnerY += SEG;

          (branch.steps ?? []).forEach((inner: any, iIdx: number) => {
            const innerNodeId = `node_branch_${s.id}_${branch.id}_inner_${iIdx}`;
            let innerConfig: any = {};
            try { innerConfig = inner.config ? JSON.parse(inner.config) : {}; } catch { }
            const toolName = inner.type === "SYSTEM_TOOL"
              ? (systemToolsQuery.data?.find((t: any) => t.id === (inner.config as any)?.toolId)?.name || "System Tool")
              : inner.type === "API" ? "API Request"
                : inner.type === "LLM" ? "Language Model"
                  : "Step";

            nodes.push({
              id: innerNodeId,
              type: "stepNode",
              position: { x: baseX + colOffset, y: currentY + currentInnerY },
              data: {
                kind: "step",
                title: inner.name || "Untitled",
                subtitle: inner.type,
                toolName,
                stepId: s.id,
                stepIndex: iIdx,
                viewMode,
                isExpanded: !!expandedNodes[innerNodeId],
                onToggleExpand: () => setExpandedNodes((prev) => ({ ...prev, [innerNodeId]: !prev[innerNodeId] })),
                onOpen: () => { setSelectedNode("step"); setSelectedStepId(s.id); setActivePanelTab("configure"); },
                onDeleteStep: () => {
                  updateStepConfig(s.id, (cfg) => {
                    if (cfg.kind !== "BRANCH" || !Array.isArray(cfg.branches)) return cfg;
                    const branches = cfg.branches.map((b: any) =>
                      b.id === branch.id
                        ? { ...b, steps: (b.steps || []).filter((_: any, i: number) => i !== iIdx) }
                        : b
                    );
                    return { ...cfg, branches };
                  });
                },
                isDisabled: Boolean((innerConfig as any)?.disabled),
                isSkipped: Boolean((innerConfig as any)?.skipped),
                canMoveUp: iIdx > 0,
                canMoveDown: iIdx < (branch.steps?.length || 0) - 1,
                onMoveUp: iIdx > 0 ? () => {
                  updateStepConfig(s.id, (cfg) => {
                    if (cfg.kind !== "BRANCH" || !Array.isArray(cfg.branches)) return cfg;
                    const branches = cfg.branches.map((b: any) => {
                      if (b.id !== branch.id) return b;
                      const next = [...(b.steps || [])];
                      const [item] = next.splice(iIdx, 1);
                      next.splice(iIdx - 1, 0, item);
                      return { ...b, steps: next };
                    });
                    return { ...cfg, branches };
                  });
                } : undefined,
                onMoveDown: iIdx < (branch.steps?.length || 0) - 1 ? () => {
                  updateStepConfig(s.id, (cfg) => {
                    if (cfg.kind !== "BRANCH" || !Array.isArray(cfg.branches)) return cfg;
                    const branches = cfg.branches.map((b: any) => {
                      if (b.id !== branch.id) return b;
                      const next = [...(b.steps || [])];
                      const [item] = next.splice(iIdx, 1);
                      next.splice(iIdx + 1, 0, item);
                      return { ...b, steps: next };
                    });
                    return { ...cfg, branches };
                  });
                } : undefined,
                onDuplicate: () => {
                  updateStepConfig(s.id, (cfg) => {
                    if (cfg.kind !== "BRANCH" || !Array.isArray(cfg.branches)) return cfg;
                    const branches = cfg.branches.map((b: any) => {
                      if (b.id !== branch.id) return b;
                      const original = (b.steps || [])[iIdx];
                      const baseName = (original.name || "Step").trim();
                      const copyName = baseName.endsWith(" copy") ? `${baseName} 2` : `${baseName} copy`;
                      const dup = {
                        ...original,
                        id: crypto.randomUUID(),
                        name: copyName,
                        varName: toVarName(copyName)
                      };
                      const next = [...(b.steps || [])];
                      next.splice(iIdx + 1, 0, dup);
                      return { ...b, steps: next };
                    });
                    return { ...cfg, branches };
                  });
                },
                onToggleDisabled: () => {
                  updateStepConfig(s.id, (cfg) => {
                    if (cfg.kind !== "BRANCH" || !Array.isArray(cfg.branches)) return cfg;
                    const branches = cfg.branches.map((b: any) => {
                      if (b.id !== branch.id) return b;
                      const next = [...(b.steps || [])];
                      let itemConfig: any = {};
                      try { itemConfig = JSON.parse(next[iIdx].config || "{}"); } catch { }
                      next[iIdx] = { ...next[iIdx], config: JSON.stringify({ ...itemConfig, disabled: !itemConfig?.disabled }) };
                      return { ...b, steps: next };
                    });
                    return { ...cfg, branches };
                  });
                },
                onToggleSkip: () => {
                  updateStepConfig(s.id, (cfg) => {
                    if (cfg.kind !== "BRANCH" || !Array.isArray(cfg.branches)) return cfg;
                    const branches = cfg.branches.map((b: any) => {
                      if (b.id !== branch.id) return b;
                      const next = [...(b.steps || [])];
                      let itemConfig: any = {};
                      try { itemConfig = JSON.parse(next[iIdx].config || "{}"); } catch { }
                      next[iIdx] = { ...next[iIdx], config: JSON.stringify({ ...itemConfig, skipped: !itemConfig?.skipped }) };
                      return { ...b, steps: next };
                    });
                    return { ...cfg, branches };
                  });
                },
                onMeasureHeight: (h: number) => setNodeMeasurements((prev) => prev[innerNodeId] === h ? prev : { ...prev, [innerNodeId]: h }),
              },
            });

            const innerH = getStepNodeHeight(innerNodeId, inner, innerConfig, false);
            currentInnerY += innerH + SEG;
          });

          nodes.push({
            id: endNodeId,
            type: "branchEndNode",
            position: { x: baseX + colOffset, y: currentY + dynamicPathToEndGapY },
            data: { kind: "step", title: `${branch.label} end`, stepId: s.id, branchLabel: `${branch.label} end`, viewMode, onOpen: () => { setSelectedNode("step"); setSelectedStepId(s.id); setActivePanelTab("configure"); } },
          });
        });

        currentY += dynamicBlockAdvance;
      } else {
        if (isLoop) {
          const loopCfg: any = config as any;
          const loopVarTree: VarTreeEntry[] = [];

          if (inputs.length > 0) {
            loopVarTree.push({
              nodeId: "inputs",
              nodeName: "Inputs",
              nodeType: "inputs",
              sections: [
                {
                  id: "inputs",
                  label: "Input fields",
                  leaves: inputs
                    .filter((inp) => Boolean(inp.name))
                    .map((inp) => ({
                      value: `inputs.${inp.name}`,
                      label: inp.name,
                      field: inp.name,
                      type:
                        inp.type === "number"
                          ? "Number"
                          : inp.type === "object"
                            ? "Object"
                            : "String",
                    })),
                },
              ],
            });
          }

          if (idx > 0) {
            const prevSteps = steps.slice(0, idx);
            prevSteps.forEach((ps) => {
              const identifier = ps.varName || ps.name || ps.id;
              loopVarTree.push({
                nodeId: ps.id,
                nodeName: ps.name || "Previous step",
                nodeType: "tool",
                sections: [
                  {
                    id: "outputs",
                    label: "Outputs",
                    leaves: [
                      {
                        value: `steps.${identifier}`,
                        label: identifier,
                        field: identifier,
                        type: "Any",
                      },
                    ],
                  },
                ],
              });
            });
          }

          nodes.push({
            id: `node_step_${s.id}`,
            type: "loopNode",
            position: { x: baseX, y: currentY },
            data: {
              kind: "step",
              title: s.name || "Loop",
              subtitle: "Loop",
              stepId: s.id,
              stepIndex: idx,
              runState: liveRunState[s.id],
              varName: s.varName,
              viewMode,
              isSkipped,
              stickyNoteVisible: Boolean((config as any)?.stickyNoteVisible),
              stickyNoteContent: (config as any)?.stickyNoteContent ?? "",
              onToggleSkip: () => toggleStepSkipped(s.id),
              onToggleStickyNote: (() => toggleStepStickyNote(s.id)) as any,
              onUpdateStickyNote: ((content) => updateStepStickyContent(s.id, content)) as any,
              onRunUpToHere: () => runCompositeTool({ startStepId: steps[0]?.id }),
              onCopyRunStepSnippet: () => {
                const snippet = `agent.run_step("${s.varName}")`;
                navigator.clipboard.writeText(snippet);
                toast({ title: "Copied", description: "Python run_step snippet copied to clipboard." });
              },
              onReplaceNode: () => openReplaceSidebar(s.id),
              onDeleteStep: () => deleteStep(s.id),
              isDisabled,
              canMoveUp,
              canMoveDown,
              onMoveUp: canMoveUp ? () => moveStep(s.id, -1) : undefined,
              onMoveDown: canMoveDown ? () => moveStep(s.id, 1) : undefined,
              onDuplicate: () => duplicateStep(s.id),
              onToggleDisabled: () => toggleStepDisabled(s.id),
              loopOver: loopCfg?.over ?? "",
              loopOverLabel: loopCfg?.overLabel ?? "",
              loopProcessing: (loopCfg?.processing as any) ?? "sequential",
              loopVarTree,
              onUpdateLoop: (patch) => {
                updateStepConfig(s.id, (cfg) => ({
                  ...cfg,
                  kind: "LOOP",
                  over: patch.over ?? cfg.over ?? "",
                  overLabel: patch.overLabel ?? cfg.overLabel ?? "",
                  processing: patch.processing ?? cfg.processing ?? "sequential",
                }));
              },
              onMeasureHeight: (h: number) => setNodeMeasurements((prev) => prev[s.id] === h ? prev : { ...prev, [s.id]: h }),
              onUpdateStepName: (newName: string) => updateStepName(s.id, newName),
              onOpen: () => {
                setSelectedStepId(s.id);
                setSelectedNode("step");
                setSidebarOpen(true);
                setToolStepSidebarOpen(false);
                setActivePanelTab("configure");
              },
              onOpenModal: () => {
                setSelectedStepId(s.id);
                setSelectedNode("step");
                setSidebarOpen(true);
                setToolStepSidebarOpen(false);
                setActivePanelTab("configure");
              },
            },
          });

          // Render inner steps for Loop
          const loopSteps = Array.isArray(loopCfg.steps) ? loopCfg.steps : [];

          let currentInnerYLoop = currentY + getStepNodeHeight(s.id, s, config, true) + SEG;

          loopSteps.forEach((inner: any, iIdx: number) => {
            const innerNodeId = `node_loop_${s.id}_inner_${iIdx}`;
            const innerConfig = inner.config ? JSON.parse(inner.config) : {};
            const subKind = innerConfig.kind || inner.kind;
            const subToolName = inner.type === "SYSTEM_TOOL"
              ? (systemToolsQuery.data?.find((t: any) => t.id === innerConfig.toolId)?.name || "System Tool")
              : inner.type === "API" ? "API Request"
                : subKind === "PYTHON" ? "Python Script"
                  : subKind === "JAVASCRIPT" ? "JavaScript"
                    : inner.type === "LLM" ? (innerConfig.model || "LLM")
                      : "Step";

            nodes.push({
              id: innerNodeId,
              type: "stepNode",
              position: { x: baseX, y: currentInnerYLoop },
              data: {
                kind: "step",
                title: inner.name || "Untitled inner step",
                subtitle: subKind === "PYTHON" ? "Python code" : subKind === "JAVASCRIPT" ? "JavaScript code" : inner.type,
                toolName: subToolName,
                stepId: s.id,
                stepIndex: iIdx,
                viewMode,
                onOpen: () => { setSelectedNode("step"); setSelectedStepId(s.id); setActivePanelTab("configure"); },
                onDeleteStep: () => {
                  updateStepConfig(s.id, (old) => ({
                    ...old,
                    steps: (old.steps || []).filter((_: any, idx: number) => idx !== iIdx)
                  }));
                },
                isDisabled: Boolean((innerConfig as any)?.disabled),
                isSkipped: Boolean((innerConfig as any)?.skipped),
                canMoveUp: iIdx > 0,
                canMoveDown: iIdx < loopSteps.length - 1,
                onMoveUp: iIdx > 0 ? () => {
                  updateStepConfig(s.id, (cfg) => {
                    const next = [...(cfg.steps || [])];
                    const [item] = next.splice(iIdx, 1);
                    next.splice(iIdx - 1, 0, item);
                    return { ...cfg, steps: next };
                  });
                } : undefined,
                onMoveDown: iIdx < loopSteps.length - 1 ? () => {
                  updateStepConfig(s.id, (cfg) => {
                    const next = [...(cfg.steps || [])];
                    const [item] = next.splice(iIdx, 1);
                    next.splice(iIdx + 1, 0, item);
                    return { ...cfg, steps: next };
                  });
                } : undefined,
                onDuplicate: () => {
                  updateStepConfig(s.id, (cfg) => {
                    const next = [...(cfg.steps || [])];
                    const original = next[iIdx];
                    const baseName = (original.name || "Step").trim();
                    const copyName = baseName.endsWith(" copy") ? `${baseName} 2` : `${baseName} copy`;
                    const dup = {
                      ...original,
                      id: crypto.randomUUID(),
                      name: copyName,
                      varName: toVarName(copyName)
                    };
                    next.splice(iIdx + 1, 0, dup);
                    return { ...cfg, steps: next };
                  });
                },
                onToggleDisabled: () => {
                  updateStepConfig(s.id, (cfg) => {
                    const next = [...(cfg.steps || [])];
                    let itemConfig: any = {};
                    try { itemConfig = JSON.parse(next[iIdx].config || "{}"); } catch { }
                    next[iIdx] = { ...next[iIdx], config: JSON.stringify({ ...itemConfig, disabled: !itemConfig?.disabled }) };
                    return { ...cfg, steps: next };
                  });
                },
                onToggleSkip: () => {
                  updateStepConfig(s.id, (cfg) => {
                    const next = [...(cfg.steps || [])];
                    let itemConfig: any = {};
                    try { itemConfig = JSON.parse(next[iIdx].config || "{}"); } catch { }
                    next[iIdx] = { ...next[iIdx], config: JSON.stringify({ ...itemConfig, skipped: !itemConfig?.skipped }) };
                    return { ...cfg, steps: next };
                  });
                },
                onMeasureHeight: (h: number) => setNodeMeasurements((prev) => prev[innerNodeId] === h ? prev : { ...prev, [innerNodeId]: h }),
                onUpdateStepName: (newName: string) => {
                  updateStepConfig(s.id, (old) => {
                    const nextSteps = [...(old.steps || [])];
                    if (nextSteps[iIdx]) {
                      nextSteps[iIdx] = { ...nextSteps[iIdx], name: newName, varName: toVarName(newName) };
                    }
                    return { ...old, steps: nextSteps };
                  });
                },
              },
            });

            const innerH = getStepNodeHeight(innerNodeId, inner, innerConfig, false);
            currentInnerYLoop += innerH + SEG;
          });

          // Removed loop end node logic

          currentY = currentInnerYLoop;
          return;
        }

        const kind = (config as any).kind || s.kind;
        const toolName = s.type === "SYSTEM_TOOL"
          ? (systemToolsQuery.data?.find((t: any) => t.id === (config as any).toolId)?.name || "System Tool")
          : s.type === "API" ? "API Request"
            : kind === "PYTHON" ? "Python Script"
              : kind === "JAVASCRIPT" ? "JavaScript"
                : s.type === "LLM" ? ((config as any).model || "LLM")
                  : "Step";

        nodes.push({
          id: `node_step_${s.id}`,
          type: "stepNode",
          position: { x: baseX, y: currentY },
          data: {
            kind: "step",
            title: s.name || "Untitled step",
            subtitle: kind === "PYTHON" ? "Python code" : kind === "JAVASCRIPT" ? "JavaScript code" : s.type,
            toolName,
            stepId: s.id,
            stepIndex: idx,
            stepConfig: config,
            systemTool: s.type === "SYSTEM_TOOL" ? systemToolsQuery.data?.find((t: any) => t.id === (config as any).toolId) : null,
            varTree: buildVarTree(idx),
            onUpdateStepConfig: (patch: any) => updateStepConfig(s.id, (cfg: any) => ({ ...cfg, ...patch })),
            runState: liveRunState[s.id],
            varName: s.varName,
            viewMode,
            isExpanded: !!expandedNodes[s.id],
            onToggleExpand: () => setExpandedNodes((prev) => ({ ...prev, [s.id]: !prev[s.id] })),
            isDisabled,
            isSkipped,
            canMoveUp,
            canMoveDown,
            onMoveUp: canMoveUp ? () => moveStep(s.id, -1) : undefined,
            onMoveDown: canMoveDown ? () => moveStep(s.id, 1) : undefined,
            onDuplicate: () => duplicateStep(s.id),
            onToggleDisabled: () => toggleStepDisabled(s.id),
            onRunUpToHere: () => runCompositeTool({ startStepId: steps[0]?.id }),
            onDeleteStep: () => deleteStep(s.id),
            onCopyRunStepSnippet: () => {
              const snippet = `agent.run_step("${s.varName}")`;
              navigator.clipboard.writeText(snippet);
              toast({ title: "Copied", description: "Python run_step snippet copied to clipboard." });
            },
            onReplaceNode: () => openReplaceSidebar(s.id),
            onToggleSkip: () => toggleStepSkipped(s.id),
            stickyNoteVisible: Boolean((config as any)?.stickyNoteVisible),
            stickyNoteContent: (config as any)?.stickyNoteContent ?? "",
            onToggleStickyNote: () => toggleStepStickyNote(s.id),
            onUpdateStickyNote: (content) => updateStepStickyContent(s.id, content),
            onOpen: () => {
              setSidebarOpen(true);
              setToolStepSidebarOpen(false);
              setSystemToolsListOpen(false);
              setInputSidebarOpen(false);
              setSelectedInputField(null);
              setSelectedNode("step");
              setSelectedStepId(s.id);
              setActivePanelTab("configure");
            },
            onAddStep: () => openToolStepSidebar({ insertIndex: idx + 1 }),
            onRunStep: () => runCompositeTool({ startStepId: s.id }),
            onOpenModal: () => setModalStepId(s.id),
            onMeasureHeight: (h: number) => setNodeMeasurements((prev) => prev[s.id] === h ? prev : { ...prev, [s.id]: h }),
            onUpdateStepName: (newName: string) => updateStepName(s.id, newName),
          },
        });
        const actualHeight = getStepNodeHeight(s.id, s, config, false);
        currentY += actualHeight + SEG;
      }
    });

    nodes.push({
      id: "node_outputs",
      type: "outputsNode",
      position: { x: baseX, y: currentY },
      data: {
        kind: "outputs",
        title: "Outputs",
        subtitle: "What this tool returns after execution",
        runState: liveRunState["outputs"],
        viewMode,
        isExpanded: !!expandedNodes["node_outputs"],
        onToggleExpand: () => setExpandedNodes((prev) => ({ ...prev, node_outputs: !prev.node_outputs })),
        // output mode + data
        outputs,
        outputMode,
        varTree: buildVarTree(steps.length),
        onSetOutputMode: (mode: "last_step" | "manual") => setOutputMode(mode),
        onAddOutput: (source: string, sourceLabel: string, name: string, type: string) =>
          addOutputFromSource(source, sourceLabel, name, type),
        onRemoveOutput: (idx: number) => removeOutput(idx),
        onAddCustomOutput: () => addCustomOutput(),
        onOpen: () => {
          setSidebarOpen(true);
          setToolStepSidebarOpen(false);
          setSystemToolsListOpen(false);
          setInputSidebarOpen(false);
          setSelectedInputField(null);
          setSelectedNode("outputs");
          setActivePanelTab("configure");
        },
        onOpenModal: () => setOutputsModalOpen(true),
      },
    });

    return nodes;
  }, [steps, viewMode, openToolStepSidebar, liveRunState, expandedNodes, inputs, outputs, outputMode, nodeMeasurements, systemToolsQuery.data, buildVarTree, addOutputFromSource, removeOutput, addCustomOutput]);

  const computedEdges = React.useMemo<Edge[]>(() => {
    const edges: Edge[] = [];
    const connect = (
      source: string,
      target: string,
      onPlus: () => void = () => openToolStepSidebar(),
      sourceHandle?: string,
      targetHandle?: string,
    ) => {
      edges.push({
        id: `edge_${source}_${target}${sourceHandle ? `_${sourceHandle}` : ""}`,
        source,
        target,
        sourceHandle,
        targetHandle,
        type: "plusEdge",
        animated: liveRunState[target]?.status === "running",
        data: { onPlus },
      });
    };

    if (steps.length === 0) {
      connect("node_inputs", "node_steps_empty");
      return edges;
    }

    const getFirstNodeId = (idx: number) => {
      const s = steps[idx];
      let config: { kind?: string; branches?: Array<{ id: string }> } = {};
      try { config = JSON.parse(s.config || "{}"); } catch { }
      if (config.kind === "BRANCH" && (config.branches?.length ?? 0) >= 2) return `node_branch_${s.id}`;
      return `node_step_${s.id}`;
    };

    const getLastNodeIds = (idx: number): string[] => {
      const s = steps[idx];
      let config: { kind?: string; branches?: Array<{ id: string }> } = {};
      try { config = JSON.parse(s.config || "{}"); } catch { }
      if (config.kind === "BRANCH" && Array.isArray(config.branches) && config.branches.length >= 2) {
        return config.branches.map((b) => `node_branch_${s.id}_${b.id}_end`);
      }
      return [`node_step_${s.id}`];
    };

    // Main flow: Inputs 竊・first step, step 竊・step, last step 竊・Outputs
    connect("node_inputs", getFirstNodeId(0), () => openToolStepSidebar({ insertIndex: 0 }));
    for (let i = 0; i < steps.length - 1; i++) {
      const lastIds = getLastNodeIds(i);
      const nextFirst = getFirstNodeId(i + 1);
      for (const lastId of lastIds) {
        connect(lastId, nextFirst, () => openToolStepSidebar({ insertIndex: i + 1 }));
      }
    }
    const lastIds = getLastNodeIds(steps.length - 1);
    for (const lastId of lastIds) {
      connect(lastId, "node_outputs", () => openToolStepSidebar({ insertIndex: steps.length }));
    }

    // Branch-internal edges with context-sensitive onPlus
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      let config: { kind?: string; branches?: Array<{ id: string; label: string; steps?: any[] }> } = {};
      try { config = JSON.parse(s.config || "{}"); } catch { }
      if (config.kind === "BRANCH" && Array.isArray(config.branches) && config.branches.length >= 2) {
        const branchNodeId = `node_branch_${s.id}`;

        config.branches.forEach((branch) => {
          const pathNodeId = `node_branch_${s.id}_${branch.id}`;
          const endNodeId = `node_branch_${s.id}_${branch.id}_end`;
          const innerSteps = branch.steps ?? [];

          // Branch 竊・BranchPath: clicking plus adds a new branch column
          connect(branchNodeId, pathNodeId, () => addBranchColumn(s.id));

          if (innerSteps.length === 0) {
            // No inner steps: BranchPath 竊・BranchEnd, clicking adds an inner step
            connect(pathNodeId, endNodeId, () => openToolStepSidebar({ branchStepId: s.id, branchId: branch.id, insertIndex: 0 }));
          } else {
            // BranchPath 竊・first inner step
            const firstInnerId = `node_branch_${s.id}_${branch.id}_inner_0`;
            connect(pathNodeId, firstInnerId, () => openToolStepSidebar({ branchStepId: s.id, branchId: branch.id, insertIndex: 0 }));
            // Inner step 竊・inner step
            for (let j = 0; j < innerSteps.length - 1; j++) {
              const fromId = `node_branch_${s.id}_${branch.id}_inner_${j}`;
              const toId = `node_branch_${s.id}_${branch.id}_inner_${j + 1}`;
              connect(fromId, toId, () => openToolStepSidebar({ branchStepId: s.id, branchId: branch.id, insertIndex: j + 1 }));
            }
            // Last inner step 竊・BranchEnd
            const lastInnerId = `node_branch_${s.id}_${branch.id}_inner_${innerSteps.length - 1}`;
            connect(lastInnerId, endNodeId, () => openToolStepSidebar({ branchStepId: s.id, branchId: branch.id, insertIndex: innerSteps.length }));
          }
        });
      }
    }

    return edges;
  }, [steps, openToolStepSidebar, addBranchColumn, liveRunState]);

  const selectedStep = React.useMemo(() => steps.find((s) => s.id === selectedStepId), [steps, selectedStepId]);
  const isSidebarTitleEditable =
    !systemToolsListOpen &&
    !inputSidebarOpen &&
    !toolStepSidebarOpen &&
    selectedNode === "step" &&
    !!selectedStepId;
  const sidebarHeaderTitle = React.useMemo(() => {
    if (systemToolsListOpen) return "System Tools";
    if (inputSidebarOpen) return "Configure Input";
    if (toolStepSidebarOpen) return "Select a Tool Step";
    if (selectedNode === "inputs") return "Inputs";
    if (selectedNode === "outputs") return "Outputs";
    if (selectedNode === "branch_path") {
      const step = steps.find((s) => s.id === selectedStepId);
      let cfg: any = {};
      try { cfg = JSON.parse(step?.config || "{}"); } catch { }
      const branch = (cfg.branches || []).find((b: any) => b.id === selectedSubBranchId);
      return `${branch?.label || "Branch"} Configuration`;
    }
    if (selectedNode === "step") return selectedStep?.name || "Step";
    return "Step";
  }, [inputSidebarOpen, selectedNode, selectedStep?.name, selectedStepId, selectedSubBranchId, steps, systemToolsListOpen, toolStepSidebarOpen]);
  React.useEffect(() => {
    if (isSidebarTitleEditable) {
      setSidebarTitleDraft(selectedStep?.name || "");
      return;
    }
    setIsSidebarTitleEditing(false);
    setSidebarTitleDraft("");
  }, [isSidebarTitleEditable, selectedStep?.id, selectedStep?.name]);
  const selectedStepTool = React.useMemo(() => {
    if (selectedStep?.type !== "SYSTEM_TOOL") return null;
    try {
      const cfg = JSON.parse(selectedStep.config || "{}");
      return (systemToolsQuery.data ?? []).find((t: any) => t.id === cfg.toolId);
    } catch { return null; }
  }, [selectedStep, systemToolsQuery.data]);

  // Modal step
  const modalStep = React.useMemo(() => steps.find((s) => s.id === modalStepId) ?? null, [steps, modalStepId]);
  const modalStepTool = React.useMemo(() => {
    if (!modalStep || modalStep.type !== "SYSTEM_TOOL") return null;
    try {
      const cfg = JSON.parse(modalStep.config || "{}");
      return (systemToolsQuery.data ?? []).find((t: any) => t.id === cfg.toolId) ?? null;
    } catch { return null; }
  }, [modalStep, systemToolsQuery.data]);
  const modalStepIndex = React.useMemo(() => steps.findIndex((s) => s.id === modalStepId), [steps, modalStepId]);
  const modalVarTree = React.useMemo(() => buildVarTree(modalStepIndex >= 0 ? modalStepIndex : 0), [buildVarTree, modalStepIndex]);


  return {
    workspaceId,
    initialTool,
    onClose,
    toast,
    utils,
    router,
    sensors,
    name,
    setName,
    description,
    setDescription,
    category,
    setCategory,
    activePanelTab,
    setActivePanelTab,
    activeTopTab,
    setActiveTopTab,
    settingsOpen,
    setSettingsOpen,
    assistantOpen,
    setAssistantOpen,
    toolIcon,
    setToolIcon,
    selectedNode,
    setSelectedNode,
    selectedSubBranchId,
    setSelectedSubBranchId,
    selectedStepId,
    setSelectedStepId,
    viewMode,
    setViewMode,
    navigatorOpen,
    setNavigatorOpen,
    navigatorQuery,
    setNavigatorQuery,
    toolStepSidebarOpen,
    setToolStepSidebarOpen,
    toolStepSidebarQuery,
    setToolStepSidebarQuery,
    systemToolsListOpen,
    setSystemToolsListOpen,
    replaceTargetStepId,
    setReplaceTargetStepId,
    inputSidebarOpen,
    setInputSidebarOpen,
    selectedInputField,
    setSelectedInputField,
    pendingBranchStep,
    setPendingBranchStep,
    sidebarOpen,
    setSidebarOpen,
    sidebarWidth,
    setSidebarWidth,
    isResizingSidebar,
    setIsResizingSidebar,
    fallbackText,
    setFallbackText,
    expandedNodes,
    setExpandedNodes,
    nodeMeasurements,
    setNodeMeasurements,
    modalStepId,
    setModalStepId,
    outputsModalOpen,
    setOutputsModalOpen,
    isSidebarTitleEditing,
    setIsSidebarTitleEditing,
    sidebarTitleDraft,
    setSidebarTitleDraft,
    isGuardOpen,
    setIsGuardOpen,
    isPublishModalOpen,
    setIsPublishModalOpen,
    bugReportOpen,
    setBugReportOpen,
    supportModalOpen,
    setSupportModalOpen,
    versionsOpen,
    setVersionsOpen,
    deleteOpen,
    setDeleteOpen,
    cloneOpen,
    setCloneOpen,
    cloneName,
    setCloneName,
    agentPromptOpen,
    setAgentPromptOpen,
    agentPromptDraft,
    setAgentPromptDraft,
    linkCopied,
    setLinkCopied,
    showOutputsSidebarPicker,
    setShowOutputsSidebarPicker,
    isSyncingTools,
    setIsSyncingTools,
    inputs,
    setInputs,
    outputMode,
    setOutputMode,
    outputs,
    setOutputs,
    steps,
    setSteps,
    isEditing,
    cloneMutation,
    deleteMutation,
    agentPromptMutation,
    handleShare,
    handleCopyLink,
    handleExport,
    handleSaveAgentPrompt,
    handlePublishClick,
    systemToolsQuery,
    syncSystemTools,
    createMutation,
    updateMutation,
    upsert,
    addInput,
    addOutput,
    addOutputFromSource,
    removeOutput,
    addCustomOutput,
    isRunningTool,
    runHistory,
    setRunHistory,
    selectedRunId,
    setSelectedRunId,
    runInput,
    setRunInput,
    selectedRun,
    liveRunState,
    runCompositeTool,
    buildVarTree,
    addStepFromLibrary,
    addBranchColumn,
    deleteStep,
    deleteBranchLogic,
    updateBranchLabel,
    updateStepName,
    openToolStepSidebar,
    openReplaceSidebar,
    addSystemToolStep,
    updateStepConfig,
    moveStep,
    duplicateStep,
    toggleStepDisabled,
    toggleStepSkipped,
    toggleStepStickyNote,
    updateStepStickyContent,
    applyToolOps,
    nodeTypes,
    edgeTypes,
    computedNodes,
    computedEdges,
    selectedStep,
    isSidebarTitleEditable,
    sidebarHeaderTitle,
    selectedStepTool,
    modalStep,
    modalStepTool,
    modalStepIndex,
    modalVarTree,
  };
}

export type ToolFlowBuilderApi = ReturnType<typeof useToolFlowBuilder>;
