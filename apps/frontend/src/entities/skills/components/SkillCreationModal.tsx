"use client";

import React, { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Sparkles,
  Workflow,
  ShieldCheck,
  FileCode,
  Layers,
  Settings2,
  Tag,
  Loader2,
  Info,
} from "lucide-react";
import { skillFormSchema, SkillFormData } from "../validations/skill.schema";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { SkillSummary } from "../types";

interface SkillCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skillToEdit?: SkillSummary | null;
  onSuccess?: () => void;
}

const PRESET_ICONS = ["⚡", "🤖", "✍️", "💻", "🔬", "📊", "🎯", "🌐", "🛠️", "📢", "🎧", "🗺️", "📁", "🔒", "🎨"];
const PRESET_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

const CATEGORIES = [
  { value: "creative", label: "Creative & Content" },
  { value: "technical", label: "Technical & Code" },
  { value: "automation", label: "Automation & Research" },
  { value: "business", label: "Business & Management" },
  { value: "custom", label: "Custom Domain" },
];

export function SkillCreationModal({
  open,
  onOpenChange,
  skillToEdit,
  onSuccess,
}: SkillCreationModalProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState("basic");
  const [tagInput, setTagInput] = useState("");
  const [triggerInput, setTriggerInput] = useState("");

  const isEditing = !!skillToEdit;

  const form = useForm<SkillFormData>({
    resolver: zodResolver(skillFormSchema as any),
    defaultValues: {
      displayName: "",
      name: "",
      description: "",
      category: "creative",
      icon: "⚡",
      color: "#6366f1",
      version: "1.0.0",
      tags: [],
      purpose: "",
      workflow: [
        { step: 1, title: "Initial Analysis", description: "Analyze inputs and context constraints." },
        { step: 2, title: "Execution", description: "Execute core logic." },
        { step: 3, title: "Verification", description: "Verify output quality against requirements." },
      ],
      safetyAndSideEffects: "Ensure factual accuracy. Confirm non-reversible actions before committing.",
      outputTemplate: "",
      triggerExamples: [],
      visibility: "PRIVATE",
      isActive: true,
      status: "ACTIVE",
    },
  });

  const { fields: workflowFields, append: appendWorkflow, remove: removeWorkflow } = useFieldArray({
    control: form.control,
    name: "workflow",
  });

  // Populate form on edit or reset on create
  useEffect(() => {
    if (skillToEdit) {
      const schema = skillToEdit.schema;
      const steps = Array.isArray(schema?.workflow) ? schema.workflow : [];
      form.reset({
        displayName: skillToEdit.displayName || skillToEdit.name,
        name: skillToEdit.name,
        description: skillToEdit.description || "",
        category: skillToEdit.category || "custom",
        icon: skillToEdit.icon || "⚡",
        color: skillToEdit.color || "#6366f1",
        version: skillToEdit.version || "1.0.0",
        tags: skillToEdit.tags || [],
        purpose: schema?.purpose || skillToEdit.description || "",
        workflow: steps.length > 0 ? steps.map((s, idx) => ({
          step: s.step || idx + 1,
          title: s.title || `Step ${idx + 1}`,
          description: s.description || "",
        })) : [
          { step: 1, title: "Initial Analysis", description: "Analyze context and requirements." },
          { step: 2, title: "Execution", description: "Execute core task." }
        ],
        safetyAndSideEffects: typeof schema?.safetyAndSideEffects === "string"
          ? schema.safetyAndSideEffects
          : Array.isArray(schema?.safetyAndSideEffects)
          ? schema.safetyAndSideEffects.join("\n")
          : "",
        outputTemplate: schema?.outputTemplate || "",
        triggerExamples: schema?.triggerExamples || [],
        visibility: skillToEdit.visibility || "PRIVATE",
        isActive: skillToEdit.isActive ?? true,
        status: skillToEdit.status || "ACTIVE",
      });
    } else {
      form.reset({
        displayName: "",
        name: "",
        description: "",
        category: "creative",
        icon: "⚡",
        color: "#6366f1",
        version: "1.0.0",
        tags: [],
        purpose: "",
        workflow: [
          { step: 1, title: "Initial Analysis", description: "Analyze context and requirements." },
          { step: 2, title: "Execution", description: "Execute core task." },
          { step: 3, title: "Review", description: "Verify results and format response." },
        ],
        safetyAndSideEffects: "Confirm critical changes with user before applying.",
        outputTemplate: "",
        triggerExamples: [],
        visibility: "PRIVATE",
        isActive: true,
        status: "ACTIVE",
      });
    }
  }, [skillToEdit, form, open]);

  // Auto-generate name/slug from displayName in create mode
  const handleDisplayNameChange = (val: string) => {
    form.setValue("displayName", val);
    if (!isEditing) {
      const slug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      form.setValue("name", slug);
    }
  };

  const createMutation = trpc.skill.create.useMutation({
    onSuccess: () => {
      toast({ title: "Skill created successfully!" });
      utils.skill.list.invalidate();
      utils.skill.categories.invalidate();
      utils.skill.stats.invalidate();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast({ title: "Failed to create skill", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = trpc.skill.update.useMutation({
    onSuccess: () => {
      toast({ title: "Skill updated successfully!" });
      utils.skill.list.invalidate();
      utils.skill.categories.invalidate();
      utils.skill.stats.invalidate();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast({ title: "Failed to update skill", description: err.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: SkillFormData) => {
    const structuredSchema = {
      purpose: data.purpose,
      workflow: data.workflow,
      safetyAndSideEffects: data.safetyAndSideEffects || undefined,
      outputTemplate: data.outputTemplate || undefined,
      triggerExamples: data.triggerExamples || [],
    };

    if (isEditing && skillToEdit) {
      updateMutation.mutate({
        id: skillToEdit.id,
        displayName: data.displayName,
        description: data.description,
        category: data.category,
        icon: data.icon,
        color: data.color,
        version: data.version,
        schema: structuredSchema,
        tags: data.tags,
        visibility: data.visibility,
        isActive: data.isActive,
        status: data.status,
      });
    } else {
      createMutation.mutate({
        name: data.name,
        displayName: data.displayName,
        description: data.description,
        category: data.category,
        icon: data.icon,
        color: data.color,
        version: data.version,
        schema: structuredSchema,
        tags: data.tags,
        visibility: data.visibility,
        isActive: data.isActive,
        status: data.status,
      });
    }
  };

  const addTag = () => {
    const val = tagInput.trim().toLowerCase();
    if (val && !form.getValues("tags").includes(val)) {
      form.setValue("tags", [...form.getValues("tags"), val]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    form.setValue(
      "tags",
      form.getValues("tags").filter((t) => t !== tagToRemove)
    );
  };

  const addTrigger = () => {
    const val = triggerInput.trim();
    if (val && !form.getValues("triggerExamples").includes(val)) {
      form.setValue("triggerExamples", [...form.getValues("triggerExamples"), val]);
      setTriggerInput("");
    }
  };

  const removeTrigger = (triggerToRemove: string) => {
    form.setValue(
      "triggerExamples",
      form.getValues("triggerExamples").filter((t) => t !== triggerToRemove)
    );
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden gap-0 rounded-2xl shadow-2xl">
        <DialogHeader className="px-6 py-5 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 text-xl">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                {isEditing ? "Edit AI Skill" : "Create Custom AI Skill"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Define purposeful capabilities, workflows, triggers, and safety guardrails.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <div className="px-6 border-b border-border/40 bg-muted/10">
                <TabsList className="bg-transparent h-11 p-0 gap-4">
                  <TabsTrigger
                    value="basic"
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-2 text-sm gap-2"
                  >
                    <Settings2 className="h-4 w-4" />
                    Identity & Details
                  </TabsTrigger>
                  <TabsTrigger
                    value="workflow"
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-2 text-sm gap-2"
                  >
                    <Workflow className="h-4 w-4" />
                    Purpose & Workflow ({workflowFields.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="triggers"
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-2 text-sm gap-2"
                  >
                    <Layers className="h-4 w-4" />
                    Triggers & Safety
                  </TabsTrigger>
                  <TabsTrigger
                    value="template"
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-2 text-sm gap-2"
                  >
                    <FileCode className="h-4 w-4" />
                    Output Format
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* TAB 1: IDENTITY & BASIC */}
                <TabsContent value="basic" className="m-0 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Skill Display Name *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Code Reviewer & Refactor"
                              {...field}
                              onChange={(e) => handleDisplayNameChange(e.target.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>System Identifier (Slug) *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., code_reviewer"
                              {...field}
                              disabled={isEditing}
                              className="font-mono text-xs"
                            />
                          </FormControl>
                          <FormDescription className="text-[11px]">
                            Unique system handle used in agent prompts.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Summary Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Briefly describe what this skill accomplishes..."
                            className="h-20 resize-none text-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CATEGORIES.map((c) => (
                                <SelectItem key={c.value} value={c.value}>
                                  {c.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="visibility"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Visibility</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Visibility" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="PRIVATE">Private (Only You)</SelectItem>
                              <SelectItem value="PUBLIC">Public</SelectItem>
                              <SelectItem value="ADMINS">Admins Only</SelectItem>
                              <SelectItem value="MEMBERS">Members Only</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="version"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Version</FormLabel>
                          <FormControl>
                            <Input placeholder="1.0.0" className="font-mono text-xs" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Icon & Color Selection */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <FormLabel className="text-xs">Icon Emoji</FormLabel>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {PRESET_ICONS.map((icon) => (
                          <button
                            key={icon}
                            type="button"
                            onClick={() => form.setValue("icon", icon)}
                            className={`h-9 w-9 text-base rounded-lg border flex items-center justify-center transition-all ${
                              form.watch("icon") === icon
                                ? "border-primary ring-2 ring-primary/20 bg-primary/10"
                                : "border-border hover:bg-muted"
                            }`}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <FormLabel className="text-xs">Accent Color</FormLabel>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => form.setValue("color", color)}
                            className={`h-7 w-7 rounded-full transition-all border-2 ${
                              form.watch("color") === color
                                ? "border-foreground scale-110 shadow-sm"
                                : "border-transparent opacity-80 hover:opacity-100"
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="space-y-2 pt-2">
                    <FormLabel className="text-xs">Tags</FormLabel>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add tag (e.g., refactor, python)..."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                        className="h-9 text-xs"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={addTag}>
                        Add Tag
                      </Button>
                    </div>
                    {form.watch("tags").length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {form.watch("tags").map((tag) => (
                          <Badge key={tag} variant="secondary" className="gap-1 text-xs px-2 py-0.5">
                            #{tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="text-muted-foreground hover:text-foreground ml-1"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* TAB 2: PURPOSE & WORKFLOW */}
                <TabsContent value="workflow" className="m-0 space-y-5">
                  <FormField
                    control={form.control}
                    name="purpose"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Skill Purpose / Objective *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Explain the precise objective and value-add of this skill when executed by an agent..."
                            className="h-24 resize-none text-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Injected into the agent prompt context to steer intention and execution boundaries.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm font-semibold">Workflow Steps</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Sequential stages the agent will walk through to deliver high-quality outcomes.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={() =>
                          appendWorkflow({
                            step: workflowFields.length + 1,
                            title: `Step ${workflowFields.length + 1}`,
                            description: "",
                          })
                        }
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Step
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {workflowFields.map((field, idx) => (
                        <div
                          key={field.id}
                          className="rounded-xl border border-border/80 bg-card p-4 space-y-3 relative group"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                                {idx + 1}
                              </span>
                              <FormField
                                control={form.control}
                                name={`workflow.${idx}.title`}
                                render={({ field }) => (
                                  <FormItem className="flex-1 m-0 space-y-0">
                                    <FormControl>
                                      <Input
                                        placeholder={`Step ${idx + 1} Title`}
                                        className="h-8 font-medium text-xs"
                                        {...field}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>

                            {workflowFields.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                                onClick={() => removeWorkflow(idx)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          <FormField
                            control={form.control}
                            name={`workflow.${idx}.description`}
                            render={({ field }) => (
                              <FormItem className="m-0 space-y-0">
                                <FormControl>
                                  <Textarea
                                    placeholder="Step details, heuristics, verification checks..."
                                    className="h-16 resize-none text-xs leading-relaxed"
                                    {...field}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 3: TRIGGERS & SAFETY */}
                <TabsContent value="triggers" className="m-0 space-y-5">
                  <FormField
                    control={form.control}
                    name="safetyAndSideEffects"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <ShieldCheck className="h-4 w-4 text-amber-500" />
                          Safety Guidelines & Side-Effect Policies
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Rules regarding destructive actions, user sign-offs, privacy constraints, and verified execution..."
                            className="h-28 resize-none text-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Defines when the agent must pause or request user confirmation before proceeding.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2 pt-2">
                    <FormLabel className="text-sm font-semibold">Trigger Examples</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Sample user commands that naturally activate this skill.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g., Review this pull request for race conditions..."
                        value={triggerInput}
                        onChange={(e) => setTriggerInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTrigger();
                          }
                        }}
                        className="h-9 text-xs"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={addTrigger}>
                        Add Trigger
                      </Button>
                    </div>

                    {form.watch("triggerExamples").length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        {form.watch("triggerExamples").map((trigger) => (
                          <div
                            key={trigger}
                            className="flex items-center justify-between p-2.5 rounded-lg border text-xs bg-card"
                          >
                            <span className="font-mono text-muted-foreground">"{trigger}"</span>
                            <button
                              type="button"
                              onClick={() => removeTrigger(trigger)}
                              className="text-muted-foreground hover:text-destructive ml-2"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* TAB 4: OUTPUT TEMPLATE */}
                <TabsContent value="template" className="m-0 space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-sm font-semibold">
                      <FileCode className="h-4 w-4 text-primary" />
                      Output Markdown Template
                    </Label>
                    <Textarea
                      placeholder={`### 🎯 [Skill Title] Output\n\n#### 📌 Key Takeaways\n- Point 1\n- Point 2\n\n#### 🛠️ Action Plan\n1. Next Step...`}
                      className="h-60 font-mono text-xs resize-none"
                      {...form.register("outputTemplate")}
                    />
                    <p className="text-xs text-muted-foreground">
                      Structured skeleton the agent will fill when finalizing its response.
                    </p>
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/20 flex items-center justify-between">
              <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>

              <div className="flex items-center gap-2">
                <Button type="submit" size="sm" disabled={isPending} className="gap-1.5">
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : isEditing ? (
                    "Save Changes"
                  ) : (
                    "Create Skill"
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
