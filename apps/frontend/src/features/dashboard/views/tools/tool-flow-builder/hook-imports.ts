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
import { PlusEdge } from "@/entities/tools/components/builder/edges/PlusEdge";
import { useToolRun } from "@/entities/tools/hooks/useToolRun";
import type { ToolOp } from "@/entities/tools/components/assistant/types";
import { useMarketplaceGuard } from "@/features/marketplace/hooks/useMarketplaceGuard";
import type { ToolFlowBuilderViewProps } from "./types";
