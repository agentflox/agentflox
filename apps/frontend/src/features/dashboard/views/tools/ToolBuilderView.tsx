"use client";

import React from "react";
import {
  ChevronRight,
  GitBranch,
  MoreHorizontal,
  MoreVertical,
  Play,
  Plus,
  Maximize2,
  Trash2,
  Code,
  Pencil,
  Settings,
  Settings2,
  X,
  Search,
  Bot,
  Wrench,
  MessageCircle,
  Files,
  Share2,
  Lock,
  Link2,
  Hammer,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Copy,
  CircleSlash,
  Repeat,
  SkipForward,
  StickyNote,
  Info,
  Braces,
  Code2,
  CornerDownRight,
  ExternalLink,
  Sparkles,
  List,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ToolEditorAssistantPanel } from "@/components/assistant/ToolEditorAssistantPanel";
import type { ToolOp } from "@/components/assistant/editorOps";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Panel,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  type EdgeProps,
  getStraightPath,
  EdgeLabelRenderer,
  Handle,
  Position,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BACKEND_URL } from "@/entities/agents/hooks/useAgentStream";
import { fetchAuthToken } from "@/utils/backend-request";
import { VariableSelectionModal } from "@/entities/tools/components/builder/VariableSelectionModal";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableSidebarInputWrapper } from '@/entities/tools/components/builder/nodes/InputsNode';
import {
  type StepType,
  type BuilderStep,
  type InputFillMode,
  type InputUiType,
  type BuilderInputField,
  type BuilderOutputField,
  type OutputMode,
  type BranchConditionRule,
  type BranchConditionGroup,
  type VarLeaf,
  type VarSection,
  type VarTreeEntry,
  type BranchConditionOperator,
  type ToolCanvasNodeData,
} from "@/entities/tools/types/builder";
import {
  BRANCH_OPERATORS,
  STEP_LIBRARY,
  INPUT_TYPE_OPTIONS,
} from "@/entities/tools/constants/builder";
import {
  toVarName,
  inferUiTypeFromProp,
  operatorHasRightValue,
} from "@/entities/tools/utils/builder";
import { BranchConditionRuleRow } from "@/entities/tools/components/builder/BranchConditionRuleRow";
import { InputsNode } from "@/entities/tools/components/builder/nodes/InputsNode";
import { OutputsNode, InlineVarTree, typeIcon, typeFromLabel } from "@/entities/tools/components/builder/nodes/OutputsNode";
import { StepNode } from "@/entities/tools/components/builder/nodes/StepNode";
import { BranchNode } from "@/entities/tools/components/builder/nodes/BranchNode";
import { LoopNode } from "@/entities/tools/components/builder/nodes/LoopNode";
import { BranchPathNode } from "@/entities/tools/components/builder/nodes/BranchPathNode";
import { BranchEndNode } from "@/entities/tools/components/builder/nodes/BranchEndNode";
import { StepsEmptyNode } from "@/entities/tools/components/builder/nodes/StepsEmptyNode";
import { PlusEdge } from "@/entities/tools/components/builder/edges/PlusEdge";
import { ToolFlowCanvas } from "@/entities/tools/components/builder/ToolFlowCanvas";
import { useToolRun } from "./hooks/useToolRun";
import { ToolRunView } from "./components/ToolRunView";
import { StepDetailModal } from "@/entities/tools/components/builder/StepDetailModal";
import { OutputsDetailModal } from "@/entities/tools/components/builder/OutputsDetailModal";
import { LoopDetailModal } from "@/entities/tools/components/builder/LoopDetailModal";
import { useMarketplaceGuard } from "@/features/marketplace/hooks/useMarketplaceGuard";
import { MarketplaceGuardDialog } from "@/features/marketplace/components/MarketplaceGuardDialog";
import { PublishEntityModal } from "@/features/marketplace/components/PublishEntityModal";
import { Globe } from "lucide-react";

export type ToolBuilderViewProps = {
  workspaceId: string;
  initialTool?: any | null;
  onClose?: () => void;
};

