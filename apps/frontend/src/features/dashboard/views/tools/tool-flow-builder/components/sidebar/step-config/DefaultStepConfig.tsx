"use client";

import React from "react";
import {
  Bot, Braces, Check, ChevronRight, Code, Code2, CornerDownRight, ExternalLink,
  GitBranch, Info, List, Maximize2, Pencil, Play, Plus, Repeat, Settings, Settings2,
  Sparkles, Trash2, Wrench, X,
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

import type { StepConfigBaseProps } from "../types";

export function DefaultStepConfig(props: StepConfigBaseProps) {
const { api, step, parsed, varTree } = props;
  const { updateStepConfig, setSteps, systemToolsQuery } = api;

  return (
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
}