export function ToolBuilderView({ workspaceId, initialTool, onClose }: ToolBuilderViewProps) {
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

  const handlePublishClick = () => {
    checkProfileAndProceed(() => {
        setIsPublishModalOpen(true);
    });
  };

  const systemToolsQuery = trpc.tool.systemList.useQuery({
    query: systemToolsListOpen ? toolStepSidebarQuery || undefined : undefined,
  });
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
      if (outputsPickerRef.current && !outputsPickerRef.current.contains(event.target as Node)) {
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

  const isEditing = !!initialTool?.id;
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

        let leaves: VarLeaf[] = [];

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
            if (systemTool?.functionSchema?.returns?.properties) {
              const props = systemTool.functionSchema.returns.properties;
              Object.entries(props).forEach(([key, schema]: [string, any]) => {
                leaves.push({
                  value: `steps.${identifier}.${key}`,
                  label: `${identifier} / ${key}`,
                  field: key,
                  type: schema.type ?? "Any",
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

  /** Add a new branch column to an existing Branch step (Branch C, D, …). */
  const addBranchColumn = React.useCallback((branchStepId: string) => {
    setSteps((prev) => prev.map((s) => {
      if (s.id !== branchStepId) return s;
      let cfg: any = {};
      try { cfg = JSON.parse(s.config || "{}"); } catch { }
      const existing: any[] = cfg.branches ?? [];
      const letter = String.fromCharCode(65 + existing.length); // A→B→C…
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
    // Target visible segment length (px) — every connection line should look this long.
    const SEG = 100;
    // Estimated rendered heights — visible line = nextNode.y - sourceNode.y - sourceNode.height = SEG
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
        onAddInput: (uiType: string) => {
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
    //   BranchNode ≈ 68px, BranchPathNode ≈ 56px, BranchEndNode ≈ 46px
    // Math: so every path segment (straight or elbow half) equals SEG exactly.
    //   Branch → BranchPath gap   = H_B + 2·SEG  → midpoint gives SEG on each elbow side
    //   BranchPath → BranchEnd gap = H_P + SEG    → straight line equals SEG
    //   BranchEnd → Next gap       = H_E + 2·SEG  → midpoint convergence gives SEG each side
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
          const params = Object.keys(tool.functionSchema?.parameters?.properties ?? {});
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
            let innerConfig: any = {};
            try { innerConfig = JSON.parse(inner.config || "{}"); } catch { }
            const innerH = getStepNodeHeight(innerNodeId, inner, innerConfig, false);
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
          // Spread columns symmetrically: col 0→ leftmost, last→ rightmost
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
                onDeleteStep: () => deleteStep(inner.id),
                onMeasureHeight: (h: number) => setNodeMeasurements((prev) => prev[innerNodeId] === h ? prev : { ...prev, [innerNodeId]: h }),
              },
            });

            let innerConfig: any = {};
            try { innerConfig = JSON.parse(inner.config || "{}"); } catch { }
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
            onDeleteStep: () => deleteStep(s.id),
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

    // Main flow: Inputs → first step, step → step, last step → Outputs
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

          // Branch → BranchPath: clicking plus adds a new branch column
          connect(branchNodeId, pathNodeId, () => addBranchColumn(s.id));

          if (innerSteps.length === 0) {
            // No inner steps: BranchPath → BranchEnd, clicking adds an inner step
            connect(pathNodeId, endNodeId, () => openToolStepSidebar({ branchStepId: s.id, branchId: branch.id, insertIndex: 0 }));
          } else {
            // BranchPath → first inner step
            const firstInnerId = `node_branch_${s.id}_${branch.id}_inner_0`;
            connect(pathNodeId, firstInnerId, () => openToolStepSidebar({ branchStepId: s.id, branchId: branch.id, insertIndex: 0 }));
            // Inner step → inner step
            for (let j = 0; j < innerSteps.length - 1; j++) {
              const fromId = `node_branch_${s.id}_${branch.id}_inner_${j}`;
              const toId = `node_branch_${s.id}_${branch.id}_inner_${j + 1}`;
              connect(fromId, toId, () => openToolStepSidebar({ branchStepId: s.id, branchId: branch.id, insertIndex: j + 1 }));
            }
            // Last inner step → BranchEnd
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

  /* ── Outputs sidebar panel ── */
  function OutputsSidebarPanel() {
    const [showPicker, setShowPicker] = React.useState(false);
    const pickerRef = React.useRef<HTMLDivElement>(null);
    const varTree = buildVarTree(steps.length);
    const selectedSources = React.useMemo(
      () => new Set(outputs.filter((o) => o.source).map((o) => o.source as string)),
      []
    );

    React.useEffect(() => {
      if (outputMode !== "manual") setShowPicker(false);
    }, []);

    React.useEffect(() => {
      function onOutside(e: MouseEvent) {
        if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
          setShowPicker(false);
        }
      }
      if (showPicker) document.addEventListener("mousedown", onOutside);
      return () => document.removeEventListener("mousedown", onOutside);
    }, [showPicker]);

    return (
      <div className="space-y-0 -mx-4 -mt-4">
        {/* Description */}
        <div className="px-4 pt-3 pb-1">
          <p className="text-[12px] text-zinc-500 leading-relaxed">
            What you or your agent will get back when this tool runs
          </p>
        </div>

        {/* Body */}
        {outputMode === "last_step" ? (
          <div className="py-10 text-center">
            <span
              className="text-[13px] font-medium text-[#7c9fd4] hover:text-[#5b85bd] cursor-pointer transition-colors"
              onClick={() => runCompositeTool()}
            >
              Re-run tool to generate results
            </span>
          </div>
        ) : (
          <div>
            {/* Empty state */}
            {outputs.length === 0 && !showPicker && (
              <div className="px-4 py-2.5 bg-red-50 border-b border-red-100">
                <p className="text-[12px] text-red-500 leading-snug">
                  No output currently configured. Click &ldquo;+ Add&rdquo; to select the outputs for this tool.
                </p>
              </div>
            )}

            {/* Output list */}
            {outputs.length > 0 && (
              <div className="px-4 pt-3 space-y-1.5">
                {outputs.map((field, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 rounded-md bg-violet-50 border border-violet-200 px-3 py-1.5 shadow-sm">
                      {typeIcon(
                        field.type === "string" ? "String"
                          : field.type === "number" ? "Number"
                            : field.type === "boolean" ? "Boolean"
                              : field.type === "object" ? "Object" : "Any"
                      )}
                      <span className="text-[12px] font-mono text-violet-800 font-medium flex-1 truncate">{field.name}</span>
                      {field.source && (
                        <span className="text-[10px] text-zinc-400 truncate max-w-[120px]">{field.source}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeOutput(idx)}
                      className="text-zinc-300 hover:text-red-500 transition-colors p-1 shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add button */}
            <div className="px-4 py-3">
              <button
                type="button"
                onClick={() => setShowPicker((v) => !v)}
                className="flex items-center gap-1 text-[12.5px] text-zinc-400 hover:text-zinc-600 transition-colors font-medium cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                Add
              </button>
            </div>

            {/* Picker */}
            {showPicker && (
              <div className="px-4 pb-3">
                <div ref={pickerRef} className="border border-zinc-200 rounded-lg bg-white shadow-sm overflow-hidden">
                  <InlineVarTree
                    varTree={varTree}
                    selectedSources={selectedSources}
                    onToggle={(leaf) => {
                      const isSelected = outputs.some((o) => o.source === leaf.value);
                      if (isSelected) {
                        const idx = outputs.findIndex((o) => o.source === leaf.value);
                        if (idx >= 0) removeOutput(idx);
                      } else {
                        const name = leaf.field.replace(/[^a-zA-Z0-9_]/g, "_");
                        addOutputFromSource(leaf.value, leaf.label, name, typeFromLabel(leaf.type));
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {/* Run footer */}
            <div className="py-6 text-center border-t border-zinc-100">
              <span
                className="text-[13px] font-medium text-[#7c9fd4] hover:text-[#5b85bd] cursor-pointer transition-colors"
                onClick={() => runCompositeTool()}
              >
                Re-run tool to generate results
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
    <div className="flex h-full flex-col bg-white">
      {/* Step Detail Modal */}
      <StepDetailModal
        open={!!modalStepId && modalStep?.type !== "LOOP"}
        step={modalStep}
        systemTool={modalStepTool}
        varTree={modalVarTree}
        onClose={() => setModalStepId(null)}
        onUpdateStepConfig={updateStepConfig}
        onRunStep={() => { if (modalStepId) runCompositeTool({ startStepId: modalStepId }); }}
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
      {/* Top bar – match Workforce canvas layout */}
      <div className="border-b border-zinc-200 px-4 py-2.5 flex items-center justify-between bg-white">
        {/* Left: lock + link + icon + name + status */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1 text-zinc-500">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white">
              <Lock className="h-3.5 w-3.5" />
            </span>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white">
              <Link2 className="h-3.5 w-3.5" />
            </span>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 flex items-center justify-center rounded-md bg-zinc-100 text-[13px] font-semibold text-zinc-800">
              {toolIcon || "T"}
            </div>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New Workflow Tool"
              className="h-7 text-sm font-semibold border-none px-0 shadow-none focus-visible:ring-0 max-w-xs"
            />
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-200">
              Unsaved
            </span>
          </div>
        </div>

        {/* Center: Build / Run toggle */}
        <div className="flex-1 flex justify-center">
          <div className="inline-flex items-center gap-0.5 rounded-full bg-zinc-100 p-0.5 border border-zinc-200">
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full",
                activeTopTab === "build"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800",
              )}
              onClick={() => setActiveTopTab("build")}
            >
              <Hammer className="h-3.5 w-3.5" />
              <span>Build</span>
            </button>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full",
                activeTopTab === "run"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800",
              )}
              onClick={() => setActiveTopTab("run")}
            >
              <Play className="h-3.5 w-3.5" />
              <span>Run</span>
            </button>
          </div>
        </div>

        {/* Right: Share / Run tool / Save changes / Publish / more */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="h-8 px-3 text-xs text-zinc-600 hover:text-zinc-900"
          >
            <Share2 className="h-3.5 w-3.5 mr-1" />
            Share
          </Button>

          <Button
            variant="ghost"
            className="h-8 px-3 text-xs text-zinc-600 hover:text-zinc-900"
            onClick={() => setAssistantOpen(true)}
          >
            <MessageCircle className="h-3.5 w-3.5 mr-1" />
            Assistant
          </Button>

          <Button
            variant="outline"
            className="h-8 px-3 text-xs"
            disabled={isRunningTool}
            onClick={() => runCompositeTool()}
          >
            <Play className="h-3 w-3 mr-1.5" />
            {isRunningTool ? "Running…" : "Run tool"}
          </Button>

          <Button
            onClick={upsert}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="h-8 px-4 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {createMutation.isPending || updateMutation.isPending
              ? "Saving..."
              : "Save changes"}
          </Button>

          <Button
            type="button"
            className="h-8 px-4 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white gap-2"
            onClick={handlePublishClick}
            disabled={!initialTool?.id}
          >
            <Globe className="h-3.5 w-3.5" />
            Publish
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-zinc-200 text-zinc-600"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                className="text-xs"
                onClick={() => setSettingsOpen(true)}
              >
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs">Edit agent prompt</DropdownMenuItem>
              <DropdownMenuItem className="text-xs">Clone</DropdownMenuItem>
              <DropdownMenuItem className="text-xs">Copy link</DropdownMenuItem>
              <DropdownMenuItem className="text-xs">Export</DropdownMenuItem>
              <div className="my-1 border-t border-zinc-100" />
              <DropdownMenuItem className="text-xs">Report bug</DropdownMenuItem>
              <DropdownMenuItem className="text-xs">Help</DropdownMenuItem>
              <div className="my-1 border-t border-zinc-100" />
              <DropdownMenuItem className="text-xs text-red-600 focus:text-red-700">
                Delete tool
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 ml-1"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left assistant sidebar */}
        {assistantOpen ? (
          <div className="border-r border-zinc-200 bg-white w-[420px] shrink-0 flex flex-col">
            <div className="px-4 py-3 border-b border-zinc-200 flex items-center justify-between">
              <div className="text-sm font-semibold text-zinc-900">Assistant</div>
              <button
                type="button"
                onClick={() => setAssistantOpen(false)}
                className="h-8 w-8 rounded-md hover:bg-zinc-50 text-zinc-500"
                aria-label="Close assistant"
              >
                ×
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <ToolEditorAssistantPanel
                title="Tool Assistant"
                entityId={String(initialTool?.id ?? "new")}
                entityName={name || "Tool"}
                context={{
                  tool: {
                    id: initialTool?.id ?? null,
                    name,
                    description,
                    category,
                  },
                  inputs,
                  outputs,
                  steps: steps.map((s) => {
                    let cfg: any = {};
                    try {
                      cfg = JSON.parse(s.config || "{}");
                    } catch {
                      cfg = { raw: s.config };
                    }
                    return { ...s, config: cfg };
                  }),
                }}
                onApplyOps={(ops) => applyToolOps(ops)}
                onPersist={async () => {
                  await upsert();
                }}
                className="h-full"
              />
            </div>
          </div>
        ) : null}

        {/* Canvas or Run tab */}
        {activeTopTab === "run" ? (
          <ToolRunView
            inputs={inputs}
            runHistory={runHistory}
            setRunHistory={setRunHistory}
            selectedRunId={selectedRunId}
            setSelectedRunId={setSelectedRunId}
            runInput={runInput}
            setRunInput={setRunInput}
            selectedRun={selectedRun}
            isRunningTool={isRunningTool}
            runCompositeTool={() => runCompositeTool()}
          />
        ) : (
          <>
            {/* Canvas */}
            <div className="flex-1 overflow-hidden bg-zinc-50 relative">
              <ReactFlowProvider>
                <ToolFlowCanvas
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                  computedNodes={computedNodes}
                  computedEdges={computedEdges}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  navigatorOpen={navigatorOpen}
                  setNavigatorOpen={setNavigatorOpen}
                  navigatorQuery={navigatorQuery}
                  setNavigatorQuery={setNavigatorQuery}
                  setSidebarOpen={setSidebarOpen}
                  setToolStepSidebarOpen={setToolStepSidebarOpen}
                  setSystemToolsListOpen={setSystemToolsListOpen}
                  setInputSidebarOpen={setInputSidebarOpen}
                  setSelectedInputField={setSelectedInputField}
                  setSelectedNode={setSelectedNode}
                  setActivePanelTab={setActivePanelTab}
                  setSelectedStepId={setSelectedStepId}
                />
              </ReactFlowProvider>
            </div>

            {/* Right sidebar (single, switches content) */}
            {sidebarOpen ? (
              <div
                className="border-l border-zinc-200 bg-white overflow-hidden flex flex-col relative"
                style={{ width: sidebarWidth }}
              >
                {/* Resizer */}
                <div
                  className={cn(
                    "absolute left-0 top-0 h-full w-1 cursor-col-resize z-50",
                    isResizingSidebar ? "bg-indigo-200/60" : "hover:bg-indigo-200/40"
                  )}
                  onMouseDown={() => setIsResizingSidebar(true)}
                />
                <div className="px-4 py-3 border-b border-zinc-200 bg-white">
                  <div className="flex items-center gap-3">
                    {systemToolsListOpen && (
                      <button
                        type="button"
                        onClick={() => setSystemToolsListOpen(false)}
                        className="h-8 w-8 rounded-md hover:bg-zinc-100 text-zinc-600 shrink-0 flex items-center justify-center -ml-1"
                        aria-label="Back to tool steps"
                      >
                        <ChevronRight className="h-4 w-4 rotate-180" />
                      </button>
                    )}

                    {/* Icon */}
                    <div className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden text-indigo-600">
                      {selectedNode === "step" && (() => {
                        const s = steps.find(x => x.id === selectedStepId);
                        let cfg: any = {};
                        try { cfg = JSON.parse(s?.config || "{}"); } catch {}
                        const isLoop = s?.type === "LOOP" || cfg?.kind === "LOOP";
                        if (isLoop) return <Repeat className="h-5 w-5 text-sky-500" />;
                        return s?.type === "SYSTEM_TOOL" ? <Wrench className="h-5 w-5 text-zinc-600" /> :
                          s?.type === "LLM" ? <Bot className="h-5 w-5" /> :
                          <div className="text-sm font-bold text-zinc-400">T</div>;
                      })()}
                      {selectedNode === "inputs" && <div className="text-sm font-bold text-indigo-600">I</div>}
                      {selectedNode === "outputs" && <div className="text-sm font-bold text-emerald-600">O</div>}
                      {selectedNode !== "step" && selectedNode !== "inputs" && selectedNode !== "outputs" && <div className="text-sm font-bold text-zinc-400">T</div>}
                    </div>

                    {/* Title + subtitle */}
                    <div className="min-w-0 flex-1">
                      <div className="inline-flex items-center gap-1.5 max-w-full">
                        <div className="min-w-0">
                          {isSidebarTitleEditing && isSidebarTitleEditable ? (
                            <Input
                              value={sidebarTitleDraft}
                              onChange={(e) => setSidebarTitleDraft(e.target.value)}
                              autoFocus
                              className="h-8 w-[210px] rounded-[10px] border-zinc-300 text-[24px] leading-none font-medium px-3 py-1.5 focus-visible:ring-1 focus-visible:ring-indigo-500"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const nextName = sidebarTitleDraft.trim();
                                  if (selectedStepId && nextName) updateStepName(selectedStepId, nextName);
                                  setIsSidebarTitleEditing(false);
                                }
                                if (e.key === "Escape") {
                                  setSidebarTitleDraft(selectedStep?.name || "");
                                  setIsSidebarTitleEditing(false);
                                }
                              }}
                              onBlur={() => {
                                const nextName = sidebarTitleDraft.trim();
                                if (selectedStepId && nextName) updateStepName(selectedStepId, nextName);
                                setIsSidebarTitleEditing(false);
                              }}
                            />
                          ) : (
                            <div className="text-[14px] font-bold text-zinc-900 truncate">
                              {sidebarHeaderTitle}
                            </div>
                          )}
                        </div>
                        {isSidebarTitleEditable && !isSidebarTitleEditing && (
                          <Pencil
                            className="h-3.5 w-3.5 text-zinc-400 shrink-0 cursor-pointer hover:text-zinc-600 transition-colors mt-[1px]"
                            onClick={() => setIsSidebarTitleEditing(true)}
                          />
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5 line-clamp-1">
                        {systemToolsListOpen
                          ? "Browse all registered system tools."
                          : inputSidebarOpen
                            ? "Set how this input gets its value."
                            : toolStepSidebarOpen
                              ? "Choose from Popular Tool Steps or System tools."
                              : selectedNode === "inputs"
                                ? "Configure required values and how they are filled."
                                : selectedNode === "outputs"
                                  ? "Configure what this tool returns."
                                  : (selectedStep?.type === "LLM"
                                    ? "Prompt a large language model with input text to produce output text."
                                    : (selectedStepTool?.description || "Configure the selected tool step.")) || "Configure the selected tool step."}
                      </div>
                    </div>

                    {/* Right actions: pill + expand (outputs only) + close */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {selectedNode === "outputs" && (
                        <>
                          {/* Mode pill */}
                          <div className="flex items-center border border-zinc-200/80 bg-zinc-100 rounded-lg p-[3px] text-[11px] gap-0.5">
                            <button
                              type="button"
                              onClick={() => setOutputMode("last_step")}
                              className={cn(
                                "px-2 h-[22px] rounded-[5px] font-medium transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer",
                                outputMode === "last_step"
                                  ? "bg-white text-zinc-800 shadow-sm ring-1 ring-zinc-200/50"
                                  : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50"
                              )}
                            >
                              <List className="h-3 w-3" />
                              Last step
                            </button>
                            <button
                              type="button"
                              onClick={() => setOutputMode("manual")}
                              className={cn(
                                "px-2 h-[22px] rounded-[5px] font-medium transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer",
                                outputMode === "manual"
                                  ? "bg-white text-zinc-800 shadow-sm ring-1 ring-zinc-200/50"
                                  : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50"
                              )}
                            >
                              <Settings className="h-3 w-3" />
                              Manual
                            </button>
                          </div>

                          {/* Expand / collapse */}
                          <button
                            type="button"
                            onClick={() => setOutputsModalOpen(true)}
                            className="h-7 w-7 rounded-md hover:bg-zinc-100 text-zinc-400 shrink-0 flex items-center justify-center transition-colors"
                            title="Expand to full view"
                          >
                            <Maximize2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}

                      {/* Close */}
                      <button
                        type="button"
                        onClick={() => {
                          setSidebarOpen(false);
                          setToolStepSidebarOpen(false);
                          setSystemToolsListOpen(false);
                          setInputSidebarOpen(false);
                          setSelectedInputField(null);
                        }}
                        className="h-7 w-7 rounded-md hover:bg-zinc-100 text-zinc-400 shrink-0 flex items-center justify-center transition-colors"
                        aria-label="Close sidebar"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-auto px-4 py-4">
                  {systemToolsListOpen ? (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Input
                          value={toolStepSidebarQuery}
                          onChange={(e) => setToolStepSidebarQuery(e.target.value)}
                          placeholder="Search system tools..."
                          className="h-9 flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          disabled={isSyncingTools}
                          onClick={syncSystemTools}
                        >
                          {isSyncingTools ? "Syncing…" : "Sync"}
                        </Button>
                      </div>
                      {(systemToolsQuery.data ?? []).length === 0 && !systemToolsQuery.isLoading ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-4 text-sm text-amber-900">
                          <p className="font-medium">No system tools found</p>
                          <p className="mt-1 text-xs text-amber-800">Run sync to populate from the registry. Ensure the backend is running.</p>
                          <Button type="button" variant="outline" size="sm" className="mt-3" disabled={isSyncingTools} onClick={syncSystemTools}>
                            {isSyncingTools ? "Syncing…" : "Sync system tools"}
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2">
                          {(systemToolsQuery.data ?? [])
                            .filter((t: any) => {
                              const q = toolStepSidebarQuery.trim().toLowerCase();
                              if (!q) return true;
                              return `${t?.name ?? ""} ${t?.displayName ?? ""} ${t?.description ?? ""}`.toLowerCase().includes(q);
                            })
                            .map((t: any) => (
                              <button
                                key={t.id}
                                onClick={() => addSystemToolStep(t)}
                                className="rounded-lg border border-zinc-200 bg-white p-3 text-left hover:bg-zinc-50"
                              >
                                <div className="text-sm font-medium text-zinc-900 truncate">{t.displayName ?? t.name}</div>
                                <div className="mt-1 text-xs text-zinc-500 line-clamp-2">{t.description || "System tool"}</div>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  ) : inputSidebarOpen && selectedInputField ? (
                    <div className="space-y-4">
                      <div className="text-xs text-zinc-500">Configure how this input receives its value.</div>
                      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                        Input configuration panel — bind to variables or set defaults.
                      </div>
                      <Button variant="outline" size="sm" onClick={() => { setInputSidebarOpen(false); setSelectedInputField(null); }}>
                        Done
                      </Button>
                    </div>
                  ) : toolStepSidebarOpen ? (
                    <div className="space-y-4">
                      <Input
                        value={toolStepSidebarQuery}
                        onChange={(e) => setToolStepSidebarQuery(e.target.value)}
                        placeholder="Search tool steps..."
                        className="h-9"
                      />

                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-zinc-900">Popular Tool Steps</div>
                        <div className="grid grid-cols-2 gap-3">
                          {STEP_LIBRARY.filter((s) => {
                            const q = toolStepSidebarQuery.trim().toLowerCase();
                            if (!q) return true;
                            return (s.label + " " + s.description).toLowerCase().includes(q);
                          }).map((s) => (
                            <TooltipProvider key={s.id}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => s.id === "system_tool" ? setSystemToolsListOpen(true) : addStepFromLibrary(s.id)}
                                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3.5 text-left hover:bg-zinc-50 hover:border-zinc-300"
                                  >
                                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50">
                                      {s.id === "llm" ? <Bot className="h-4.5 w-4.5 text-indigo-600" /> : null}
                                      {s.id === "api" ? <ExternalLink className="h-4.5 w-4.5 text-sky-600" /> : null}
                                      {s.id === "system_tool" ? <Wrench className="h-4.5 w-4.5 text-zinc-700" /> : null}
                                      {s.id === "branch" ? <GitBranch className="h-4.5 w-4.5 text-violet-600" /> : null}
                                      {s.id === "loop" ? <Repeat className="h-4.5 w-4.5 text-blue-600" /> : null}
                                      {s.id === "python" ? <Code className="h-4.5 w-4.5 text-emerald-600" /> : null}
                                      {s.id === "javascript" ? <Braces className="h-4.5 w-4.5 text-amber-600" /> : null}
                                    </span>
                                    <span className="text-[15px] font-semibold text-zinc-900">{s.label}</span>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[220px] text-xs">
                                  {s.description}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : selectedNode === "branch_path" ? (
                    <div className="flex-1 overflow-y-auto w-full pt-1">
                      <Tabs defaultValue="condition" className="w-full">
                        <TabsList className="w-full justify-start rounded-none border-b border-zinc-200 bg-transparent p-0">
                          <TabsTrigger
                            value="condition"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-4 py-2 font-semibold text-sm"
                          >
                            Branch Condition
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value="condition" className="p-4 w-full">
                          {(() => {
                            const step = steps.find((s) => s.id === selectedStepId);
                            if (!step || !selectedSubBranchId) {
                              return null;
                            }

                            let cfg: any = {};
                            try {
                              cfg = JSON.parse(step.config || "{}");
                            } catch {
                              cfg = {};
                            }
                            const branches: any[] = Array.isArray(cfg.branches) ? cfg.branches : [];
                            const branchIdx = branches.findIndex((b) => b.id === selectedSubBranchId);
                            const activeBranch = branchIdx >= 0 ? branches[branchIdx] : {};

                            const assessmentMode: "rules" | "code" | "ai" | "fallback" =
                              activeBranch.assessmentMode ?? (branchIdx === 1 ? "fallback" : "rules");
                            const otherHasFallback = branches.some(
                              (b, i) => i !== branchIdx && (b.assessmentMode ?? (i === 1 ? "fallback" : "rules")) === "fallback",
                            );

                            const group: BranchConditionGroup =
                              activeBranch.conditionGroup ?? {
                                matchMode: "all",
                                rules: [],
                              };

                            const stepIndex = steps.findIndex((s) => s.id === step.id);
                            const varTree = buildVarTree(stepIndex);

                            const updateBranch = (updater: (b: any) => any) => {
                              setSteps((prev) =>
                                prev.map((s) => {
                                  if (s.id !== step.id) return s;
                                  let currentCfg: any = {};
                                  try {
                                    currentCfg = JSON.parse(s.config || "{}");
                                  } catch {
                                    currentCfg = {};
                                  }
                                  const currentBranches: any[] = Array.isArray(currentCfg.branches)
                                    ? currentCfg.branches
                                    : [];
                                  const nextBranches = currentBranches.map((b) =>
                                    b.id === selectedSubBranchId ? updater(b) : b,
                                  );
                                  return {
                                    ...s,
                                    config: JSON.stringify(
                                      { ...currentCfg, branches: nextBranches },
                                      null,
                                      2,
                                    ),
                                  };
                                }),
                              );
                            };

                            const handleAssessmentChange = (val: string) => {
                              updateBranch((b) => ({ ...b, assessmentMode: val }));
                            };

                            const handleMatchChange = (val: "all" | "any") => {
                              updateBranch((b) => ({
                                ...b,
                                conditionGroup: { ...(b.conditionGroup ?? group), matchMode: val },
                              }));
                            };

                            const handleRuleUpdate = (
                              id: string,
                              patch: Partial<BranchConditionRule>,
                            ) => {
                              updateBranch((b) => {
                                const existing: BranchConditionGroup =
                                  b.conditionGroup ?? group;
                                const rules = (existing.rules ?? []).map((r: BranchConditionRule) =>
                                  r.id === id ? { ...r, ...patch } : r,
                                );
                                return {
                                  ...b,
                                  conditionGroup: { ...existing, rules },
                                };
                              });
                            };

                            const handleRuleRemove = (id: string) => {
                              updateBranch((b) => {
                                const existing: BranchConditionGroup =
                                  b.conditionGroup ?? group;
                                const rules = (existing.rules ?? []).filter(
                                  (r: BranchConditionRule) => r.id !== id,
                                );
                                return {
                                  ...b,
                                  conditionGroup: { ...existing, rules },
                                };
                              });
                            };

                            const handleAddCondition = () => {
                              const newRule: BranchConditionRule = {
                                id: crypto.randomUUID(),
                                leftVariable: "",
                                leftLabel: "",
                                operator: "equals",
                                rightValue: "",
                                rightLabel: "",
                              };
                              updateBranch((b) => {
                                const existing: BranchConditionGroup =
                                  b.conditionGroup ?? group;
                                const rules = [...(existing.rules ?? []), newRule];
                                return {
                                  ...b,
                                  conditionGroup: { ...existing, rules },
                                };
                              });
                            };

                            return (
                              <div className="space-y-4">
                                <div>
                                  <div className="text-sm font-semibold mb-2">
                                    Assessment mode
                                  </div>
                                  <Select
                                    value={assessmentMode}
                                    onValueChange={handleAssessmentChange}
                                  >
                                    <SelectTrigger className="w-[260px] h-[36px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="rules">Rules</SelectItem>
                                      <SelectItem value="code">Code expression</SelectItem>
                                      <SelectItem value="ai">Let AI decide</SelectItem>
                                      {(!otherHasFallback ||
                                        assessmentMode === "fallback") && (
                                          <SelectItem value="fallback">
                                            Fallback (if no other branches run)
                                          </SelectItem>
                                        )}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Only show match/conditions when not in fallback mode */}
                                {assessmentMode !== "fallback" && (() => {
                                  const effectiveGroup: BranchConditionGroup = {
                                    matchMode: group.matchMode,
                                    rules: group.rules ?? [],
                                  };

                                  return (
                                    <>
                                      <div className="flex items-center gap-2 mt-6 mb-2">
                                        <span className="text-sm font-medium text-zinc-700">
                                          Match
                                        </span>
                                        <Select
                                          value={effectiveGroup.matchMode}
                                          onValueChange={(val) =>
                                            handleMatchChange(val as "all" | "any")
                                          }
                                        >
                                          <SelectTrigger className="w-[80px] h-[32px] text-sm">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="all">All</SelectItem>
                                            <SelectItem value="any">Any</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <span className="text-sm font-medium text-zinc-700">
                                          conditions in this group
                                        </span>
                                      </div>

                                      <div className="space-y-3">
                                        {effectiveGroup.rules.length === 0 ? (
                                          <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-4 text-xs text-zinc-500">
                                            No conditions yet. Add one below to control when this
                                            branch should run.
                                          </div>
                                        ) : (
                                          effectiveGroup.rules.map((rule) => (
                                            <BranchConditionRuleRow
                                              key={rule.id}
                                              rule={rule}
                                              varTree={varTree}
                                              onUpdate={(patch) =>
                                                handleRuleUpdate(rule.id, patch)
                                              }
                                              onRemove={() => handleRuleRemove(rule.id)}
                                            />
                                          ))
                                        )}
                                      </div>

                                      <div className="pt-1">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={handleAddCondition}
                                          className="text-zinc-600 hover:text-zinc-900 border border-transparent hover:bg-zinc-100 flex items-center h-8 font-medium"
                                        >
                                          <Plus className="h-4 w-4 mr-1.5" /> Add condition
                                        </Button>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            );
                          })()}
                        </TabsContent>
                      </Tabs>
                    </div>
                  ) : selectedNode === "outputs" ? (
                    <OutputsSidebarPanel />
                  ) : (
                    <>
                      {/* Configure */}
                      {activePanelTab === "configure" && (
                        <div className="space-y-4">
                          {(selectedNode === "inputs" || !selectedStepId) && (
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
                                <div className="flex items-center justify-between">
                                  <div className="text-xs font-semibold text-zinc-900">Inputs</div>
                                  <Select
                                    value=""
                                    onValueChange={(v) => {
                                      addInput(v as InputUiType);
                                    }}
                                  >
                                    <SelectTrigger className="h-8 w-28 text-xs">
                                      <SelectValue placeholder="More" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {INPUT_TYPE_OPTIONS.map((o) => (
                                        <SelectItem key={o.value} value={o.value}>
                                          {o.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => addInput("text")}
                                  >
                                    Text
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => addInput("long_text")}
                                  >
                                    Long text
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => addInput("number")}
                                  >
                                    Number
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => addInput("json")}
                                  >
                                    JSON
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => addInput("api_key")}
                                  >
                                    API key
                                  </Button>
                                </div>
                              </div>

                              {/* Manual vs agent groups */}
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
                                        const activeField = prev[oldIndex];
                                        const overField = prev[newIndex];
                                        if ((activeField.fillMode ?? "agent") === (overField.fillMode ?? "agent")) {
                                          return arrayMove(prev, oldIndex, newIndex);
                                        }
                                      }
                                      return prev;
                                    });
                                  }
                                }}
                              >
                                {(["manual", "agent"] as const).map((group) => {
                                  const groupInputs = inputs.filter(
                                    (i) => (i.fillMode ?? "agent") === group,
                                  );
                                  const title =
                                    group === "manual"
                                      ? "Should be set manually"
                                      : "Agent decides how to fill";
                                  const subtitle =
                                    group === "manual"
                                      ? "Values must be provided before the tool can run."
                                      : "The agent can fill these from context (you can still add defaults).";
                                  if (groupInputs.length === 0) return null;
                                  return (
                                    <div key={group} className="space-y-2">
                                      <div>
                                        <div className="text-xs font-semibold text-zinc-900">{title}</div>
                                        <div className="text-[11px] text-zinc-500 mt-0.5">
                                          {subtitle}
                                        </div>
                                      </div>
                                      <SortableContext
                                        items={groupInputs.map((field) => {
                                          const realIdx = inputs.findIndex((x) => x === field);
                                          return `input-${realIdx}`;
                                        })}
                                        strategy={verticalListSortingStrategy}
                                      >
                                        <div className="space-y-2">
                                          {groupInputs.map((field, idx) => {
                                            const realIdx = inputs.findIndex((x) => x === field);
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
                                                    <Select
                                                      value={uiType}
                                                      onValueChange={(val) => {
                                                        const meta = INPUT_TYPE_OPTIONS.find(
                                                          (o) => o.value === val,
                                                        )!;
                                                        setInputs((prev) =>
                                                          prev.map((f, i) =>
                                                            i === realIdx
                                                              ? {
                                                                ...f,
                                                                uiType: val as any,
                                                                type: meta.baseType,
                                                              }
                                                              : f,
                                                          ),
                                                        );
                                                      }}
                                                    >
                                                      <SelectTrigger className="h-8 w-40 text-xs">
                                                        <SelectValue />
                                                      </SelectTrigger>
                                                      <SelectContent>
                                                        {INPUT_TYPE_OPTIONS.map((o) => (
                                                          <SelectItem key={o.value} value={o.value}>
                                                            {o.label}
                                                          </SelectItem>
                                                        ))}
                                                      </SelectContent>
                                                    </Select>
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        setInputs((prev) =>
                                                          prev.filter((_, i) => i !== realIdx),
                                                        )
                                                      }
                                                      className="ml-auto text-zinc-400 hover:text-red-500"
                                                    >
                                                      <Trash2 className="h-4 w-4" />
                                                    </button>
                                                  </div>

                                                  <div className="mt-2 flex items-center justify-between">
                                                    <div className="text-[11px] text-zinc-500">Required</div>
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

                                                  <div className="mt-2">
                                                    <Textarea
                                                      value={field.description ?? ""}
                                                      onChange={(e) =>
                                                        setInputs((prev) =>
                                                          prev.map((f, i) =>
                                                            i === realIdx
                                                              ? { ...f, description: e.target.value }
                                                              : f,
                                                          ),
                                                        )
                                                      }
                                                      placeholder="Description"
                                                      className="min-h-[56px] text-xs"
                                                    />
                                                  </div>

                                                  <div className="mt-2 flex items-center justify-between">
                                                    <div className="text-[11px] text-zinc-500">Fill mode</div>
                                                    <Select
                                                      value={field.fillMode ?? "agent"}
                                                      onValueChange={(val) =>
                                                        setInputs((prev) =>
                                                          prev.map((f, i) =>
                                                            i === realIdx
                                                              ? { ...f, fillMode: val as any }
                                                              : f,
                                                          ),
                                                        )
                                                      }
                                                    >
                                                      <SelectTrigger className="h-8 w-40 text-xs">
                                                        <SelectValue />
                                                      </SelectTrigger>
                                                      <SelectContent>
                                                        <SelectItem value="manual">Manual</SelectItem>
                                                        <SelectItem value="agent">Agent</SelectItem>
                                                      </SelectContent>
                                                    </Select>
                                                  </div>

                                                  {/* Default value (manual feels like Relevance's "set manually") */}
                                                  <div className="mt-3">
                                                    <div className="flex items-center justify-between mb-1">
                                                      <span className="text-[11px] font-medium text-zinc-700">
                                                        Default / value
                                                      </span>
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          setSelectedInputField({
                                                            kind: "tool",
                                                            fieldIdx: realIdx,
                                                          });
                                                          setInputSidebarOpen(true);
                                                          setToolStepSidebarOpen(false);
                                                          setSystemToolsListOpen(false);
                                                          setSidebarOpen(true);
                                                        }}
                                                        className="h-6 w-6 rounded hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 flex items-center justify-center"
                                                        title="Configure input"
                                                      >
                                                        <Settings2 className="h-3.5 w-3.5" />
                                                      </button>
                                                    </div>
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
                                                        <SelectTrigger className="h-9 text-xs">
                                                          <SelectValue placeholder="Select connected account..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                          <SelectItem value="demo_oauth_account">
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
                                                        className="min-h-[72px] text-xs"
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
                                                        className="h-9 text-xs"
                                                      />
                                                    )}
                                                  </div>
                                                </div>
                                              </SortableSidebarInputWrapper>
                                            );
                                          })}
                                        </div>
                                      </SortableContext>
                                    </div>
                                  );
                                })}
                              </DndContext>
                            </>
                          )}

                          {/* Step config editor when a step node is selected */}
                          {selectedStepId && selectedNode === "step" && (
                            <div className="pt-2">
                              {(() => {
                                const step = steps.find((s) => s.id === selectedStepId);
                                if (!step) return null;
                                let parsed: any = {};
                                try {
                                  parsed = JSON.parse(step.config || "{}");
                                } catch {
                                  parsed = {};
                                }
                                const isLoop = parsed?.kind === "LOOP";
                                return isLoop ? (
                                      <div className="mt-1">
                                        <Tabs defaultValue="advanced" className="w-full">
                                          <TabsList className="w-full justify-start rounded-none border-b border-zinc-200 bg-transparent p-0 h-auto">
                                            <TabsTrigger value="advanced" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-4 py-2 text-xs font-semibold">
                                              Advanced
                                            </TabsTrigger>
                                            <TabsTrigger value="outputs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-4 py-2 text-xs font-semibold">
                                              Outputs
                                            </TabsTrigger>
                                            <TabsTrigger value="fallback" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-4 py-2 text-xs font-semibold">
                                              Fallback
                                            </TabsTrigger>
                                          </TabsList>

                                          {/* Advanced Tab */}
                                          <TabsContent value="advanced" className="pt-4 space-y-5">
                                            <div className="space-y-2">
                                              <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-zinc-900">How should errors be handled?</span>
                                                <Info className="h-3.5 w-3.5 text-zinc-400" />
                                                <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-100 border border-zinc-200 rounded px-1.5 py-0.5">Optional</span>
                                              </div>
                                              <Select
                                                value={parsed?.errorHandling || ""}
                                                onValueChange={(val) => updateStepConfig(step.id, (cfg) => ({ ...cfg, kind: "LOOP", errorHandling: val || undefined }))}
                                              >
                                                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select option..." /></SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="skip">Skip item</SelectItem>
                                                  <SelectItem value="throw">Throw error</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>
                                            <div className="space-y-2">
                                              <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-zinc-900">Index of item to test loop on</span>
                                                <Info className="h-3.5 w-3.5 text-zinc-400" />
                                                <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-100 border border-zinc-200 rounded px-1.5 py-0.5">Optional</span>
                                              </div>
                                              <Input
                                                value={typeof parsed?.testIndex === "number" ? String(parsed.testIndex) : ""}
                                                onChange={(e) => {
                                                  const n = e.target.value === "" ? undefined : Number(e.target.value);
                                                  updateStepConfig(step.id, (cfg) => ({ ...cfg, kind: "LOOP", testIndex: Number.isFinite(n as number) ? n : undefined }));
                                                }}
                                                placeholder="Enter number..."
                                                className="h-9 text-xs"
                                              />
                                            </div>
                                          </TabsContent>

                                          {/* Outputs Tab */}
                                          <TabsContent value="outputs" className="pt-4 space-y-3">
                                            {["results", "errors", "credits_cost", "credits_used"].map((key) => (
                                              <div key={key} className="space-y-1">
                                                <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-mono text-teal-600">
                                                  {`{{ ${key} }}`}
                                                </div>
                                                <div className="flex items-center justify-between pl-1">
                                                  <div className="flex items-center gap-1 text-xs text-zinc-500">
                                                    <CornerDownRight className="h-3 w-3 text-zinc-400" />
                                                    <span>output.</span>
                                                    <span className="bg-indigo-50 text-indigo-600 rounded px-1 font-mono text-[11px]">{key}</span>
                                                  </div>
                                                  <button className="text-zinc-300 hover:text-zinc-500"><X className="h-3 w-3" /></button>
                                                </div>
                                              </div>
                                            ))}
                                            <Button variant="outline" size="sm" className="w-full mt-2 text-xs"><Plus className="h-3.5 w-3.5 mr-1" /> Add new output key</Button>
                                          </TabsContent>

                                          {/* Fallback Tab */}
                                          <TabsContent value="fallback" className="pt-4 space-y-4">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-zinc-900">Use fallback if step fails</span>
                                                <Info className="h-4 w-4 text-zinc-400" />
                                              </div>
                                              <Switch
                                                checked={parsed?.useFallback ?? true}
                                                onCheckedChange={(v) => updateStepConfig(step.id, (cfg) => ({ ...cfg, useFallback: v }))}
                                              />
                                            </div>
                                            {parsed?.useFallback !== false && (
                                              <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-3">
                                                <div className="text-xs font-semibold text-zinc-700">Set fallback values</div>
                                                {["results", "errors", "credits_cost", "credits_used"].map((key) => (
                                                  <div key={key} className="space-y-1.5">
                                                    <div className="flex items-center justify-between">
                                                      <span className="bg-indigo-50 text-indigo-700 font-mono text-[11px] border border-indigo-100 rounded px-2 py-0.5">output.{key}</span>
                                                      <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 rounded px-1.5 py-0.5 uppercase">Required</span>
                                                    </div>
                                                    <Input placeholder="Default value..." className="h-8 text-xs" />
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </TabsContent>
                                        </Tabs>
                                      </div>
                                    ) : step.type === "SYSTEM_TOOL" ? (
                                      <div className="mt-3 space-y-0">
                                        {(() => {
                                          const systemTool = (systemToolsQuery.data ?? []).find(
                                            (t: any) => t.id === parsed.toolId,
                                          );
                                          if (!systemTool) {
                                            return (
                                              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-center">
                                                <div className="text-sm font-medium text-zinc-900">
                                                  Tool not found
                                                </div>
                                                <div className="mt-1 text-xs text-zinc-500">
                                                  The tool for this step couldn't be loaded. It might
                                                  have been deleted or renamed.
                                                </div>
                                              </div>
                                            );
                                          }

                                          const params =
                                            systemTool.functionSchema?.parameters?.properties ?? {};
                                          const requiredParams =
                                            systemTool.functionSchema?.parameters?.required ?? [];
                                          const paramEntries = Object.entries(params);
                                          const returns = systemTool.functionSchema?.returns?.properties ?? {};
                                          const returnEntries = Object.entries(returns);

                                          const stepIndex = steps.findIndex((s) => s.id === step.id);
                                          const varTree = buildVarTree(stepIndex);

                                          return (
                                            <Tabs defaultValue="configure" className="w-full">
                                              <TabsList className="w-full justify-start rounded-none border-b border-zinc-200 bg-transparent p-0 h-auto">
                                                <TabsTrigger
                                                  value="configure"
                                                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-4 py-2 text-xs font-semibold"
                                                >
                                                  Configure
                                                </TabsTrigger>
                                                <TabsTrigger
                                                  value="advanced"
                                                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-4 py-2 text-xs font-semibold"
                                                >
                                                  Advanced
                                                </TabsTrigger>
                                                <TabsTrigger
                                                  value="outputs"
                                                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-4 py-2 text-xs font-semibold"
                                                >
                                                  Outputs
                                                </TabsTrigger>
                                                <TabsTrigger
                                                  value="docs"
                                                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-4 py-2 text-xs font-semibold"
                                                >
                                                  Docs
                                                </TabsTrigger>
                                                <TabsTrigger
                                                  value="fallback"
                                                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-4 py-2 text-xs font-semibold"
                                                >
                                                  Fallback
                                                </TabsTrigger>
                                              </TabsList>

                                              {/* ── Configure Tab ── */}
                                              <TabsContent value="configure" className="pt-4 space-y-4">
                                                {paramEntries.length === 0 ? (
                                                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-center">
                                                    <div className="text-sm font-medium text-zinc-900">
                                                      No parameters
                                                    </div>
                                                    <div className="mt-1 text-xs text-zinc-500">
                                                      This system tool does not require any input
                                                      parameters.
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <div className="space-y-4">
                                                    {paramEntries.map(([key, schema]: [string, any]) => {
                                                      const isRequired = requiredParams.includes(key);
                                                      const binding = (parsed.inputs ?? {})[key] ?? "";
                                                      const label = (parsed.inputLabels ?? {})[key] ?? "";

                                                      return (
                                                        <div key={key} className="space-y-1.5">
                                                          <div className="flex items-center justify-between">
                                                            <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">{key}</div>
                                                            <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                                                              {schema.type ?? "any"}
                                                            </span>
                                                          </div>
                                                          {schema.description && (
                                                            <div className="text-[11px] text-zinc-500 leading-relaxed line-clamp-2">
                                                              {schema.description}
                                                            </div>
                                                          )}
                                                          <VariableSelectionModal
                                                            value={binding}
                                                            label={label}
                                                            varTree={varTree}
                                                            placeholder={`Select variable or input ${key}...`}
                                                            onChange={(val, lbl) => {
                                                              updateStepConfig(step.id, (cfg) => ({
                                                                ...cfg,
                                                                inputs: {
                                                                  ...(cfg.inputs ?? {}),
                                                                  [key]: val,
                                                                },
                                                                inputLabels: {
                                                                  ...(cfg.inputLabels ?? {}),
                                                                  [key]: lbl,
                                                                },
                                                              }));
                                                            }}
                                                            onClear={() => {
                                                              updateStepConfig(step.id, (cfg) => {
                                                                const nextInputs = { ...(cfg.inputs ?? {}) };
                                                                const nextLabels = {
                                                                  ...(cfg.inputLabels ?? {}),
                                                                };
                                                                delete nextInputs[key];
                                                                delete nextLabels[key];
                                                                return {
                                                                  ...cfg,
                                                                  inputs: nextInputs,
                                                                  inputLabels: nextLabels,
                                                                };
                                                              });
                                                            }}
                                                          />
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                )}
                                              </TabsContent>

                                              {/* ── Advanced Tab ── */}
                                              <TabsContent value="advanced" className="pt-4 space-y-6">
                                                <div className="space-y-4">
                                                  <div className="flex items-center justify-between">
                                                    <div className="text-xs font-semibold text-zinc-900">Stop on error</div>
                                                    <Switch
                                                      checked={parsed?.stopOnError !== false}
                                                      onCheckedChange={(val) => updateStepConfig(step.id, (cfg) => ({ ...cfg, stopOnError: !!val }))}
                                                    />
                                                  </div>
                                                  <div className="space-y-2">
                                                    <div className="text-xs font-semibold text-zinc-900">Timeout (sec)</div>
                                                    <Input
                                                      type="number"
                                                      value={(parsed?.timeout as number) ?? 60}
                                                      onChange={(e) => updateStepConfig(step.id, (cfg) => ({ ...cfg, timeout: Number(e.target.value) }))}
                                                      className="h-10 text-xs"
                                                    />
                                                  </div>
                                                </div>
                                              </TabsContent>

                                              {/* ── Outputs Tab ── */}
                                              <TabsContent value="outputs" className="pt-4 space-y-4">
                                                <div className="space-y-2">
                                                  <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-1">Tool Return Fields</div>
                                                  <div className="grid grid-cols-1 gap-2">
                                                    {returnEntries.length > 0 ? (
                                                      returnEntries.map(([key, schema]: [string, any]) => (
                                                        <div key={key} className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
                                                          <div className="flex items-center justify-between gap-2">
                                                            <div className="text-xs font-semibold text-zinc-900 truncate">{key}</div>
                                                            <span className="text-[9px] font-bold text-zinc-400 uppercase bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100">
                                                              {schema.type ?? "any"}
                                                            </span>
                                                          </div>
                                                          {schema.description && (
                                                            <div className="mt-1 text-[10px] text-zinc-500 leading-relaxed italic line-clamp-2">
                                                              {schema.description}
                                                            </div>
                                                          )}
                                                        </div>
                                                      ))
                                                    ) : (
                                                      <div className="text-xs text-zinc-500 italic p-4 text-center">No structured output fields defined for this tool.</div>
                                                    )}
                                                  </div>
                                                </div>
                                              </TabsContent>

                                              {/* ── Docs Tab ── */}
                                              <TabsContent value="docs" className="pt-4 space-y-4">
                                                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3">
                                                  <div className="flex items-center gap-2 text-indigo-700 font-semibold text-xs"><Wrench className="h-4 w-4" /> Tool Documentation</div>
                                                  <p className="text-[11px] text-indigo-600 leading-relaxed">This tool is a built-in system capability. Refer to the platform documentation for detailed usage guidelines.</p>
                                                  <Button variant="outline" className="w-full h-9 text-xs gap-2 bg-white border-indigo-200 text-indigo-700">
                                                    <ExternalLink className="h-3.5 w-3.5" /> Open Knowledge Base
                                                  </Button>
                                                </div>
                                              </TabsContent>

                                              {/* ── Fallback Tab ── */}
                                              <TabsContent value="fallback" className="pt-4 space-y-6">
                                                <div className="flex items-center justify-between">
                                                  <div className="flex items-center gap-2">
                                                    <div className="text-xs font-semibold text-zinc-900">Use fallback if tool fails</div>
                                                    <TooltipProvider>
                                                      <Tooltip>
                                                        <TooltipTrigger><Info className="h-3.5 w-3.5 text-zinc-400" /></TooltipTrigger>
                                                        <TooltipContent><p className="text-[10px]">When enabled, the step will use these default values if the tool execution errors.</p></TooltipContent>
                                                      </Tooltip>
                                                    </TooltipProvider>
                                                  </div>
                                                  <Switch
                                                    checked={!!parsed?.useFallback}
                                                    onCheckedChange={(val) => updateStepConfig(step.id, (cfg) => ({ ...cfg, useFallback: !!val }))}
                                                  />
                                                </div>

                                                {parsed?.useFallback && (
                                                  <div className="mt-4 p-5 rounded-2xl bg-[#F8F9FB] border border-zinc-100 space-y-5 animate-in slide-in-from-top-2 duration-300">
                                                    <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Set fallback values</div>
                                                    <div className="space-y-6">
                                                      {returnEntries.length > 0 ? (
                                                        returnEntries.map(([key, schema]: [string, any]) => (
                                                          <div key={key} className="space-y-2">
                                                            <div className="flex items-center justify-between px-1">
                                                              <div className="flex items-center gap-1.5 border border-zinc-200 bg-zinc-100 px-2 py-0.5 rounded-md text-[10px] font-mono text-zinc-700">
                                                                <span className="text-zinc-400">output.</span>{key}
                                                              </div>
                                                              <span className="bg-zinc-200 text-zinc-600 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight">
                                                                Optional
                                                              </span>
                                                            </div>
                                                            <Input
                                                              value={(parsed?.fallbackValues?.[key] as string) || ""}
                                                              onChange={(e) => {
                                                                const val = e.target.value;
                                                                updateStepConfig(step.id, (cfg) => ({
                                                                  ...cfg,
                                                                  fallbackValues: {
                                                                    ...(cfg.fallbackValues || {}),
                                                                    [key]: val,
                                                                  },
                                                                }));
                                                              }}
                                                              placeholder={`Default value for ${key}`}
                                                              className="h-10 text-xs bg-white border-zinc-200 rounded-lg shadow-none focus-visible:ring-1 focus-visible:ring-indigo-500/20"
                                                            />
                                                          </div>
                                                        ))
                                                      ) : (
                                                        <div className="py-6 text-center text-[11px] text-zinc-400 italic">No output fields to configure fallbacks for.</div>
                                                      )}
                                                    </div>
                                                  </div>
                                                )}
                                              </TabsContent>
                                            </Tabs>
                                          );
                                        })()}
                                      </div>
                                    ) : step.type === "API" ? (
                                      <div className="mt-3 space-y-0">
                                        <Tabs defaultValue="configure" className="w-full">
                                          <TabsList className="w-full justify-start rounded-none border-b border-zinc-200 bg-transparent p-0 h-auto">
                                            <TabsTrigger value="configure" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-4 py-2 text-xs font-semibold">Configure</TabsTrigger>
                                            <TabsTrigger value="advanced" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-4 py-2 text-xs font-semibold">Advanced</TabsTrigger>
                                            <TabsTrigger value="outputs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-4 py-2 text-xs font-semibold">Outputs</TabsTrigger>
                                            <TabsTrigger value="docs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-4 py-2 text-xs font-semibold">Docs</TabsTrigger>
                                            <TabsTrigger value="fallback" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-4 py-2 text-xs font-semibold">Fallback</TabsTrigger>
                                          </TabsList>

                                          {/* ── Configure Tab ── */}
                                          <TabsContent value="configure" className="pt-4 space-y-6">
                                            {/* Method */}
                                            <div className="space-y-1.5">
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                  <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">Method</div>
                                                  <Info className="h-3.5 w-3.5 text-zinc-400" />
                                                  <span className="bg-zinc-100 text-zinc-500 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border border-zinc-200/50">Required</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                  <Braces className="h-3.5 w-3.5 text-zinc-300" />
                                                  <Code2 className="h-3.5 w-3.5 text-zinc-300" />
                                                </div>
                                              </div>
                                              <Select value={(parsed?.method as string) || "GET"} onValueChange={(val) => updateStepConfig(step.id, (cfg) => ({ ...cfg, method: val }))}>
                                                <SelectTrigger className="h-10 text-xs bg-white border-zinc-200">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"].map((m) => (
                                                    <SelectItem key={m} value={m}>{m}</SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                            </div>

                                            {/* URL */}
                                            <div className="space-y-1.5">
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                  <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">URL</div>
                                                  <Info className="h-3.5 w-3.5 text-zinc-400" />
                                                  <span className="bg-zinc-100 text-zinc-500 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border border-zinc-200/50">Required</span>
                                                </div>
                                                <Braces className="h-3.5 w-3.5 text-zinc-300" />
                                              </div>
                                              <Input
                                                value={(parsed?.url as string) || ""}
                                                onChange={(e) => updateStepConfig(step.id, (cfg) => ({ ...cfg, url: e.target.value }))}
                                                placeholder="Type '{{' to select variable"
                                                className="h-10 text-xs bg-white border-zinc-200"
                                              />
                                            </div>

                                            {/* Body */}
                                            <div className="space-y-1.5">
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                  <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">Body</div>
                                                  <Info className="h-3.5 w-3.5 text-zinc-400" />
                                                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider border border-zinc-100 rounded px-1.5 py-0.5">Optional</span>
                                                </div>
                                                <Code2 className="h-3.5 w-3.5 text-zinc-300" />
                                              </div>
                                              <Select value={(parsed?.bodyType as string) || ""} onValueChange={(val) => updateStepConfig(step.id, (cfg) => ({ ...cfg, bodyType: val }))}>
                                                <SelectTrigger className="h-10 text-xs bg-white border-zinc-200">
                                                  <SelectValue placeholder="Select option..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="none">None</SelectItem>
                                                  <SelectItem value="json">JSON</SelectItem>
                                                  <SelectItem value="form-data">Form data</SelectItem>
                                                  <SelectItem value="raw">Raw (Plain text)</SelectItem>
                                                </SelectContent>
                                              </Select>
                                              {parsed?.bodyType === "json" && (
                                                <Textarea
                                                  value={(parsed?.body as string) || ""}
                                                  onChange={(e) => updateStepConfig(step.id, (cfg) => ({ ...cfg, body: e.target.value }))}
                                                  placeholder='{"key": "value"}'
                                                  className="h-24 text-xs font-mono bg-zinc-50 border-zinc-200 mt-2"
                                                />
                                              )}
                                            </div>

                                            {/* URL Params */}
                                            <div className="space-y-1.5">
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                  <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">URL Params</div>
                                                  <Info className="h-3.5 w-3.5 text-zinc-400" />
                                                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider border border-zinc-100 rounded px-1.5 py-0.5">Optional</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                  <Braces className="h-3.5 w-3.5 text-zinc-300" />
                                                  <Code2 className="h-3.5 w-3.5 text-zinc-300" />
                                                </div>
                                              </div>
                                              <div className="space-y-2">
                                                {(Array.isArray(parsed?.params) ? parsed.params : []).map((p: any, idx: number) => (
                                                  <div key={idx} className="flex items-center gap-2 px-1">
                                                    <Input value={p.key} placeholder="Key" className="h-8 text-xs flex-1" onChange={(e) => {
                                                      const current = Array.isArray(parsed?.params) ? parsed.params : [];
                                                      const next = [...current];
                                                      next[idx] = { ...next[idx], key: e.target.value };
                                                      updateStepConfig(step.id, (cfg) => ({ ...cfg, params: next }));
                                                    }} />
                                                    <Input value={p.value} placeholder="Value" className="h-8 text-xs flex-1" onChange={(e) => {
                                                      const current = Array.isArray(parsed?.params) ? parsed.params : [];
                                                      const next = [...current];
                                                      next[idx] = { ...next[idx], value: e.target.value };
                                                      updateStepConfig(step.id, (cfg) => ({ ...cfg, params: next }));
                                                    }} />
                                                    <button onClick={() => {
                                                      const current = Array.isArray(parsed?.params) ? parsed.params : [];
                                                      updateStepConfig(step.id, (cfg) => ({ ...cfg, params: current.filter((_: any, i: number) => i !== idx) }));
                                                    }} className="text-zinc-300 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
                                                  </div>
                                                ))}
                                                <Button variant="ghost" className="w-fit h-9 bg-white border border-zinc-200 text-zinc-900 text-xs gap-2 rounded-xl px-4 py-2 mx-auto flex" onClick={() => {
                                                  updateStepConfig(step.id, (cfg) => {
                                                    const current = Array.isArray(cfg.params) ? cfg.params : [];
                                                    return { ...cfg, params: [...current, { key: "", value: "" }] };
                                                  });
                                                }}>
                                                  <Plus className="h-4 w-4" /> Add param
                                                </Button>
                                              </div>
                                            </div>

                                            {/* Run button */}
                                            <div className="pt-4 border-t border-zinc-100">
                                              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2 h-10">
                                                <Play className="h-4 w-4" />
                                                Run step
                                              </Button>
                                            </div>
                                          </TabsContent>

                                          {/* ── Advanced Tab ── */}
                                          <TabsContent value="advanced" className="pt-4 space-y-6">
                                            <div className="space-y-4">
                                              {/* Response format */}
                                              <div className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                  <div className="flex items-center gap-2">
                                                    <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">Response format</div>
                                                    <Info className="h-3.5 w-3.5 text-zinc-400" />
                                                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider border border-zinc-100 rounded px-1.5 py-0.5">Optional</span>
                                                  </div>
                                                  <div className="flex items-center gap-1.5">
                                                    <Braces className="h-3.5 w-3.5 text-zinc-300" />
                                                    <Code2 className="h-3.5 w-3.5 text-zinc-300" />
                                                  </div>
                                                </div>
                                                <Select value={(parsed?.responseFormat as string) || "JSON"} onValueChange={(val) => updateStepConfig(step.id, (cfg) => ({ ...cfg, responseFormat: val }))}>
                                                  <SelectTrigger className="h-10 text-xs bg-white border-zinc-200">
                                                    <SelectValue placeholder="Select option..." />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="JSON">JSON</SelectItem>
                                                    <SelectItem value="TEXT">Text</SelectItem>
                                                    <SelectItem value="BINARY">Binary</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                              </div>

                                              {/* Cookies */}
                                              <div className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                  <div className="flex items-center gap-2">
                                                    <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">Cookies</div>
                                                    <Info className="h-3.5 w-3.5 text-zinc-400" />
                                                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider border border-zinc-100 rounded px-1.5 py-0.5">Optional</span>
                                                  </div>
                                                  <div className="flex items-center gap-1.5">
                                                    <Braces className="h-3.5 w-3.5 text-zinc-300" />
                                                    <Code2 className="h-3.5 w-3.5 text-zinc-300" />
                                                  </div>
                                                </div>
                                                <div className="space-y-2">
                                                  {(Array.isArray(parsed?.cookies) ? parsed.cookies : []).map((c: any, idx: number) => (
                                                    <div key={idx} className="flex items-center gap-2 px-1">
                                                      <Input value={c.key} placeholder="Key" className="h-8 text-xs flex-1" onChange={(e) => {
                                                        const current = Array.isArray(parsed?.cookies) ? parsed.cookies : [];
                                                        const next = [...current];
                                                        next[idx] = { ...next[idx], key: e.target.value };
                                                        updateStepConfig(step.id, (cfg) => ({ ...cfg, cookies: next }));
                                                      }} />
                                                      <Input value={c.value} placeholder="Value" className="h-8 text-xs flex-1" onChange={(e) => {
                                                        const current = Array.isArray(parsed?.cookies) ? parsed.cookies : [];
                                                        const next = [...current];
                                                        next[idx] = { ...next[idx], value: e.target.value };
                                                        updateStepConfig(step.id, (cfg) => ({ ...cfg, cookies: next }));
                                                      }} />
                                                      <button onClick={() => {
                                                        const current = Array.isArray(parsed?.cookies) ? parsed.cookies : [];
                                                        updateStepConfig(step.id, (cfg) => ({ ...cfg, cookies: current.filter((_: any, i: number) => i !== idx) }));
                                                      }} className="text-zinc-300 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
                                                    </div>
                                                  ))}
                                                  <Button variant="ghost" className="w-fit h-9 bg-white border border-zinc-200 text-zinc-900 text-xs gap-2 rounded-xl px-4 py-2 mx-auto flex" onClick={() => {
                                                    updateStepConfig(step.id, (cfg) => {
                                                      const current = Array.isArray(cfg.cookies) ? cfg.cookies : [];
                                                      return { ...cfg, cookies: [...current, { key: "", value: "" }] };
                                                    });
                                                  }}>
                                                    <Plus className="h-4 w-4" /> Add cookie
                                                  </Button>
                                                </div>
                                              </div>

                                              {/* Throw error on 4xx/5xx */}
                                              <div className="space-y-1.5 pt-2">
                                                <div className="flex items-center justify-between">
                                                  <div className="flex items-center gap-2">
                                                    <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">Throw error on 4xx/5xx response</div>
                                                    <Info className="h-3.5 w-3.5 text-zinc-400" />
                                                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider border border-zinc-100 rounded px-1.5 py-0.5">Optional</span>
                                                  </div>
                                                  <div className="flex items-center gap-1.5">
                                                    <Braces className="h-3.5 w-3.5 text-zinc-300" />
                                                    <Code2 className="h-3.5 w-3.5 text-zinc-300" />
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-2 p-1">
                                                  <Switch
                                                    checked={!!parsed?.throwOnHttpError}
                                                    onCheckedChange={(val) => updateStepConfig(step.id, (cfg) => ({ ...cfg, throwOnHttpError: !!val }))}
                                                  />
                                                </div>
                                              </div>
                                            </div>
                                          </TabsContent>

                                          {/* ── Outputs Tab ── */}
                                          <TabsContent value="outputs" className="pt-4 space-y-4">
                                            {(() => {
                                              const outputFields = Array.isArray(parsed?.outputFields) ? parsed.outputFields : [
                                                { name: "response_body", type: "any" },
                                                { name: "status", type: "number" }
                                              ];
                                              return (
                                                <div className="space-y-4">
                                                  {outputFields.map((field: any, idx: number) => (
                                                    <div key={idx} className="group relative rounded-xl border border-zinc-100 bg-white p-4 shadow-sm hover:border-zinc-200 transition-all">
                                                      <div className="space-y-3">
                                                        <div className="flex items-center justify-center p-3 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 font-mono text-sm">
                                                          {`{{ ${field.name} }}`}
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                          <div className="flex items-center gap-1.5 text-[11px]">
                                                            <CornerDownRight className="h-3.5 w-3.5 text-zinc-400" />
                                                            <span className="text-zinc-400">output.</span>
                                                            <span className="text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded">
                                                              {field.name}
                                                            </span>
                                                          </div>
                                                          <button className="text-zinc-300 hover:text-red-500 transition-colors"><X className="h-4 w-4" /></button>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  ))}
                                                  <Button variant="ghost" className="w-full h-10 border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-900 text-xs font-semibold gap-2 rounded-xl mt-2">
                                                    <Plus className="h-4 w-4" /> Add new output key
                                                  </Button>
                                                </div>
                                              );
                                            })()}
                                          </TabsContent>

                                          {/* ── Docs Tab ── */}
                                          <TabsContent value="docs" className="pt-4 space-y-4">
                                            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3">
                                              <div className="flex items-center gap-2 text-indigo-700 font-semibold text-xs"><Wrench className="h-4 w-4" /> API Tool Help</div>
                                              <p className="text-[11px] text-indigo-600 leading-relaxed">Execute HTTP requests to any external endpoint. Supports variable injection with <code>{`{{ var_name }}`}</code> syntax.</p>
                                              <Button variant="outline" className="w-full h-9 text-xs gap-2 bg-white border-indigo-200 text-indigo-700">
                                                <ExternalLink className="h-3.5 w-3.5" /> Platform Documentation
                                              </Button>
                                            </div>
                                          </TabsContent>

                                          {/* ── Fallback Tab ── */}
                                          <TabsContent value="fallback" className="pt-4 space-y-6">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                <div className="text-xs font-semibold text-zinc-900">Use fallback if step fails</div>
                                                <Info className="h-3.5 w-3.5 text-zinc-400" />
                                              </div>
                                              <Switch
                                                checked={!!parsed?.useFallback}
                                                onCheckedChange={(val) => updateStepConfig(step.id, (cfg) => ({ ...cfg, useFallback: !!val }))}
                                              />
                                            </div>

                                            {parsed?.useFallback && (
                                              <div className="mt-4 p-5 rounded-2xl bg-[#F8F9FB] border border-zinc-100 space-y-5 animate-in slide-in-from-top-2 duration-300">
                                                <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Set fallback values</div>
                                                <div className="space-y-6">
                                                  {[
                                                    { name: "response_body", required: true },
                                                    { name: "status", required: true },
                                                    { name: "body", required: false },
                                                    { name: "url", required: false },
                                                    { name: "response_headers", required: false, isJson: true }
                                                  ].map((field, idx) => (
                                                    <div key={idx} className="space-y-2">
                                                      <div className="flex items-center justify-between px-1">
                                                        <div className="flex items-center gap-1.5 border border-zinc-200 bg-zinc-100 px-2 py-0.5 rounded-md text-[10px] font-mono text-zinc-700">
                                                          <span className="text-zinc-400">output.</span>{field.name}
                                                        </div>
                                                        <span className="bg-zinc-200 text-zinc-600 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight">
                                                          {field.required ? 'Required' : 'Optional'}
                                                        </span>
                                                      </div>
                                                      {field.isJson ? (
                                                        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 font-mono text-[10px] text-zinc-400">
                                                          1  <span className="ml-2 text-zinc-400">{"{}"}</span>
                                                        </div>
                                                      ) : (
                                                        <Input
                                                          value={(parsed?.fallbackValues?.[field.name] as string) || ""}
                                                          onChange={(e) => {
                                                            const val = e.target.value;
                                                            updateStepConfig(step.id, (cfg) => ({
                                                              ...cfg,
                                                              fallbackValues: {
                                                                ...(cfg.fallbackValues || {}),
                                                                [field.name]: val,
                                                              },
                                                            }));
                                                          }}
                                                          placeholder="Default value"
                                                          className="h-10 text-xs bg-white border-zinc-200 rounded-lg shadow-none"
                                                        />
                                                      )}
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                          </TabsContent>
                                        </Tabs>
                                      </div>
                                    ) : step.type === "LLM" ? (
                                      <div className="mt-3 space-y-0 overflow-y-auto max-h-[calc(100vh-250px)] pr-2 custom-scrollbar">
                                        <Tabs defaultValue="configure" className="w-full">
                                          <TabsList className="w-full justify-start rounded-none border-b border-zinc-200 bg-transparent p-0 h-auto sticky top-0 z-10">
                                            <TabsTrigger value="configure" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-4 py-2 text-xs font-semibold">Configure</TabsTrigger>
                                            <TabsTrigger value="advanced" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-4 py-2 text-xs font-semibold">Advanced</TabsTrigger>
                                            <TabsTrigger value="outputs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-4 py-2 text-xs font-semibold">Outputs</TabsTrigger>
                                            <TabsTrigger value="docs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-4 py-2 text-xs font-semibold">Docs</TabsTrigger>
                                            <TabsTrigger value="fallback" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-4 py-2 text-xs font-semibold">Fallback</TabsTrigger>
                                          </TabsList>

                                          {/* ── Configure Tab ── */}
                                          <TabsContent value="configure" className="pt-4 space-y-6 pb-6">
                                            {/* Prompt */}
                                            <div className="space-y-1.5 px-0.5">
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                  <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">Prompt</div>
                                                  <Info className="h-3.5 w-3.5 text-zinc-400" />
                                                  <span className="bg-indigo-50 text-indigo-600 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Required</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                  <Braces className="h-3.5 w-3.5 text-zinc-300" />
                                                </div>
                                              </div>
                                              <div className="relative rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                                                <Textarea
                                                  value={parsed?.prompt || ""}
                                                  onChange={(e) => updateStepConfig(step.id, cfg => ({ ...cfg, prompt: e.target.value }))}
                                                  placeholder="Type a message..."
                                                  className="min-h-[140px] border-none shadow-none focus-visible:ring-0 text-sm p-3 resize-y"
                                                />
                                                <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 border-t border-zinc-100">
                                                  <div className="flex items-center gap-2">
                                                    <Switch
                                                      checked={!!parsed?.markdown}
                                                      onCheckedChange={(val) => updateStepConfig(step.id, cfg => ({ ...cfg, markdown: val }))}
                                                      className="scale-75"
                                                    />
                                                    <span className="text-[10px] font-medium text-zinc-600">Markdown</span>
                                                    <Info className="h-3 w-3 text-zinc-400" />
                                                  </div>
                                                  <span className="ml-auto text-[10px] text-zinc-400">Use {"{{"} to access variables</span>
                                                </div>
                                              </div>
                                            </div>

                                            {/* Your Model */}
                                            <div className="space-y-1.5 px-0.5">
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                  <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">Your model</div>
                                                  <Info className="h-3.5 w-3.5 text-zinc-400" />
                                                  <span className="bg-zinc-100 text-zinc-500 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border border-zinc-200/50">Optional</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                  <Braces className="h-3.5 w-3.5 text-zinc-300" />
                                                  <Code2 className="h-3.5 w-3.5 text-zinc-300" />
                                                </div>
                                              </div>
                                              <Select
                                                value={parsed?.model || "gpt-4o-mini"}
                                                onValueChange={(val) => updateStepConfig(step.id, cfg => ({ ...cfg, model: val }))}
                                              >
                                                <SelectTrigger className="h-10 text-xs bg-white border-zinc-200 rounded-lg shadow-sm">
                                                  <SelectValue placeholder="Select model..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="gpt-4o-mini">Cost-optimized Model (GPT-4o Mini)</SelectItem>
                                                  <SelectItem value="gpt-4o">High-performance Model (GPT-4o)</SelectItem>
                                                  <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>

                                            {/* Run step */}
                                            <div className="pt-4 border-t border-zinc-100">
                                              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2 h-11 rounded-xl shadow-lg shadow-indigo-500/10 font-bold transition-all active:scale-[0.98]">
                                                <Play className="h-4 w-4 fill-current" />
                                                Run step
                                              </Button>
                                            </div>
                                          </TabsContent>

                                          {/* ── Advanced Tab ── */}
                                          <TabsContent value="advanced" className="pt-4 space-y-6 pb-6">
                                            {/* Fallback Model */}
                                            <div className="space-y-1.5 px-0.5">
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                  <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">Fallback Model</div>
                                                  <Info className="h-3.5 w-3.5 text-zinc-400" />
                                                  <span className="bg-zinc-100 text-zinc-500 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border border-zinc-200/50">Optional</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                  <Braces className="h-3.5 w-3.5 text-zinc-300" />
                                                  <Code2 className="h-3.5 w-3.5 text-zinc-300" />
                                                </div>
                                              </div>
                                              <Select value={parsed?.fallbackModel || ""} onValueChange={(val) => updateStepConfig(step.id, cfg => ({ ...cfg, fallbackModel: val }))}>
                                                <SelectTrigger className="h-10 text-xs bg-white border-zinc-200 rounded-lg shadow-none">
                                                  <SelectValue placeholder="Select Model" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                                                  <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>

                                            {/* System Prompt */}
                                            <div className="space-y-1.5 px-0.5">
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                  <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">System Prompt</div>
                                                  <Info className="h-3.5 w-3.5 text-zinc-400" />
                                                  <span className="bg-zinc-100 text-zinc-500 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border border-zinc-200/50">Optional</span>
                                                </div>
                                                <Braces className="h-3.5 w-3.5 text-zinc-300" />
                                              </div>
                                              <div className="relative rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                                                <Textarea
                                                  value={parsed?.systemPrompt || ""}
                                                  onChange={(e) => updateStepConfig(step.id, cfg => ({ ...cfg, systemPrompt: e.target.value }))}
                                                  placeholder="Type a message..."
                                                  className="min-h-[120px] border-none shadow-none focus-visible:ring-0 text-sm p-3 resize-y"
                                                />
                                                <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 border-t border-zinc-100">
                                                  <Switch checked={!!parsed?.systemMarkdown} onCheckedChange={(val) => updateStepConfig(step.id, cfg => ({ ...cfg, systemMarkdown: val }))} className="scale-75" />
                                                  <span className="text-[10px] font-medium text-zinc-600">Markdown</span>
                                                  <Info className="h-3 w-3 text-zinc-400" />
                                                  <span className="ml-auto text-[10px] text-zinc-400">Use {"{{"} to access variables</span>
                                                </div>
                                              </div>
                                            </div>

                                            {/* Grid of other options */}
                                            <div className="grid grid-cols-1 gap-5 px-0.5">
                                              <div className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                  <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">Temperature</div>
                                                  <div className="flex items-center gap-1.5">
                                                    <Braces className="h-3.5 w-3.5 text-zinc-300" />
                                                    <Code2 className="h-3.5 w-3.5 text-zinc-300" />
                                                  </div>
                                                </div>
                                                <Input type="number" step="0.1" value={parsed?.temperature ?? 0} onChange={(e) => updateStepConfig(step.id, cfg => ({ ...cfg, temperature: parseFloat(e.target.value) }))} className="h-10 text-xs rounded-lg" />
                                              </div>

                                              <div className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                  <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">Thinking / Reasoning Configuration</div>
                                                  <Braces className="h-3.5 w-3.5 text-zinc-300" />
                                                </div>
                                                <Select value={parsed?.thinkingConfig || ""} onValueChange={(val) => updateStepConfig(step.id, cfg => ({ ...cfg, thinkingConfig: val }))}>
                                                  <SelectTrigger className="h-10 text-xs bg-white border-zinc-200 rounded-lg">
                                                    <SelectValue placeholder="Select option..." />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="none">Disabled</SelectItem>
                                                    <SelectItem value="low">Low reasoning</SelectItem>
                                                    <SelectItem value="high">High reasoning</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                              </div>

                                              <div className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                  <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">Force Response Format</div>
                                                  <div className="flex items-center gap-1.5">
                                                    <Braces className="h-3.5 w-3.5 text-zinc-300" />
                                                    <Code2 className="h-3.5 w-3.5 text-zinc-300" />
                                                  </div>
                                                </div>
                                                <Select value={parsed?.responseFormat || ""} onValueChange={(val) => updateStepConfig(step.id, cfg => ({ ...cfg, responseFormat: val }))}>
                                                  <SelectTrigger className="h-10 text-xs bg-white border-zinc-200 rounded-lg">
                                                    <SelectValue placeholder="Select option..." />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="text">Plain Text</SelectItem>
                                                    <SelectItem value="json">JSON Object</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                              </div>

                                              <div className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                  <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">Max Output Tokens</div>
                                                  <div className="flex items-center gap-1.5">
                                                    <Braces className="h-3.5 w-3.5 text-zinc-300" />
                                                    <Code2 className="h-3.5 w-3.5 text-zinc-300" />
                                                  </div>
                                                </div>
                                                <Input type="number" placeholder="Enter number..." value={parsed?.maxTokens ?? ""} onChange={(e) => updateStepConfig(step.id, cfg => ({ ...cfg, maxTokens: parseInt(e.target.value) }))} className="h-10 text-xs rounded-lg" />
                                              </div>

                                              <div className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                  <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">Seed</div>
                                                  <div className="flex items-center gap-1.5">
                                                    <Braces className="h-3.5 w-3.5 text-zinc-300" />
                                                    <Code2 className="h-3.5 w-3.5 text-zinc-300" />
                                                  </div>
                                                </div>
                                                <Input type="number" placeholder="Enter number..." value={parsed?.seed ?? ""} onChange={(e) => updateStepConfig(step.id, cfg => ({ ...cfg, seed: parseInt(e.target.value) }))} className="h-10 text-xs rounded-lg" />
                                              </div>

                                              <div className="flex items-center justify-between pt-2">
                                                <div className="flex items-center gap-2">
                                                  <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">Validators</div>
                                                  <Sparkles className="h-3.5 w-3.5 text-indigo-500 fill-indigo-100" />
                                                  <Info className="h-3.5 w-3.5 text-zinc-400" />
                                                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider border border-zinc-100 rounded px-1.5 py-0.5">Optional</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                  <Switch checked={!!parsed?.useValidators} onCheckedChange={(val) => updateStepConfig(step.id, cfg => ({ ...cfg, useValidators: val }))} />
                                                  <Braces className="h-3.5 w-3.5 text-zinc-300" />
                                                </div>
                                              </div>
                                            </div>
                                          </TabsContent>

                                          {/* ── Outputs Tab ── */}
                                          <TabsContent value="outputs" className="pt-4 space-y-4 pb-6 px-0.5">
                                            {(() => {
                                              const outputFields = Array.isArray(parsed?.outputFields) && parsed.outputFields.length > 0
                                                ? parsed.outputFields
                                                : [{ name: "answer", type: "string" }];

                                              return (
                                                <div className="space-y-4">
                                                  <div className="text-[11px] text-zinc-500 mb-2 leading-relaxed">Map the model response to specific output keys.</div>
                                                  {outputFields.map((field: any, idx: number) => (
                                                    <div key={idx} className="group relative rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all">
                                                      <div className="space-y-4">
                                                        <div className="flex items-center justify-center p-4 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 font-mono text-sm">
                                                          {"{{ "}{field.name || 'unnamed'}{" }}"}
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                          <div className="flex items-center gap-2 text-xs">
                                                            <CornerDownRight className="h-4 w-4 text-zinc-300" />
                                                            <span className="text-zinc-400">output.</span>
                                                            <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">
                                                              {field.name || '...'}
                                                            </span>
                                                          </div>
                                                          <button
                                                            onClick={() => updateStepConfig(step.id, cfg => ({ ...cfg, outputFields: (cfg.outputFields || []).filter((_: any, i: number) => i !== idx) }))}
                                                            className="text-zinc-300 hover:text-red-500 transition-colors"
                                                          >
                                                            <X className="h-4 w-4" />
                                                          </button>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  ))}
                                                  <Button
                                                    variant="ghost"
                                                    className="w-full h-11 border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-900 text-xs font-semibold gap-2 rounded-xl mt-2 shadow-sm"
                                                    onClick={() => updateStepConfig(step.id, cfg => ({ ...cfg, outputFields: [...(cfg.outputFields || []), { name: "", type: "string" }] }))}
                                                  >
                                                    <Plus className="h-4 w-4" /> Add new output key
                                                  </Button>
                                                </div>
                                              )
                                            })()}
                                          </TabsContent>

                                          {/* ── Fallback Tab ── */}
                                          <TabsContent value="fallback" className="pt-4 space-y-6 pb-6 px-0.5">
                                            <div className="flex items-center justify-between">
                                              <div className="space-y-1">
                                                <div className="text-xs font-semibold text-zinc-900">Use fallback if step fails</div>
                                                <div className="text-[10px] text-zinc-500">Enable default values for when LLM errors.</div>
                                              </div>
                                              <Switch
                                                checked={!!parsed?.useFallback}
                                                onCheckedChange={(val) => updateStepConfig(step.id, (cfg) => ({ ...cfg, useFallback: !!val }))}
                                              />
                                            </div>

                                            {parsed?.useFallback && (
                                              <div className="mt-4 p-5 rounded-2xl bg-[#F8F9FB] border border-zinc-100 space-y-6 animate-in slide-in-from-top-2 duration-300">
                                                <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Set fallback values</div>
                                                <div className="space-y-6">
                                                  {(Array.isArray(parsed?.outputFields) ? parsed.outputFields : [{ name: 'answer' }]).map((field: any, idx: number) => (
                                                    <div key={idx} className="space-y-2">
                                                      <div className="flex items-center justify-between px-1">
                                                        <div className="flex items-center gap-1.5 border border-zinc-200 bg-zinc-100 px-2.5 py-1 rounded-lg text-[10px] font-mono text-zinc-700 shadow-sm">
                                                          <span className="text-zinc-400">output.</span>{field.name || 'answer'}
                                                        </div>
                                                        <span className="bg-zinc-200 text-zinc-600 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight">
                                                          Required
                                                        </span>
                                                      </div>
                                                      <Input
                                                        value={(parsed?.fallbackValues?.[field.name] as string) || ""}
                                                        onChange={(e) => {
                                                          const val = e.target.value;
                                                          updateStepConfig(step.id, (cfg) => ({
                                                            ...cfg,
                                                            fallbackValues: {
                                                              ...(cfg.fallbackValues || {}),
                                                              [field.name]: val,
                                                            },
                                                          }));
                                                        }}
                                                        placeholder="Default value"
                                                        className="h-11 text-xs bg-white border-zinc-200 rounded-xl shadow-none focus-visible:ring-1 focus-visible:ring-indigo-500/20"
                                                      />
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                          </TabsContent>
                                        </Tabs>
                                      </div>
                                    ) : (parsed?.kind === "PYTHON" || parsed?.kind === "JAVASCRIPT") ? (
                                      // ── Rich code-step editor (Relevance AI style) ──────────────
                                      <div className="mt-3 space-y-0">
                                        <Tabs defaultValue="configure" className="w-full">
                                          <TabsList className="w-full justify-start rounded-none border-b border-zinc-200 bg-transparent p-0 h-auto">
                                            <TabsTrigger
                                              value="configure"
                                              className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-4 py-2 text-xs font-semibold"
                                            >
                                              Configure
                                            </TabsTrigger>
                                            <TabsTrigger
                                              value="advanced"
                                              className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-4 py-2 text-xs font-semibold"
                                            >
                                              Advanced
                                            </TabsTrigger>
                                            <TabsTrigger
                                              value="outputs"
                                              className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-4 py-2 text-xs font-semibold"
                                            >
                                              Outputs
                                            </TabsTrigger>
                                            <TabsTrigger
                                              value="docs"
                                              className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-4 py-2 text-xs font-semibold"
                                            >
                                              Docs
                                            </TabsTrigger>
                                            <TabsTrigger
                                              value="fallback"
                                              className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-4 py-2 text-xs font-semibold"
                                            >
                                              Fallback
                                            </TabsTrigger>
                                          </TabsList>

                                          {/* ── Configure Tab ── */}
                                          <TabsContent value="configure" className="pt-4 space-y-4">
                                            {/* Language badge + switch */}
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold border ${parsed?.kind === "PYTHON" ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-yellow-50 border-yellow-200 text-yellow-700"}`}>
                                                  <Code className="h-3 w-3" />
                                                  {parsed?.kind === "PYTHON" ? "Python 3" : "JavaScript (Node)"}
                                                </span>
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const nextKind = parsed?.kind === "PYTHON" ? "JAVASCRIPT" : "PYTHON";
                                                  const nextCode = nextKind === "PYTHON" ? "# Write your Python code here\n# Access inputs via: params['input_name']\n\nresult = params.get('text', '')\nreturn {'output': result}" : "// Write your JavaScript code here\n// Access inputs via: params.input_name\n\nconst result = params.text || '';\nreturn { output: result };";
                                                  updateStepConfig(step.id, (cfg) => ({
                                                    ...cfg,
                                                    kind: nextKind,
                                                    code: nextCode,
                                                  }));
                                                }}
                                                className="text-[11px] text-zinc-500 hover:text-zinc-800 underline underline-offset-2"
                                              >
                                                Switch to {parsed?.kind === "PYTHON" ? "JavaScript" : "Python"}
                                              </button>
                                            </div>

                                            {/* Code editor */}
                                            <div className="space-y-1.5">
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                  <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">Code</div>
                                                  <TooltipProvider>
                                                    <Tooltip>
                                                      <TooltipTrigger><Info className="h-3 w-3 text-zinc-400" /></TooltipTrigger>
                                                      <TooltipContent><p className="text-[10px]">The code to execute. Access inputs via <code>params</code>.</p></TooltipContent>
                                                    </Tooltip>
                                                  </TooltipProvider>
                                                  <span className="bg-zinc-100 text-zinc-500 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Required</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      const defaultCode = parsed?.kind === "PYTHON"
                                                        ? "# Write your Python code here\n# Access inputs via: params['input_name']\n\nresult = params.get('text', '')\nreturn {'output': result}"
                                                        : "// Write your JavaScript code here\n// Access inputs via: params.input_name\n\nconst result = params.text || '';\nreturn { output: result };";
                                                      updateStepConfig(step.id, (cfg) => ({ ...cfg, code: defaultCode }));
                                                    }}
                                                    className="text-[11px] text-zinc-400 hover:text-zinc-700 mr-2"
                                                  >
                                                    Reset
                                                  </button>
                                                  <div className="flex items-center gap-1.5 border-l border-zinc-200 pl-3">
                                                    <Braces className="h-3.5 w-3.5 text-zinc-300" />
                                                    <Code2 className="h-3.5 w-3.5 text-zinc-300" />
                                                  </div>
                                                </div>
                                              </div>
                                              <div className="rounded-lg border border-zinc-300 overflow-hidden shadow-sm">
                                                <div className={`flex items-center gap-2 px-3 py-2 border-b border-zinc-200 ${parsed?.kind === "PYTHON" ? "bg-blue-950" : "bg-zinc-900"}`}>
                                                  <div className="flex gap-1.5">
                                                    <span className="h-2.5 w-2.5 rounded-full bg-red-400 opacity-80" />
                                                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-400 opacity-80" />
                                                    <span className="h-2.5 w-2.5 rounded-full bg-green-400 opacity-80" />
                                                  </div>
                                                  <span className="text-[10px] font-medium text-zinc-400 ml-1">
                                                    {parsed?.kind === "PYTHON" ? "main.py" : "main.js"}
                                                  </span>
                                                </div>
                                                <textarea
                                                  value={(parsed?.code as string) ?? ""}
                                                  onChange={(e) =>
                                                    updateStepConfig(step.id, (cfg) => ({
                                                      ...cfg,
                                                      code: e.target.value,
                                                    }))
                                                  }
                                                  spellCheck={false}
                                                  className={`w-full resize-none font-mono text-[12px] leading-relaxed p-4 focus:outline-none min-h-[240px] ${parsed?.kind === "PYTHON" ? "bg-blue-950 text-blue-100" : "bg-zinc-900 text-green-100"}`}
                                                />
                                              </div>
                                            </div>

                                            {/* PyPI Packages section */}
                                            {parsed?.kind === "PYTHON" && (
                                              <div className="space-y-3 mt-4">
                                                <div className="flex items-center gap-2">
                                                  <div className="text-xs font-semibold text-zinc-900">PyPI Packages</div>
                                                  <TooltipProvider>
                                                    <Tooltip>
                                                      <TooltipTrigger>
                                                        <Info className="h-3.5 w-3.5 text-zinc-400" />
                                                      </TooltipTrigger>
                                                      <TooltipContent>
                                                        <p className="text-[10px]">Additional Python packages to be available in the environment.</p>
                                                      </TooltipContent>
                                                    </Tooltip>
                                                  </TooltipProvider>
                                                  <span className="text-[10px] text-zinc-400">Optional</span>
                                                  <div className="ml-auto flex items-center gap-2">
                                                    <Braces className="h-3.5 w-3.5 text-zinc-300" />
                                                    <Code2 className="h-3.5 w-3.5 text-zinc-300" />
                                                  </div>
                                                </div>
                                                <div className="space-y-2">
                                                  {(Array.isArray(parsed?.packages) ? parsed.packages : []).map((pkg: string, idx: number) => (
                                                    <div key={idx} className="flex items-center gap-2">
                                                      <Input
                                                        value={pkg}
                                                        className="h-9 text-xs"
                                                        onChange={(e) => {
                                                          const current = Array.isArray(parsed?.packages) ? parsed.packages : [];
                                                          const newPkgs = [...current];
                                                          newPkgs[idx] = e.target.value;
                                                          updateStepConfig(step.id, (cfg) => ({ ...cfg, packages: newPkgs }));
                                                        }}
                                                      />
                                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400"
                                                        onClick={() => {
                                                          const current = Array.isArray(parsed?.packages) ? parsed.packages : [];
                                                          const newPkgs = current.filter((_: any, i: number) => i !== idx);
                                                          updateStepConfig(step.id, (cfg) => ({ ...cfg, packages: newPkgs }));
                                                        }}
                                                      >
                                                        <Trash2 className="h-4 w-4" />
                                                      </Button>
                                                    </div>
                                                  ))}
                                                  <Button
                                                    variant="secondary"
                                                    className="w-full h-9 bg-zinc-100/50 hover:bg-zinc-100 text-zinc-500 text-xs gap-2"
                                                    onClick={() => {
                                                      updateStepConfig(step.id, (cfg) => {
                                                        const current = Array.isArray(cfg.packages) ? cfg.packages : [];
                                                        return { ...cfg, packages: [...current, ""] };
                                                      });
                                                    }}
                                                  >
                                                    <Plus className="h-3.5 w-3.5" />
                                                    New item
                                                  </Button>
                                                </div>
                                              </div>
                                            )}

                                            {/* Run step button */}
                                            <div className="pt-4 border-t border-zinc-100">
                                              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2 h-10">
                                                <Play className="h-4 w-4" />
                                                Run step
                                              </Button>
                                            </div>
                                          </TabsContent>

                                          {/* ── Advanced Tab ── */}
                                          <TabsContent value="advanced" className="pt-4 space-y-6">
                                            {parsed?.kind === "JAVASCRIPT" ? (
                                              <div className="space-y-4">
                                                <div className="space-y-2">
                                                  <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                      <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">Runtime</div>
                                                      <TooltipProvider>
                                                        <Tooltip>
                                                          <TooltipTrigger><Info className="h-3 w-3 text-zinc-400" /></TooltipTrigger>
                                                          <TooltipContent><p className="text-[10px]">Select the JavaScript runtime environment.</p></TooltipContent>
                                                        </Tooltip>
                                                      </TooltipProvider>
                                                      <span className="bg-zinc-100 text-zinc-400 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Optional</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                      <Braces className="h-3.5 w-3.5 text-zinc-300" />
                                                      <Code2 className="h-3.5 w-3.5 text-zinc-300" />
                                                    </div>
                                                  </div>
                                                  <Select
                                                    value={(parsed?.runtime as string) || "modal-node"}
                                                    onValueChange={(val) => updateStepConfig(step.id, (cfg) => ({ ...cfg, runtime: val }))}
                                                  >
                                                    <SelectTrigger className="h-10 text-xs text-zinc-900 bg-white border-zinc-200">
                                                      <SelectValue placeholder="Select runtime..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="deno">deno</SelectItem>
                                                      <SelectItem value="modal-node">modal-node</SelectItem>
                                                      <SelectItem value="Deno">Deno</SelectItem>
                                                      <SelectItem value="modal-node-deprecated">Modal Labs Node.js (deprecated)</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </div>
                                              </div>
                                            ) : (
                                              <>
                                                <div className="space-y-3">
                                                  <div className="flex items-center gap-2">
                                                    <div className="text-xs font-semibold text-zinc-900">Runtime Commands</div>
                                                    <span className="text-[10px] text-zinc-400">Optional</span>
                                                  </div>
                                                  <div className="space-y-2">
                                                    {(Array.isArray(parsed?.runtimeCommands) ? parsed.runtimeCommands : []).map((cmd: string, idx: number) => (
                                                      <div key={idx} className="flex items-center gap-2">
                                                        <Input
                                                          value={cmd}
                                                          className="h-9 text-xs"
                                                          onChange={(e) => {
                                                            const current = Array.isArray(parsed?.runtimeCommands) ? parsed.runtimeCommands : [];
                                                            const newCmds = [...current];
                                                            newCmds[idx] = e.target.value;
                                                            updateStepConfig(step.id, (cfg) => ({ ...cfg, runtimeCommands: newCmds }));
                                                          }}
                                                        />
                                                      </div>
                                                    ))}
                                                    <Button
                                                      variant="secondary"
                                                      className="w-full h-9 bg-zinc-100/50 hover:bg-zinc-100 text-zinc-500 text-xs"
                                                      onClick={() => {
                                                        updateStepConfig(step.id, (cfg) => {
                                                          const current = Array.isArray(cfg.runtimeCommands) ? cfg.runtimeCommands : [];
                                                          return { ...cfg, runtimeCommands: [...current, ""] };
                                                        });
                                                      }}
                                                    >
                                                      <Plus className="h-3.5 w-3.5 mr-2" />
                                                      New item
                                                    </Button>
                                                  </div>
                                                </div>

                                                <div className="space-y-2">
                                                  <div className="text-xs font-semibold text-zinc-900">Session ID <span className="text-[10px] font-normal text-zinc-400">Optional</span></div>
                                                  <Input
                                                    value={(parsed?.sessionId as string) ?? ""}
                                                    onChange={(e) => updateStepConfig(step.id, (cfg) => ({ ...cfg, sessionId: e.target.value }))}
                                                    placeholder="Type '{{' to select variable"
                                                    className="h-10 text-xs"
                                                  />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                  <div className="space-y-2">
                                                    <div className="text-xs font-semibold text-zinc-900">GPUs</div>
                                                    <Select value={String(parsed?.gpus ?? 0)} onValueChange={(val) => updateStepConfig(step.id, (cfg) => ({ ...cfg, gpus: Number(val) }))}>
                                                      <SelectTrigger className="h-10 text-xs text-zinc-900"><SelectValue /></SelectTrigger>
                                                      <SelectContent><SelectItem value="0">0</SelectItem><SelectItem value="1">1</SelectItem><SelectItem value="2">2</SelectItem></SelectContent>
                                                    </Select>
                                                  </div>
                                                  <div className="space-y-2">
                                                    <div className="text-xs font-semibold text-zinc-900">CPU Cores</div>
                                                    <Select value={String(parsed?.cpus ?? 1)} onValueChange={(val) => updateStepConfig(step.id, (cfg) => ({ ...cfg, cpus: Number(val) }))}>
                                                      <SelectTrigger className="h-10 text-xs text-zinc-900"><SelectValue /></SelectTrigger>
                                                      <SelectContent><SelectItem value="1">1</SelectItem><SelectItem value="2">2</SelectItem><SelectItem value="4">4</SelectItem></SelectContent>
                                                    </Select>
                                                  </div>
                                                </div>

                                                <div className="space-y-2">
                                                  <div className="text-xs font-semibold text-zinc-900">Memory (MB)</div>
                                                  <Input type="number" value={(parsed?.memory as number) ?? 512} onChange={(e) => updateStepConfig(step.id, (cfg) => ({ ...cfg, memory: Number(e.target.value) }))} className="h-10 text-xs" />
                                                </div>

                                                <div className="space-y-2">
                                                  <div className="text-xs font-semibold text-zinc-900">Timeout (sec)</div>
                                                  <Input type="number" value={(parsed?.timeout as number) ?? 600} onChange={(e) => updateStepConfig(step.id, (cfg) => ({ ...cfg, timeout: Number(e.target.value) }))} className="h-10 text-xs" />
                                                </div>

                                                <div className="flex items-center justify-between">
                                                  <div className="text-xs font-semibold text-zinc-900">Fallback</div>
                                                  <Switch checked={!!parsed?.fallback} onCheckedChange={(val) => updateStepConfig(step.id, (cfg) => ({ ...cfg, fallback: !!val }))} />
                                                </div>
                                              </>
                                            )}
                                          </TabsContent>

                                          {/* ── Outputs Tab ── */}
                                          <TabsContent value="outputs" className="pt-4 space-y-4">
                                            {(() => {
                                              const outputFields: any[] = parsed?.outputFields || [];
                                              return (
                                                <div className="space-y-4">
                                                  {outputFields.map((field: any, idx: number) => (
                                                    <div key={idx} className="group relative rounded-xl border border-zinc-100 bg-white p-4 shadow-sm hover:border-zinc-200 transition-all">
                                                      <div className="space-y-3">
                                                        {/* Variable Preview */}
                                                        <div className="flex items-center justify-center p-3 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 font-mono text-sm">
                                                          {`{{ ${field.name || '...'} }}`}
                                                        </div>

                                                        {/* Path Label + Delete */}
                                                        <div className="flex items-center justify-between">
                                                          <div className="flex items-center gap-1.5 text-[11px]">
                                                            <CornerDownRight className="h-3.5 w-3.5 text-zinc-400" />
                                                            <span className="text-zinc-400">output.</span>
                                                            <span className="text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded cursor-pointer hover:bg-indigo-100 transition-colors">
                                                              {field.name || 'unnamed'}
                                                            </span>
                                                          </div>
                                                          <button
                                                            type="button"
                                                            onClick={() => {
                                                              updateStepConfig(step.id, (cfg) => {
                                                                const current = Array.isArray(cfg.outputFields) ? cfg.outputFields : [];
                                                                return {
                                                                  ...cfg,
                                                                  outputFields: current.filter((_: any, i: number) => i !== idx),
                                                                };
                                                              });
                                                            }}
                                                            className="text-zinc-300 hover:text-red-500 transition-colors outline-none"
                                                          >
                                                            <X className="h-4 w-4" />
                                                          </button>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  ))}

                                                  <Button
                                                    variant="ghost"
                                                    className="w-full h-10 border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-900 text-xs font-semibold gap-2 rounded-xl mt-2"
                                                    onClick={() => {
                                                      updateStepConfig(step.id, (cfg) => {
                                                        const current = Array.isArray(cfg.outputFields) ? cfg.outputFields : [];
                                                        return {
                                                          ...cfg,
                                                          outputFields: [
                                                            ...current,
                                                            { name: "new_key", type: "string" }
                                                          ],
                                                        };
                                                      });
                                                    }}
                                                  >
                                                    <Plus className="h-4 w-4" />
                                                    Add new output key
                                                  </Button>
                                                </div>
                                              );
                                            })()}
                                          </TabsContent>

                                          {/* ── Docs Tab ── */}
                                          <TabsContent value="docs" className="pt-4 space-y-4">
                                            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-3">
                                              <div className="flex items-center gap-2 text-blue-700 font-semibold text-xs"><StickyNote className="h-4 w-4" /> Documentation</div>
                                              <p className="text-[11px] text-blue-600 leading-relaxed">Learn how to use built-in helper functions like <code>run_step</code> and <code>prompt_completion</code>.</p>
                                              <Button variant="outline" className="w-full h-9 text-xs gap-2 bg-white border-blue-200 text-blue-700" onClick={() => window.open('https://relevanceai.com/docs/build/tools/tool-steps/python-code/code-python-helper-functions', '_blank')}>
                                                <ExternalLink className="h-3.5 w-3.5" /> View Documentation
                                              </Button>
                                            </div>
                                          </TabsContent>

                                          {/* ── Fallback Tab ── */}
                                          <TabsContent value="fallback" className="pt-4 space-y-6">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                <div className="text-xs font-semibold text-zinc-900">Use fallback if step fails</div>
                                                <TooltipProvider>
                                                  <Tooltip>
                                                    <TooltipTrigger><Info className="h-3.5 w-3.5 text-zinc-400" /></TooltipTrigger>
                                                    <TooltipContent><p className="text-[10px]">When enabled, the step will use these default values instead of failing if the execution errors.</p></TooltipContent>
                                                  </Tooltip>
                                                </TooltipProvider>
                                              </div>
                                              <Switch
                                                checked={!!parsed?.useFallback}
                                                onCheckedChange={(val) => updateStepConfig(step.id, (cfg) => ({ ...cfg, useFallback: !!val }))}
                                              />
                                            </div>

                                            {parsed?.useFallback && (
                                              <div className="mt-4 p-5 rounded-2xl bg-[#F8F9FB] border border-zinc-100 space-y-5 animate-in slide-in-from-top-2 duration-300">
                                                <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Set fallback values</div>
                                                <div className="space-y-6">
                                                  {(Array.isArray(parsed?.outputFields) ? parsed.outputFields : []).length > 0 ? (
                                                    (Array.isArray(parsed?.outputFields) ? parsed.outputFields : []).map((field: any, idx: number) => (
                                                      <div key={idx} className="space-y-2">
                                                        <div className="flex items-center justify-between px-1">
                                                          <div className="flex items-center gap-1.5 border border-zinc-200 bg-zinc-100 px-2 py-0.5 rounded-md text-[10px] font-mono text-zinc-700">
                                                            <span className="text-zinc-400">output.</span>{field.name || 'unnamed'}
                                                          </div>
                                                          <span className="bg-zinc-200 text-zinc-600 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight">
                                                            {field.required ? 'Required' : 'Optional'}
                                                          </span>
                                                        </div>
                                                        <Input
                                                          value={(parsed?.fallbackValues?.[field.name] as string) || ""}
                                                          onChange={(e) => {
                                                            const val = e.target.value;
                                                            updateStepConfig(step.id, (cfg) => ({
                                                              ...cfg,
                                                              fallbackValues: {
                                                                ...(cfg.fallbackValues || {}),
                                                                [field.name]: val,
                                                              },
                                                            }));
                                                          }}
                                                          placeholder="Default value"
                                                          className="h-10 text-xs bg-white border-zinc-200 rounded-lg shadow-none focus-visible:ring-1 focus-visible:ring-indigo-500/20"
                                                        />
                                                      </div>
                                                    ))
                                                  ) : (
                                                    <div className="py-6 text-center">
                                                      <p className="text-[11px] text-zinc-400 italic">No output fields defined.</p>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                          </TabsContent>

                                          {/* ── JSON tab ── */}
                                          <TabsContent value="json" className="pt-4">
                                            <div className="text-[11px] text-zinc-500 mb-1">Raw step config (JSON)</div>
                                            <Textarea value={step.config} onChange={(e) => setSteps((prev) => prev.map((s) => s.id === step.id ? { ...s, config: e.target.value } : s))} className="min-h-[160px] font-mono text-[11px]" />
                                          </TabsContent>
                                        </Tabs>
                                      </div>
                                    ) : (
                                      <div className="mt-2">
                                        <div className="text-[11px] text-zinc-500 mb-1">Step config (JSON)</div>
                                        <Textarea
                                          value={step.config}
                                          onChange={(e) =>
                                            setSteps((prev) =>
                                              prev.map((s) => (s.id === step.id ? { ...s, config: e.target.value } : s)),
                                            )
                                          }
                                          className="min-h-[140px] font-mono text-[11px]"
                                          placeholder='{"prompt":"Use {{inputs.text}}..."}'
                                        />
                                      </div>
                                      );
                                })()}
                              </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tool settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 flex items-center justify-center rounded-md bg-zinc-100 text-sm font-semibold text-zinc-800">
                {toolIcon || "T"}
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Icon (emoji or letter)
                </label>
                <Input
                  value={toolIcon}
                  onChange={(e) => setToolIcon(e.target.value.slice(0, 2))}
                  placeholder="e.g. 🧰"
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Title
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="New Workflow Tool"
                className="h-8 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Description
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this tool does…"
                className="min-h-[80px] text-sm"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                size="sm"
                className="h-8 px-4 text-xs"
                onClick={() => setSettingsOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assistant is now a left sidebar */ }
      
      <MarketplaceGuardDialog isOpen={isGuardOpen} onOpenChange={setIsGuardOpen} />
      {isPublishModalOpen && (
          <PublishEntityModal 
              open={isPublishModalOpen} 
              onOpenChange={setIsPublishModalOpen} 
              entityType="tool"
              entityId={initialTool?.id || ""}
              initialTitle={name}
              initialDescription={description}
          />
      )}
    </>
  );
}

export default ToolBuilderView;

