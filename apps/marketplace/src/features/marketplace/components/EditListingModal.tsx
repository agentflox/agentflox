"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Wand2,
    CheckCircle2,
    Globe,
    Plus,
    X,
    Save,
    LayoutTemplate,
    ChevronLeft,
    ChevronRight,
    Pencil,
    Sparkles,
    RefreshCw,
    Settings2,
    Type,
    Layers,
    Star,
    Download,
    MessageSquare,
    Heart,
    Copy,
    Check,
    Trash2,
    ChevronDown,
    ChevronUp,
    Zap,
    Paperclip,
    FileImage,
    Tag,
} from "lucide-react";
import { ListingType } from "../types/marketplace.types";
import { aiListingService } from "@/services/ai-listing.service";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { TemplateMenuPopover } from "@/entities/templates/components/TemplateMenuPopover";
import { TagsModal } from "@/entities/task/components/TagsModal";
import { Editor } from "@/entities/shared/components/Editor";
import { cn } from "@/lib/utils";
import { MediaUpload, type MediaFile } from "@/components/ui/media-upload";

// ─── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
    { id: "sales", label: "Sales", emoji: "📈", description: "Sales outreach, pipeline operations, and prospecting tasks." },
    { id: "marketing", label: "Marketing", emoji: "📣", description: "Marketing, product marketing, social media, SEO or advertising." },
    { id: "content", label: "Content Creation", emoji: "✍️", description: "Generating text, images, videos, or audio content." },
    { id: "it", label: "IT & Engineering", emoji: "⚙️", description: "Infrastructure monitoring, code generation, code review, documentation." },
    { id: "hr", label: "HR & Recruitment", emoji: "🧑‍💼", description: "Candidate sourcing, resume screening, and employee onboarding." },
    { id: "research", label: "Research", emoji: "🔬", description: "Information gathering, synthesis, and insight generation." },
    { id: "support", label: "Customer Support", emoji: "💬", description: "Responding to queries, ticket triaging, and FAQ resolution." },
    { id: "product", label: "Product & Design", emoji: "🎨", description: "Product research, UX analysis, and creative ideation." },
    { id: "ops", label: "Operations", emoji: "🏗️", description: "Business process automation, admin tooling, and workflows." },
    { id: "data", label: "Data & Analytics", emoji: "📊", description: "Dashboard updates, data cleaning, and analysis reporting." },
    { id: "revops", label: "Revenue Ops", emoji: "💹", description: "CRM hygiene, reporting and revenue operations support." },
    { id: "security", label: "Security", emoji: "🔐", description: "Threat detection, compliance checks, and vulnerability triage." },
    { id: "finance", label: "Finance", emoji: "💰", description: "Expense reconciliation, invoicing, and financial modeling." },
    { id: "legal", label: "Legal", emoji: "⚖️", description: "Contract review, compliance checks, and legal research." },
    { id: "education", label: "Education", emoji: "🎓", description: "Learning aids, tutoring agents, or course content generators." },
    { id: "ecommerce", label: "E-commerce", emoji: "🛍️", description: "Store management, product listing, pricing or review summarization." },
    { id: "healthcare", label: "Healthcare", emoji: "🏥", description: "Patient intake, documentation, or clinical information automation." },
    { id: "realestate", label: "Real Estate", emoji: "🏠", description: "Property listing, inquiry handling, and market research." },
    { id: "travel", label: "Travel", emoji: "✈️", description: "Itinerary planning, booking assistance, or travel advisory." },
    { id: "fun", label: "Fun", emoji: "🎉", description: "Entertainment, humor, or creative play agents." },
    { id: "other", label: "Other", emoji: "🔮", description: "Tasks that don't fit standard categories or are highly custom." },
];

const CREDITS_TO_USD = 0.1;

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface FieldTemplate {
    id: string;
    name: string;
    fields: import("./MarketplaceCustomFieldBuilder").MarketplaceCustomField[];
    createdAt: string;
}

import { MarketplaceCustomField, MarketplaceCustomFieldBuilder } from "./MarketplaceCustomFieldBuilder";

const createField = (
    id: string,
    type: MarketplaceCustomField["type"],
    label: string,
    placeholder: string,
    description: string,
    required = true
): MarketplaceCustomField => ({
    id,
    type,
    label,
    placeholder,
    description,
    required,
});

function buildBaseApplicationFields(pricingType: "free" | "paid"): MarketplaceCustomField[] {
    const fields: MarketplaceCustomField[] = [
        createField(
            "submission_title",
            "text",
            "Title",
            "Add a short title for your submission",
            "Required for every applicant submission.",
            true
        ),
        createField(
            "proposal_content",
            "textarea",
            "Proposal content",
            "Describe your experience, approach, and why you are a fit.",
            "Required for every applicant submission.",
            true
        ),
    ];

    if (pricingType === "paid") {
        fields.push(
            createField(
                "submission_budget",
                "currency",
                "Budget",
                "e.g. 1200 USD or 40 USD/hour",
                "Required for paid listings only.",
                true
            )
        );
    }

    return fields;
}

function mapMarketplaceFieldTypeToCustomFieldType(type: MarketplaceCustomField["type"]): string {
    const typeMap: Record<MarketplaceCustomField["type"], string> = {
        text: "TEXT",
        textarea: "TEXT_AREA",
        number: "NUMBER",
        email: "EMAIL",
        phone: "PHONE",
        url: "URL",
        date: "DATE",
        time: "DATE",
        datetime: "DATE",
        select: "DROPDOWN",
        multiselect: "MULTI_SELECT",
        radio: "DROPDOWN",
        checkbox: "MULTI_SELECT",
        file: "FILES",
        rating: "RATING",
        currency: "MONEY",
        percentage: "NUMBER",
        user: "PEOPLE",
        tags: "MULTI_SELECT",
        progress: "NUMBER",
        voting: "VOTING",
        location: "LOCATION",
        signature: "SIGNATURE",
        block: "LONG_TEXT",
    };
    return typeMap[type] ?? "TEXT";
}


// ─── Category Pill Picker ───────────────────────────────────────────────────────

function CategoryDropdown({
    value,
    onChange,
}: {
    value: string[];
    onChange: (ids: string[]) => void;
}) {
    const [open, setOpen] = useState(false);

    const toggle = (id: string) => {
        if (value.includes(id)) {
            onChange(value.filter(v => v !== id));
        } else if (value.length < 3) {
            onChange([...value, id]);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between h-auto py-2 px-3 border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-900 transition-colors bg-white font-normal text-[14px]">
                    <span className={cn("truncate", value.length === 0 ? "text-zinc-500" : "text-zinc-900")}>
                        {value.length === 0 ? "Select up to 3 categories..." : value.map(v => CATEGORIES.find(c => c.id === v)?.label).join(", ")}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <div
                    className="max-h-64 overflow-y-auto p-1 scrollbar-thin"
                    onWheel={(e) => e.stopPropagation()}
                >
                    {CATEGORIES.map((c) => {
                        const isSelected = value.includes(c.id);
                        const isDisabled = !isSelected && value.length >= 3;
                        return (
                            <div
                                key={c.id}
                                className={cn(
                                    "flex items-start gap-3 p-2.5 rounded-sm transition-colors cursor-pointer",
                                    isDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                )}
                                onClick={() => !isDisabled && toggle(c.id)}
                            >
                                <Checkbox checked={isSelected} className="mt-0.5" disabled={isDisabled} />
                                <div className="space-y-0.5 flex-1 min-w-0">
                                    <p className="text-[14px] font-medium leading-tight text-zinc-900 dark:text-zinc-100">
                                        <span className="mr-1.5">{c.emoji}</span>{c.label}
                                    </p>
                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">{c.description}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </PopoverContent>
        </Popover>
    );
}

// ─── Description Composer ───────────────────────────────────────────────────────

function DescriptionComposer({
    roughDraft,
    setRoughDraft,
    polishedDescription,
    setPolishedDescription,
    useCases,
    setUseCases,
    intendedUsers,
    setIntendedUsers,
    entityType,
    entityId,
    polishedTitle,
    isAsset,
}: {
    roughDraft: string;
    setRoughDraft: (v: string) => void;
    polishedDescription: string;
    setPolishedDescription: (v: string) => void;
    useCases: string[];
    setUseCases: (v: string[]) => void;
    intendedUsers: string[];
    setIntendedUsers: (v: string[]) => void;
    entityType: ListingType;
    entityId?: string;
    polishedTitle: string;
    isAsset: boolean;
}) {
    const [mode, setMode] = useState<"manual" | "ai">("manual");
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiContext, setAiContext] = useState("");
    const [aiGenerated, setAiGenerated] = useState(polishedDescription);
    const { toast } = useToast();

    const generate = async () => {
        const textToUse = aiContext || roughDraft;
        if (!textToUse || textToUse.length <= 50) {
            toast({
                title: "Not enough context",
                description: "Please provide at least 50 characters of description for the AI to generate a comprehensive listing.",
                variant: "destructive"
            });
            return;
        }

        setIsGenerating(true);
        try {
            const response = await aiListingService.generateListing({
                entityType,
                entityId,
                title: polishedTitle,
                description: aiContext || roughDraft,
            });
            if (response) {
                const desc = response.detailedDesc || response.description || "";
                setAiGenerated(desc);
                setPolishedDescription(desc);
                if (isAsset) {
                    setUseCases(response.useCases || []);
                    setIntendedUsers(response.intendedUsers || []);
                }
            }
        } catch {
            const fallback = (aiContext || roughDraft) +
                "\n\n(AI-polished and SEO-optimized version of your listing would appear here.)";
            setAiGenerated(fallback);
            setPolishedDescription(fallback);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Mode toggle */}
            <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg w-fit">
                <button
                    type="button"
                    onClick={() => setMode("manual")}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
                        mode === "manual"
                            ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                            : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    )}
                >
                    <Pencil className="h-3.5 w-3.5" /> Write Manually
                </button>
                <button
                    type="button"
                    onClick={() => setMode("ai")}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
                        mode === "ai"
                            ? "bg-white dark:bg-zinc-700 text-violet-700 dark:text-violet-400 shadow-sm"
                            : "text-zinc-500 hover:text-violet-600 dark:hover:text-violet-400"
                    )}
                >
                    <Sparkles className="h-3.5 w-3.5" /> Generate with AI
                </button>
            </div>

            {mode === "manual" ? (
                <div className="space-y-3">
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden min-h-[200px] bg-white dark:bg-zinc-950">
                        <Editor
                            initialContent={roughDraft}
                            editable={true}
                            onContentChange={(html) => setRoughDraft(html)}
                            editorClassName="prose prose-sm dark:prose-invert focus:outline-none max-w-none min-h-[240px] px-4 py-4 text-[15px] leading-relaxed"
                        />
                    </div>
                    {roughDraft.replace(/<[^>]+>/g, "").trim().length > 20 && (
                        <div className="rounded-lg border border-violet-100 bg-violet-50/60 dark:border-violet-800/50 dark:bg-violet-950/20 px-4 py-3 flex items-center gap-3">
                            <Sparkles className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                            <p className="text-xs text-violet-600 dark:text-violet-400 flex-1">
                                Want a more compelling description? Switch to AI mode.
                            </p>
                            <button
                                type="button"
                                onClick={() => { setAiContext(roughDraft); setMode("ai"); }}
                                className="text-xs font-semibold text-violet-600 hover:text-violet-800 dark:text-violet-400 whitespace-nowrap"
                            >
                                Try AI ✦
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Context hint */}
                    <div className="space-y-1.5">
                        <Textarea
                            className="min-h-[220px] text-[15px] leading-relaxed resize-none border border-zinc-200 dark:border-zinc-800 shadow-sm"
                            placeholder="Briefly describe what this listing is for — e.g., selling assets, hiring, collaborating, or raising funds."
                            value={aiContext}
                            onChange={(e) => setAiContext(e.target.value)}
                        />
                    </div>

                    <Button
                        type="button"
                        onClick={generate}
                        disabled={isGenerating}
                        className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-0 shadow-md shadow-violet-200 dark:shadow-violet-900/30"
                    >
                        {isGenerating ? (
                            <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Generating…
                            </>
                        ) : aiGenerated ? (
                            <>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Regenerate
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4 mr-2" />
                                Generate Description
                            </>
                        )}
                    </Button>

                    {/* AI output */}
                    {(aiGenerated || isGenerating) && (
                        <div className="rounded-xl border border-violet-200 dark:border-violet-800 overflow-hidden">
                            <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/40 dark:to-indigo-950/40 border-b border-violet-100 dark:border-violet-800">
                                <div className="flex items-center gap-1.5">
                                    <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                                    <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">AI Output</span>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={generate}
                                    className="h-6 px-2 text-[11px] text-violet-600 hover:text-violet-700 hover:bg-violet-100 dark:text-violet-400 dark:hover:bg-violet-900/50 cursor-pointer"
                                >
                                    <RefreshCw className="h-3 w-3 mr-1" /> Regenerate
                                </Button>
                            </div>
                            {isGenerating ? (
                                <div className="p-4 space-y-2">
                                    {[...Array(4)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse"
                                            style={{ width: `${75 + Math.random() * 25}%` }}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <>
                                    <div className="bg-white dark:bg-zinc-900">
                                        <Editor
                                            initialContent={aiGenerated}
                                            editable={true}
                                            onContentChange={(html) => {
                                                setAiGenerated(html);
                                                setPolishedDescription(html);
                                            }}
                                            editorClassName="prose prose-sm dark:prose-invert focus:outline-none max-w-none min-h-[400px] px-4 py-4 text-[15px] leading-relaxed"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    )}


                </div>
            )}
        </div>
    );
}

// ─── Custom Fields Tab ──────────────────────────────────────────────────────────

function CustomFieldsTab({
    fields,
    setFields,
    pricingType,
    workspaceId,
    onCreateField,
    onUpdateField,
}: {
    fields: MarketplaceCustomField[];
    setFields: React.Dispatch<React.SetStateAction<MarketplaceCustomField[]>>;
    pricingType: "free" | "paid";
    workspaceId?: string;
    onCreateField?: (field: MarketplaceCustomField) => void;
    onUpdateField?: (field: MarketplaceCustomField) => void;
}) {
    const builtInFields = buildBaseApplicationFields(pricingType);
    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-950">
                {builtInFields.map((field) => (
                    <div key={field.id} className="px-4 py-3 flex items-start justify-between gap-3">
                        <div>
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 pt-0.5">
                                {field.label}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                {field.description}
                            </p>
                        </div>
                        <div className="relative group">
                            <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                                Required field
                            </span>
                            <div className="absolute right-0 top-full z-20 mt-2 hidden min-w-[220px] rounded-md border border-zinc-200 bg-white p-2 text-[11px] text-zinc-600 shadow-md group-hover:block">
                                Non-editable built-in field. Applicants must submit this.
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {/* Builder */}
            <MarketplaceCustomFieldBuilder
                fields={fields}
                setFields={setFields}
                workspaceId={workspaceId}
                onCreateField={onCreateField}
                onUpdateField={onUpdateField}
            />

            {fields.length === 0 && (
                <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 p-8 flex flex-col items-center gap-2 text-center bg-zinc-50/50">
                    <Layers className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No extra custom fields defined</p>
                    <p className="text-[13px] text-zinc-400 dark:text-zinc-500 max-w-sm leading-relaxed">
                        Add optional custom fields below the required built-in submission fields.
                    </p>
                </div>
            )}
        </div>
    );
}

function ApplicationFormFieldsPreview({
    pricingType,
    customFields,
}: {
    pricingType: "free" | "paid";
    customFields: MarketplaceCustomField[];
}) {
    const fields = [...buildBaseApplicationFields(pricingType), ...customFields]
        .filter((field) => field.showInApplicationForm !== false)
        .filter((field) => (field.label?.trim() || field.customFieldTitle?.trim()))
        .map((field) => ({
            ...field,
            previewLabel: field.label?.trim() || field.customFieldTitle?.trim() || "Untitled field",
        }));

    const renderInputPreview = (field: MarketplaceCustomField & { previewLabel: string }) => {
        const placeholder = field.placeholder || `Enter ${field.previewLabel}...`;
        const options = field.options && field.options.length ? field.options : ["Option 1", "Option 2"];
        const baseClass = "h-10 bg-zinc-50 border-zinc-200 text-zinc-500";

        switch (field.type) {
            case "textarea":
                return <Textarea disabled className="min-h-[96px] resize-none bg-zinc-50 border-zinc-200 text-zinc-500" placeholder={placeholder} />;
            case "select":
                return (
                    <select disabled className="w-full h-10 rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-500">
                        <option>{placeholder}</option>
                        {options.map((opt, idx) => <option key={`${opt}-${idx}`}>{opt}</option>)}
                    </select>
                );
            case "radio":
            case "checkbox":
                return (
                    <div className="space-y-2">
                        {options.map((opt, idx) => (
                            <div key={`${opt}-${idx}`} className="flex items-center gap-2 text-sm text-zinc-600">
                                <div className={cn("h-4 w-4 border border-zinc-300 bg-white", field.type === "radio" ? "rounded-full" : "rounded")} />
                                <span>{opt}</span>
                            </div>
                        ))}
                    </div>
                );
            default:
                return <Input disabled className={baseClass} placeholder={placeholder} />;
        }
    };

    return (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Application Form</h4>
                <span className="text-xs text-zinc-500">{fields.length} fields</span>
            </div>
            {fields.map((field) => (
                <div key={field.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-950">
                    <Label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1 block">
                        {field.previewLabel}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {field.description ? (
                        <p className="text-xs text-zinc-500 mb-3">{field.description}</p>
                    ) : null}
                    {renderInputPreview(field)}
                </div>
            ))}
        </div>
    );
}

// ─── Preview Card ───────────────────────────────────────────────────────────────

function PreviewCard({
    entityType,
    title,
    description,
    categories,
    pricingType,
    pricingModel,
    creditAmount,
    maxCreditAmount,
    coverMedia,
    attachmentMedia,
    tags,
    useCases,
    intendedUsers,
    customFields,
    allowCloning,
    allowRepublishing,
    isAsset,
}: {
    entityType: ListingType;
    title: string;
    description: string;
    categories: string[];
    pricingType: "free" | "paid";
    pricingModel: "fixed" | "hourly" | "range";
    creditAmount: number;
    maxCreditAmount?: number;
    coverMedia?: MediaFile[];
    attachmentMedia?: MediaFile[];
    tags: string[];
    useCases: string[];
    intendedUsers: string[];
    customFields: MarketplaceCustomField[];
    allowCloning: boolean;
    allowRepublishing: boolean;
    isAsset: boolean;
}) {
    const [isDescExpanded, setIsDescExpanded] = useState(false);

    const entityColors: Record<string, string> = {
        agent: "from-violet-500 to-indigo-600",
        tool: "from-cyan-500 to-blue-600",
        template: "from-emerald-500 to-teal-600",
        workforce: "from-orange-500 to-rose-600",
        task: "from-amber-500 to-orange-600",
        team: "from-pink-500 to-rose-600",
        project: "from-sky-500 to-blue-600",
        talent: "from-lime-500 to-emerald-600",
    };
    const gradient = entityColors[entityType.toLowerCase()] ?? "from-indigo-500 to-violet-600";

    return (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden bg-white dark:bg-zinc-950 flex flex-col">
            {/* Hero Cover or Gradient Strip */}
            {coverMedia && coverMedia.length > 0 ? (
                <div className="h-48 relative overflow-hidden group">
                    <img
                        src={coverMedia[0].url}
                        alt="Listing Cover"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute top-3 right-3 flex z-10">
                        {pricingType === "free" ? (
                            <Badge variant="outline" className="bg-emerald-500/80 hover:bg-emerald-500/90 backdrop-blur-xl text-white border-white/20 text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 shadow-lg">FREE</Badge>
                        ) : (
                            <Badge variant="outline" className="bg-black/40 hover:bg-black/50 backdrop-blur-xl text-white border-white/10 text-[11px] font-semibold px-3 py-1 shadow-2xl flex items-center gap-1.5">
                                {isAsset ? `⚡ ${creditAmount} credits` : (
                                    <span>
                                        ${(creditAmount * 0.15).toFixed(2)}
                                        {pricingModel === "range" && maxCreditAmount && ` - $${(maxCreditAmount * 0.15).toFixed(2)}`}
                                    </span>
                                )}
                            </Badge>
                        )}
                    </div>
                    <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                    <div className="absolute bottom-4 left-5 flex items-center gap-2 z-10">
                        <Badge variant="outline" className="bg-black/40 hover:bg-black/50 backdrop-blur-xl text-white border-white/10 text-[9px] uppercase font-semibold tracking-[0.2em] px-3 py-1.5 shadow-2xl flex items-center gap-1.5">
                            <Globe className="h-3 w-3 text-white/70" />
                            {entityType}
                        </Badge>
                    </div>
                </div>
            ) : (
                <div className={cn("h-28 bg-gradient-to-br relative", gradient)}>
                    <div className="absolute inset-0 bg-black/10" />
                    <div className="absolute bottom-4 left-5 flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/20">
                            <Globe className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">{entityType}</p>
                        </div>
                    </div>
                    <div className="absolute top-3 right-3 flex gap-1.5">
                        {pricingType === "free" ? (
                            <span className="text-[11px] font-bold bg-emerald-500 text-white px-2.5 py-0.5 rounded-full shadow-sm">FREE</span>
                        ) : (
                            <span className="text-[11px] font-bold bg-white/20 backdrop-blur-md border border-white/10 text-white px-2.5 py-0.5 rounded-full shadow-sm">
                                {isAsset ? `⚡ ${creditAmount} credits` : (
                                    <span>
                                        ${(creditAmount * 0.15).toFixed(2)}
                                        {pricingModel === "range" && maxCreditAmount && ` - $${(maxCreditAmount * 0.15).toFixed(2)}`}
                                    </span>
                                )}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Card body */}
            <div className="p-6 space-y-6 flex-1">
                <div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                        {title || <span className="text-zinc-300 italic text-base">Listing title goes here…</span>}
                    </h3>
                    <div className="flex items-center flex-wrap gap-2 mt-2">
                        {pricingType === "paid" && (
                            <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 font-semibold text-xs">
                                {pricingModel === "hourly" ? "Hourly Rate" : pricingModel === "range" ? "Budget Range" : "Fixed Price"}
                            </Badge>
                        )}
                        {!isAsset && pricingType === "paid" && (
                            <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                                ${(creditAmount * 0.15).toFixed(2)}
                                {pricingModel === "range" && maxCreditAmount && ` - $${(maxCreditAmount * 0.15).toFixed(2)}`}
                                {pricingModel === "hourly" && " / hr"}
                            </span>
                        )}
                    </div>
                </div>

                <div className="prose prose-sm dark:prose-invert max-w-none relative">
                    {description ? (
                        <div>
                            <div dangerouslySetInnerHTML={{ __html: description }} className={cn("text-zinc-600 dark:text-zinc-300 text-[14px]", !isDescExpanded && "line-clamp-4")} />
                            <button
                                type="button"
                                onClick={() => setIsDescExpanded(!isDescExpanded)}
                                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-2 flex items-center gap-1 hover:underline cursor-pointer focus:outline-none"
                            >
                                {isDescExpanded ? (
                                    <>Show less <ChevronUp className="h-3.5 w-3.5" /></>
                                ) : (
                                    <>Show more <ChevronDown className="h-3.5 w-3.5" /></>
                                )}
                            </button>
                        </div>
                    ) : (
                        <p className="text-sm text-zinc-300 dark:text-zinc-600 italic">
                            No description yet — add one in the Description tab.
                        </p>
                    )}
                </div>

                {/* Sub Features grid */}
                <div className="grid gap-2">
                    {/* Category */}
                    {categories.length > 0 && (
                        <div>
                            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5"><Layers className="h-3 w-3" /> Categories</p>
                            <div className="flex flex-wrap gap-1.5">
                                {categories.map(catId => {
                                    const catData = CATEGORIES.find(c => c.id === catId);
                                    if (!catData) return null;
                                    return (
                                        <span key={catId} className="inline-flex items-center px-2.5 py-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-200 text-xs font-semibold border border-zinc-200/50 dark:border-zinc-700/50">
                                            <span className="mr-1.5 opacity-90">{catData.emoji}</span> {catData.label}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Tags */}
                    {tags.length > 0 && (
                        <div>
                            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5"><Tag className="h-3 w-3" /> Tags</p>
                            <div className="flex flex-wrap gap-1.5">
                                {tags.slice(0, 8).map((s, i) => (
                                    <span key={i} className="inline-flex items-center px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 text-xs font-medium border border-zinc-200/50 dark:border-zinc-700/50">{s}</span>
                                ))}
                                {tags.length > 8 && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 text-xs font-medium border border-zinc-200/50 dark:border-zinc-700/50">
                                        +{tags.length - 8}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        {/* Use cases */}
                        {isAsset && useCases.length > 0 && (
                            <div className="space-y-2.5">
                                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5"><Zap className="h-3 w-3 text-indigo-400" /> Use Cases</p>
                                <ul className="space-y-1.5">
                                    {useCases.slice(0, 3).map((uc, i) => (
                                        <li key={i} className="text-[13px] text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                                            <div className="h-1.5 w-1.5 rounded-full bg-indigo-300 dark:bg-indigo-600 mt-1.5 shrink-0" />
                                            <span className="leading-tight">{uc}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Intended users */}
                        {isAsset && intendedUsers.length > 0 && (
                            <div className="space-y-2.5">
                                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5"><Star className="h-3 w-3 text-amber-400" /> Best For</p>
                                <ul className="space-y-1.5">
                                    {intendedUsers.slice(0, 3).map((user, i) => (
                                        <li key={i} className="text-[13px] text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                                            <div className="h-1.5 w-1.5 rounded-full bg-amber-300 dark:bg-amber-600 mt-1.5 shrink-0" />
                                            <span className="leading-tight">{user}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Attachments */}
                    {attachmentMedia && attachmentMedia.length > 0 && (
                        <div>
                            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5"><Paperclip className="h-3 w-3" /> Attached Files</p>
                            <div className="flex flex-wrap gap-2">
                                {attachmentMedia.map((file, idx) => (
                                    <div key={idx} className="flex items-center gap-2 pr-3 pl-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-800 shadow-sm">
                                        <FileImage className="h-3.5 w-3.5 text-indigo-500" />
                                        <span className="text-[11px] font-medium tracking-tight text-zinc-600 dark:text-zinc-300 max-w-[120px] truncate">{file.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}

// ─── Entity Context Types & Banner ─────────────────────────────────────────────

/**
 * Rich context about the entity being published.
 * All fields are optional — callers should supply what they have.
 */
export interface EntityContext {
    /** Avatar emoji, letter, or image URL */
    avatar?: string;
    /** Current live description / system prompt of the entity */
    description?: string;
    /** Short status or model label, e.g. "gpt-4o", "Active", "Draft" */
    status?: string;
    /** Arbitrary key-value chips shown below the entity name */
    metadata?: Array<{ label: string; value: string | number }>;
    /** E.g. tool names for an agent, step labels for a workflow */
    capabilities?: string[];
    /** If the entity has a live thumbnail / preview image URL */
    previewImageUrl?: string;
}

const ENTITY_ICONS: Record<string, string> = {
    agent: "🤖",
    tool: "🔧",
    template: "📄",
    workforce: "👥",
    task: "✅",
    team: "🧑‍🤝‍🧑",
    project: "📁",
    talent: "🌟",
};

// ─── Main Modal ─────────────────────────────────────────────────────────────────

interface EditListingModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** ID of the existing listing to load and edit */
    listingId: string;
    workspaceId?: string;
}

export function EditListingModal({
    open,
    onOpenChange,
    listingId,
    workspaceId,
}: EditListingModalProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();

    // Load existing listing data
    const { data: existingListing, isLoading: isLoadingListing } = trpc.marketplace.get.useQuery(
        { id: listingId },
        { enabled: open && !!listingId }
    );

    const resolvedEntityType = (existingListing?.type ?? "task") as ListingType;
    const listingType = resolvedEntityType;
    const entityId = listingId;
    const initialTitle = existingListing?.title ?? "";

    // Screen: "configure" | "preview"
    const [screen, setScreen] = useState<"configure" | "preview">("configure");
    const [previewTab, setPreviewTab] = useState<"listing" | "application">("listing");

    // Basics
    const [title, setTitle] = useState("");
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [pricingType, setPricingType] = useState<"free" | "paid">("free");
    const [pricingModel, setPricingModel] = useState<"fixed" | "hourly" | "range">("fixed");
    const [creditAmount, setCreditAmount] = useState<number>(10);
    const [maxCreditAmount, setMaxCreditAmount] = useState<number>(20);
    const [coverMedia, setCoverMedia] = useState<MediaFile[]>([]);
    const [attachmentMedia, setAttachmentMedia] = useState<MediaFile[]>([]);
    const [showCoverUpload, setShowCoverUpload] = useState(false);
    const [showAttachmentUpload, setShowAttachmentUpload] = useState(false);
    const [tags, setTags] = useState<string[]>([]);
    const [isDataHydrated, setIsDataHydrated] = useState(false);

    // Description
    const [roughDraft, setRoughDraft] = useState("");
    const [polishedDescription, setPolishedDescription] = useState("");
    const [useCases, setUseCases] = useState<string[]>([]);
    const [intendedUsers, setIntendedUsers] = useState<string[]>([]);

    // Fields
    const [customFields, setCustomFields] = useState<MarketplaceCustomField[]>([]);

    // Settings
    const [allowCloning, setAllowCloning] = useState(true);
    const [allowRepublishing, setAllowRepublishing] = useState(false);
    const defaultWorkspaceId = workspaceId;

    const isAsset = ["agent", "tool", "template", "workforce"].includes(listingType.toLowerCase());

    const displayDescription = polishedDescription || roughDraft;
    const publishListingMutation = trpc.marketplace.publishListing.useMutation();
    const createCustomFieldMutation = trpc.customFields.create.useMutation({
        onSuccess: async () => {
            await utils.customFields.list.invalidate();
        },
    });

    const updateCustomFieldMutation = trpc.customFields.update.useMutation({
        onSuccess: async () => {
            await utils.customFields.list.invalidate();
        },
    });

    const handleCreateField = async (field: MarketplaceCustomField) => {
        const fieldTitle = (field.customFieldTitle || field.label).trim();
        if (!fieldTitle) return;

        const formFieldLabel = field.label?.trim() || fieldTitle;
        const formFieldDescription = field.description?.trim() || undefined;
        const options = field.options?.map((opt) => opt.trim()).filter(Boolean);
        const config: Record<string, unknown> = {
            formField: {
                title: formFieldLabel,
                description: formFieldDescription,
                placeholder: field.placeholder,
                required: field.required,
                visible: field.showInApplicationForm !== false,
            },
        };
        if (options && options.length > 0) {
            config.options = options;
        }
        if (field.type === "block" && field.content?.trim()) {
            config.content = field.content;
        }

        try {
            const result = await createCustomFieldMutation.mutateAsync({
                ...(defaultWorkspaceId ? { workspaceId: defaultWorkspaceId } : {}),
                name: fieldTitle,
                type: mapMarketplaceFieldTypeToCustomFieldType(field.type),
                applyTo: ["TASK"],
                locationType: "PERSONAL",
                config,
                isRequired: field.required,
            });

            // Very important: update the local state with the actual DB ID
            // so subsequent edits can target the correct record.
            if (result?.id) {
                setCustomFields((prev) =>
                    prev.map((f) => (f.id === field.id ? { ...f, dbId: result.id } : f))
                );
            }

            toast({
                title: "Field created",
                description: `"${fieldTitle}" has been created successfully.`,
            });
        } catch (error: any) {
            toast({
                title: "Failed to create field",
                description: error?.message || "Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleUpdateField = async (field: MarketplaceCustomField) => {
        if (!field.dbId) return; // Can't update if we don't have a DB ID

        const fieldTitle = (field.customFieldTitle || field.label).trim();
        if (!fieldTitle) return;

        const formFieldLabel = field.label?.trim() || fieldTitle;
        const formFieldDescription = field.description?.trim() || undefined;
        const options = field.options?.map((opt) => opt.trim()).filter(Boolean);
        const config: Record<string, unknown> = {
            formField: {
                title: formFieldLabel,
                description: formFieldDescription,
                placeholder: field.placeholder,
                required: field.required,
                visible: field.showInApplicationForm !== false,
            },
        };
        if (options && options.length > 0) {
            config.options = options;
        }
        if (field.type === "block" && field.content?.trim()) {
            config.content = field.content;
        }

        try {
            await updateCustomFieldMutation.mutateAsync({
                id: field.dbId,
                name: fieldTitle,
                config,
            });
            toast({
                title: "Field updated",
                description: `"${fieldTitle}" changes saved to workspace.`,
            });
        } catch (error: any) {
            toast({
                title: "Failed to update field",
                description: error?.message || "Changes saved locally but failed to sync to workspace.",
                variant: "destructive",
            });
        }
    };
    const supportsHourlyPricing = ["task", "project", "team", "talent"].includes(listingType);

    // Reset state when modal closes
    useEffect(() => {
        if (!open) {
            setScreen("configure");
            setPreviewTab("listing");
            setIsDataHydrated(false);
        }
    }, [open]);

    // Hydrate form fields from loaded listing data
    useEffect(() => {
        if (!existingListing || isDataHydrated) return;

        setTitle(existingListing.title ?? "");

        // Parse categories: stored as comma-separated string or array
        const rawCat = (existingListing as any).category;
        if (rawCat) {
            const cats = Array.isArray(rawCat)
                ? rawCat
                : String(rawCat).split(",").map((s: string) => s.trim()).filter(Boolean);
            setSelectedCategories(cats);
        } else {
            setSelectedCategories([]);
        }

        setPricingType((existingListing as any).isFree === false ? "paid" : "free");

        const pm = (existingListing as any).pricingModel;
        setPricingModel((pm === "hourly" ? "hourly" : pm === "range" ? "range" : "fixed") as any);

        const credits = Number((existingListing as any).priceCredits ?? 0);
        const price = Number((existingListing as any).price ?? 0);
        const priceMin = Number((existingListing as any).priceMin ?? 0);
        const priceMax = Number((existingListing as any).priceMax ?? 0);
        const isPaid = (existingListing as any).isFree === false;

        if (isPaid) {
            if (isAsset) {
                if (credits > 0) {
                    setCreditAmount(credits);
                }
            } else if ((existingListing as any).pricingModel === "range") {
                const mappedMin = priceMin > 0 ? priceMin / CREDITS_TO_USD : 1;
                const mappedMax = priceMax > 0 ? priceMax / CREDITS_TO_USD : mappedMin;
                setCreditAmount(Math.max(1, mappedMin));
                setMaxCreditAmount(Math.max(mappedMin, mappedMax));
            } else {
                const mappedAmount = price > 0 ? price / CREDITS_TO_USD : 1;
                setCreditAmount(Math.max(1, mappedAmount));
            }
        }

        // Cover image
        const cover = (existingListing as any).coverImage;
        if (cover) {
            setCoverMedia([{ id: "cover", url: cover, path: cover, name: "cover", type: "image", size: 0 }]);
            setShowCoverUpload(true);
        } else {
            setCoverMedia([]);
        }

        // Attachments stored as previewImages
        const attachments: string[] = (existingListing as any).attachmentUrls ?? [];
        if (attachments.length > 0) {
            setAttachmentMedia(
                attachments.map((url: string, i: number) => ({
                    id: `attachment-${i + 1}`,
                    url,
                    path: url,
                    name: `attachment-${i + 1}`,
                    type: "file",
                    size: 0,
                }))
            );
            setShowAttachmentUpload(true);
        } else {
            setAttachmentMedia([]);
        }

        setTags(Array.isArray((existingListing as any).tags) ? (existingListing as any).tags : []);

        // Description
        const desc = existingListing.description ?? "";
        setRoughDraft(desc);
        setPolishedDescription("");

        // Custom fields from applicationSchema (exclude built-in fields)
        const schema = (existingListing as any).applicationSchema;
        if (schema?.fields) {
            const builtInIds = ["submission_title", "proposal_content", "submission_budget"];
            const extraFields: MarketplaceCustomField[] = (schema.fields as any[])
                .filter((f: any) => !builtInIds.includes(f.id))
                .map((f: any) => ({
                    id: f.id,
                    type: f.type as MarketplaceCustomField["type"],
                    label: f.label ?? "",
                    placeholder: f.placeholder,
                    description: f.description,
                    required: f.required ?? false,
                    options: f.options,
                    showInApplicationForm: true,
                }));
            setCustomFields(extraFields);
        } else {
            setCustomFields([]);
        }

        setAllowCloning((existingListing as any).allowClone ?? true);
        setAllowRepublishing((existingListing as any).allowRepublish ?? false);

        setIsDataHydrated(true);
    }, [existingListing, isDataHydrated]);

    useEffect(() => {
        if (isAsset && pricingModel !== "fixed") {
            setPricingModel("fixed");
        }
    }, [isAsset, pricingModel]);

    const submitListing = async () => {
        const visibleCustomFields = customFields.filter((field) => field.showInApplicationForm !== false);
        const publishPricingModel =
            pricingType === "paid"
                ? (isAsset ? "fixed" : (pricingModel === "hourly" ? "hourly" : "fixed"))
                : undefined;
        const applicationSchema = {
            fields: [...buildBaseApplicationFields(pricingType), ...visibleCustomFields]
                .filter((field) => (field.label?.trim() || field.customFieldTitle?.trim()))
                .map((field) => ({
                    id: field.id,
                    type: field.type,
                    label: field.label?.trim() || field.customFieldTitle?.trim() || "Untitled field",
                    required: field.required,
                    placeholder: field.placeholder,
                    description: field.description,
                    options: field.options,
                })),
        };

        try {
            await publishListingMutation.mutateAsync({
                listingId,
                title: title.trim(),
                description: displayDescription || "No description provided",
                type: listingType as any,
                category: selectedCategories,
                tags,
                pricingType,
                pricingModel: publishPricingModel,
                priceCredits: pricingType === "paid" && isAsset ? creditAmount : undefined,
                price: pricingType === "paid" && !isAsset ? Number((creditAmount * CREDITS_TO_USD).toFixed(2)) : undefined,
                priceMin: pricingType === "paid" && !isAsset && pricingModel === "range" ? Number((creditAmount * CREDITS_TO_USD).toFixed(2)) : undefined,
                priceMax: pricingType === "paid" && !isAsset && pricingModel === "range" ? Number((maxCreditAmount * CREDITS_TO_USD).toFixed(2)) : undefined,
                coverImage: coverMedia[0]?.url,
                attachmentUrls: attachmentMedia.map((file) => file.url),
                allowClone: allowCloning,
                allowRepublish: allowRepublishing,
                applicationSchema,
            });
            await utils.marketplace.myListings.invalidate();
            toast({
                title: "✅ Changes saved!",
                description: "Your listing has been updated.",
            });
            onOpenChange(false);
        } catch (error: any) {
            toast({
                title: "Failed to update listing",
                description: error?.message || "Please try again.",
                variant: "destructive",
            });
        }
    };

    if (open && isLoadingListing) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent showCloseButton={false} className="sm:max-w-4xl p-0 overflow-hidden border-none shadow-2xl h-[85vh] sm:max-h-[85vh] flex flex-col gap-0 bg-white dark:bg-zinc-950">
                    <DialogTitle className="sr-only">Edit Listing</DialogTitle>
                    <DialogDescription className="sr-only">Loading listing data…</DialogDescription>
                    <div className="flex-1 flex flex-col items-center justify-center gap-4">
                        <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin" />
                        <p className="text-sm text-zinc-500">Loading listing…</p>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} className="sm:max-w-4xl p-0 overflow-hidden border-none shadow-2xl h-[85vh] sm:max-h-[85vh] flex flex-col gap-0 bg-white dark:bg-zinc-950">
                <DialogTitle className="sr-only">Edit Listing</DialogTitle>
                <DialogDescription className="sr-only">Edit and update your marketplace listing.</DialogDescription>

                {/* ── Header ── */}
                <div className={cn(
                    "flex items-center justify-between px-7 py-4 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0 bg-white dark:bg-zinc-950",
                    screen === "preview" && "border-emerald-100 dark:border-emerald-900/40"
                )}>
                    {/* Left Actions */}
                    <div className="w-[120px] flex items-center justify-start">
                        {screen === "preview" && (
                            <button
                                type="button"
                                onClick={() => setScreen("configure")}
                                className="text-[13px] font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 hover:text-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer px-2.5 py-1.5 rounded-md -ml-2"
                            >
                                <ChevronLeft className="h-4 w-4" /> Edit Listing
                            </button>
                        )}
                    </div>

                    {/* Center Title */}
                    <div className="flex-1 flex items-center justify-center gap-2.5">
                        {screen === "preview" ? (
                            <>
                                <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                </div>
                                <span className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Preview &amp; Publish</span>
                            </>
                        ) : (
                            <>
                                <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                                    <Save className="h-4 w-4 text-indigo-500" />
                                </div>
                                <span className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Edit Listing</span>
                            </>
                        )}
                    </div>

                    {/* Right Actions */}
                    <div className="w-[120px] flex items-center justify-end">
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="h-7 w-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* ── Configure Screen ── */}
                {screen === "configure" && (
                    <>

                        {/* Scrollable form content */}
                        <div className="flex-1 overflow-y-auto min-h-0 bg-white dark:bg-zinc-950 scrollbar-thin">

                            {/* ── Entity context chip ── */}
                            {initialTitle && (
                                <div className="flex items-center gap-2 px-8 pt-5 pb-0">
                                    <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Publishing</span>
                                    <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/70 rounded-md px-2.5 py-1">
                                        <span className="text-base leading-none">
                                            {listingType === "agent" ? "🤖" : listingType === "tool" ? "🔧" : "📄"}
                                        </span>
                                        <span className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-300 leading-none">{initialTitle}</span>
                                    </div>
                                </div>
                            )}

                            <div className="p-8 space-y-10">

                                {/* ── Template picker at top ── */}
                                <div className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                                    <div className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                                        <LayoutTemplate className="h-4 w-4 text-zinc-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">Apply a Template</p>
                                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Instantly fill all fields from a saved template.</p>
                                    </div>
                                    <TemplateMenuPopover
                                        entityType={"LISTING" as any}
                                        workspaceId={defaultWorkspaceId}
                                        contentToSave={{
                                            title,
                                            selectedCategories,
                                            pricingType,
                                            pricingModel,
                                            creditAmount,
                                            roughDraft,
                                            polishedDescription,
                                            useCases,
                                            intendedUsers,
                                            customFields,
                                            allowCloning,
                                            allowRepublishing,
                                            tags,
                                            attachmentMedia,
                                        }}
                                        triggerClassName="h-8 rounded-lg px-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs w-auto focus:ring-0 gap-1.5 font-semibold text-zinc-700 dark:text-zinc-300 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors shrink-0"
                                        triggerLabelClassName="text-zinc-700 dark:text-zinc-300"
                                        triggerIconClassName="text-zinc-500"
                                    />
                                </div>

                                {/* ── Basics Section ── */}
                                <section className="space-y-5">
                                    <div className="flex items-center gap-3">
                                        <div className="h-5 w-5 rounded bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center shrink-0">
                                            <Type className="h-3 w-3 text-indigo-500" />
                                        </div>
                                        <h3 className="text-[13px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider shrink-0 whitespace-nowrap">Basic Information</h3>
                                        <div className="h-px bg-zinc-200 dark:bg-zinc-800/60 flex-1 ml-1" />
                                    </div>
                                    <div className="space-y-5 bg-zinc-50/50 dark:bg-zinc-900/20 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1.5">
                                                Listing Title <span className="text-red-500">*</span>
                                            </label>
                                            <Input
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                placeholder={`e.g. ${listingType === "agent" ? "Smart Email Outreach Agent" : listingType === "tool" ? "Web Scraper with Rate Limiting" : "My Listing"}`}
                                                className="text-sm h-11 bg-white dark:bg-zinc-950"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1.5">
                                                Description <span className="text-red-500">*</span>
                                            </label>
                                            <DescriptionComposer
                                                roughDraft={roughDraft}
                                                setRoughDraft={setRoughDraft}
                                                polishedDescription={polishedDescription}
                                                setPolishedDescription={setPolishedDescription}
                                                useCases={useCases}
                                                setUseCases={setUseCases}
                                                intendedUsers={intendedUsers}
                                                setIntendedUsers={setIntendedUsers}
                                                entityType={listingType}
                                                entityId={entityId}
                                                polishedTitle={title}
                                                isAsset={isAsset}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1.5">
                                                Category
                                            </label>
                                            <CategoryDropdown value={selectedCategories} onChange={setSelectedCategories} />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1.5">
                                                Tags
                                            </label>
                                            <div className="min-h-10 rounded-md border border-zinc-200 bg-white px-3 py-2 shadow-sm flex items-center flex-wrap gap-2">
                                                {tags.length > 0 ? tags.map((tag, index) => (
                                                    <Badge key={`${tag}-${index}`} variant="secondary" className="text-xs px-2 py-0.5">
                                                        {tag}
                                                    </Badge>
                                                )) : (
                                                    <span className="text-xs text-zinc-400">No tags selected</span>
                                                )}
                                                <TagsModal
                                                    tags={tags}
                                                    onChange={setTags}
                                                    trigger={
                                                        <button type="button" className="ml-auto h-7 w-7 rounded-md border border-zinc-200 hover:bg-zinc-50 flex items-center justify-center cursor-pointer">
                                                            <Plus className="h-3.5 w-3.5 text-zinc-500" />
                                                        </button>
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1.5">
                                                Pricing
                                            </label>
                                            <div className="flex gap-2">
                                                {(["free", "paid"] as const).map((type) => (
                                                    <button
                                                        key={type}
                                                        type="button"
                                                        onClick={() => setPricingType(type)}
                                                        className={cn(
                                                            "flex-1 py-3 px-4 rounded-xl border text-sm font-semibold transition-all shadow-sm cursor-pointer",
                                                            pricingType === type
                                                                ? "border-zinc-800 bg-zinc-900 text-white dark:bg-zinc-200 dark:text-zinc-900 dark:border-zinc-200"
                                                                : "border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-950"
                                                        )}
                                                    >
                                                        {type === "free" ? "🆓 Free" : "⚡ Paid"}
                                                    </button>
                                                ))}
                                            </div>

                                            {pricingType === "paid" && (
                                                <div className="mt-3 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-4 shadow-sm">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider mb-1 block">Pricing model</label>
                                                        <Select
                                                            value={isAsset ? "fixed" : pricingModel}
                                                            onValueChange={(value) => setPricingModel(value as "fixed" | "hourly" | "range")}
                                                            disabled={isAsset}
                                                        >
                                                            <SelectTrigger className="h-9 bg-white dark:bg-zinc-950">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="fixed">Fixed price</SelectItem>
                                                                {supportsHourlyPricing && <SelectItem value="hourly">Hourly</SelectItem>}
                                                                {!isAsset && <SelectItem value="range">Range</SelectItem>}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex-1">
                                                            <label className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300 mb-2 block uppercase tracking-wider">
                                                                {isAsset ? "Credits Required" : "Price or Budget (USD)"}
                                                            </label>
                                                            <div className="flex items-center gap-2">
                                                                {!isAsset && <span className="text-sm font-bold text-zinc-400 pl-1">$</span>}
                                                                {isAsset && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setCreditAmount((v) => Math.max(1, v - 5))}
                                                                        className="h-9 w-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 font-bold transition-colors shadow-sm cursor-pointer"
                                                                    >−</button>
                                                                )}
                                                                <Input
                                                                    type="number"
                                                                    min={1}
                                                                    step={isAsset ? 1 : 0.01}
                                                                    value={isAsset ? creditAmount : Number((creditAmount * CREDITS_TO_USD).toFixed(2))}
                                                                    onChange={(e) => setCreditAmount(isAsset ? Math.max(1, Number(e.target.value)) : Math.max(0, Number(e.target.value) / CREDITS_TO_USD))}
                                                                    className="w-24 h-9 text-center text-sm font-bold border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 shadow-sm"
                                                                />
                                                                {isAsset && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setCreditAmount((v) => v + 5)}
                                                                        className="h-9 w-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 font-bold transition-colors shadow-sm cursor-pointer"
                                                                    >+</button>
                                                                )}

                                                                {pricingModel === "range" && (
                                                                    <>
                                                                        <span className="text-sm font-bold text-zinc-400 mx-1">to</span>
                                                                        {!isAsset && <span className="text-sm font-bold text-zinc-400 pl-1">$</span>}
                                                                        <Input
                                                                            type="number"
                                                                            min={isAsset ? creditAmount : Number((creditAmount * CREDITS_TO_USD).toFixed(2))}
                                                                            step={isAsset ? 1 : 0.01}
                                                                            value={isAsset ? maxCreditAmount : Number((maxCreditAmount * CREDITS_TO_USD).toFixed(2))}
                                                                            onChange={(e) => setMaxCreditAmount(isAsset ? Math.max(creditAmount, Number(e.target.value)) : Math.max(creditAmount, Number(e.target.value) / CREDITS_TO_USD))}
                                                                            className="w-24 h-9 text-center text-sm font-bold border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 shadow-sm"
                                                                        />
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {isAsset && (
                                                            <div className="text-right">
                                                                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">
                                                                    ${(creditAmount * CREDITS_TO_USD).toFixed(2)}
                                                                </p>
                                                                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest mt-0.5">USD equivalent</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="pt-3 border-t border-zinc-200/60 dark:border-zinc-700/60">
                                                        {isAsset ? (
                                                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                                                1 credit = ${CREDITS_TO_USD.toFixed(2)} USD
                                                            </p>
                                                        ) : (
                                                            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                                                                {pricingModel === "range"
                                                                    ? `$${(creditAmount * CREDITS_TO_USD).toFixed(2)} – $${(maxCreditAmount * CREDITS_TO_USD).toFixed(2)} USD`
                                                                    : `$${(creditAmount * CREDITS_TO_USD).toFixed(2)} USD`
                                                                }
                                                                {pricingModel === "hourly" && <span className="font-normal"> / hr</span>}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-3">
                                            {((!showCoverUpload && coverMedia.length === 0) ||
                                                (!showAttachmentUpload && attachmentMedia.length === 0)) && (
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        {!showCoverUpload && coverMedia.length === 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowCoverUpload(true)}
                                                                className="h-8 rounded-md px-2 text-sm font-medium text-zinc-500 cursor-pointer hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors"
                                                            >
                                                                + Add cover
                                                            </button>
                                                        )}
                                                        {!showAttachmentUpload && attachmentMedia.length === 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowAttachmentUpload(true)}
                                                                className="h-8 rounded-md px-2 text-sm font-medium text-zinc-500 cursor-pointer hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors"
                                                            >
                                                                + Add attached files
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                            {(showCoverUpload || coverMedia.length > 0) && (
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1.5">
                                                            Cover Image
                                                        </label>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setShowCoverUpload(false);
                                                                setCoverMedia([]);
                                                            }}
                                                            className="h-5 w-5 rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 cursor-pointer flex items-center justify-center transition-colors"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                    {coverMedia.length > 0 ? (
                                                        <div className="relative group rounded-xl overflow-hidden shadow-sm border border-zinc-200 dark:border-zinc-800 h-48 w-full bg-zinc-100 dark:bg-zinc-900 border-dashed">
                                                            <img
                                                                src={coverMedia[0].url}
                                                                alt="Cover"
                                                                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setCoverMedia([])}
                                                                className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 shadow-md backdrop-blur-md cursor-pointer"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <MediaUpload
                                                            bucket="listing-media"
                                                            pathPrefix={`listings/${listingType}`}
                                                            maxFiles={1}
                                                            maxSizeMB={10}
                                                            initialMedia={coverMedia}
                                                            onChange={(media) => setCoverMedia(media.slice(0, 1))}
                                                        />
                                                    )}
                                                </div>
                                            )}

                                            {(showAttachmentUpload || attachmentMedia.length > 0) && (
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1.5">
                                                            Attached Files
                                                        </label>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setShowAttachmentUpload(false);
                                                                setAttachmentMedia([]);
                                                            }}
                                                            className="h-6 w-6 rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 cursor-pointer flex items-center justify-center transition-colors cursor-pointer"
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                    <MediaUpload
                                                        bucket="listing-media"
                                                        pathPrefix={`listings/${listingType}/attachments`}
                                                        maxFiles={8}
                                                        maxSizeMB={20}
                                                        initialMedia={attachmentMedia}
                                                        onChange={setAttachmentMedia}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </section>

                                {/* ── Custom Fields Section ── */}
                                <section className="space-y-5">
                                    <div className="flex items-center gap-3">
                                        <div className="h-5 w-5 rounded bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center shrink-0">
                                            <Layers className="h-3 w-3 text-indigo-500" />
                                        </div>
                                        <h3 className="text-[13px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider shrink-0 whitespace-nowrap">
                                            Application Form Fields (what applicants submit)
                                        </h3>
                                        <div className="h-px bg-zinc-200 dark:bg-zinc-800/60 flex-1 ml-1" />
                                    </div>
                                    <CustomFieldsTab
                                        fields={customFields}
                                        setFields={setCustomFields}
                                        pricingType={pricingType}
                                        workspaceId={defaultWorkspaceId}
                                        onCreateField={handleCreateField}
                                        onUpdateField={handleUpdateField}
                                    />
                                </section>

                                {/* ── Settings Section ── */}
                                <section className="space-y-5">
                                    <div className="flex items-center gap-3">
                                        <div className="h-5 w-5 rounded bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center shrink-0">
                                            <Settings2 className="h-3 w-3 text-indigo-500" />
                                        </div>
                                        <h3 className="text-[13px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider shrink-0 whitespace-nowrap">Custom Settings</h3>
                                        <div className="h-px bg-zinc-200 dark:bg-zinc-800/60 flex-1 ml-1" />
                                    </div>
                                    <div className="space-y-6 bg-zinc-50/50 dark:bg-zinc-900/20 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                        {isAsset && (
                                            <div className="space-y-3">
                                                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                                                    Cloning &amp; Republishing
                                                </label>
                                                <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden bg-white dark:bg-zinc-950 shadow-sm">
                                                    <label className="flex items-start justify-between gap-4 p-5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                                                        <div>
                                                            <p className="text-[15px] font-semibold text-zinc-800 dark:text-zinc-200">
                                                                Allow cloning as a template
                                                            </p>
                                                            <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                                                                Users who install this {listingType} can share it further as a cloneable template.
                                                            </p>
                                                        </div>
                                                        <Switch
                                                            checked={allowCloning}
                                                            onCheckedChange={(v) => setAllowCloning(!!v)}
                                                            className="mt-0.5"
                                                        />
                                                    </label>
                                                    <label className="flex items-start justify-between gap-4 p-5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                                                        <div>
                                                            <p className="text-[15px] font-semibold text-zinc-800 dark:text-zinc-200">
                                                                Allow republishing to the marketplace
                                                            </p>
                                                            <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                                                                Users who install this {listingType} can modify and republish it back to the marketplace.
                                                            </p>
                                                        </div>
                                                        <Switch
                                                            checked={allowRepublishing}
                                                            onCheckedChange={(v) => setAllowRepublishing(!!v)}
                                                            className="mt-0.5"
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-3">
                                            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                                                Visibility
                                            </label>
                                            <div className="flex gap-3">
                                                {[
                                                    { id: "public", label: "🌐 Public Marketplace", desc: "Listed on the global marketplace." },
                                                    { id: "unlisted", label: "🔗 Unlisted Listing", desc: "Accessible only via direct share link." },
                                                ].map((opt) => (
                                                    <div
                                                        key={opt.id}
                                                        className={cn(
                                                            "flex-1 rounded-xl border p-4 cursor-pointer transition-all shadow-sm",
                                                            opt.id === "public"
                                                                ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-700"
                                                                : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 bg-white"
                                                        )}
                                                    >
                                                        <p className="text-[15px] font-semibold text-zinc-800 dark:text-zinc-200">{opt.label}</p>
                                                        <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-1">{opt.desc}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </section>

                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-7 py-3.5 border-t border-zinc-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 flex items-center justify-between shrink-0 z-10">
                            <div className="flex items-center gap-3">
                                {/* Step indicator left */}
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1">
                                        <div className="h-1.5 w-5 bg-zinc-800 dark:bg-zinc-200 rounded-full transition-all" />
                                        <div className="h-1.5 w-1.5 rounded-full transition-all bg-zinc-200 dark:bg-zinc-700" />
                                    </div>
                                    <span className="text-[11px] text-zinc-800 dark:text-zinc-200 font-bold uppercase tracking-widest">Step 1</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onOpenChange(false)}
                                    className="h-9 px-4 text-[13px] font-medium text-zinc-500 cursor-pointer hover:text-zinc-800 dark:hover:text-zinc-200"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    disabled={!title || !displayDescription.replace(/<[^>]+>/g, '').trim()}
                                    onClick={() => setScreen("preview")}
                                    className="h-9 px-5 text-[13px] font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-white shadow-sm transition-colors cursor-pointer"
                                >
                                    Review Listing <ChevronRight className="h-3.5 w-3.5 ml-1.5" />
                                </Button>
                            </div>
                        </div>
                    </>
                )}

                {/* ── Preview Screen ── */}
                {screen === "preview" && (
                    <>
                        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0 space-y-4">
                            <div className="inline-flex rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 p-1">
                                <button
                                    type="button"
                                    onClick={() => setPreviewTab("listing")}
                                    className={cn(
                                        "h-8 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer",
                                        previewTab === "listing"
                                            ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                                            : "text-zinc-600 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-zinc-800/60"
                                    )}
                                >
                                    Listing View
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewTab("application")}
                                    className={cn(
                                        "h-8 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer",
                                        previewTab === "application"
                                            ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                                            : "text-zinc-600 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-zinc-800/60"
                                    )}
                                >
                                    Application Form
                                </button>
                            </div>

                            {previewTab === "listing" ? (
                                <>
                                    <PreviewCard
                                        entityType={listingType}
                                        title={title}
                                        description={displayDescription}
                                        categories={selectedCategories.length > 0 ? selectedCategories : ["other"]}
                                        pricingType={pricingType}
                                        pricingModel={pricingModel}
                                        creditAmount={creditAmount}
                                        maxCreditAmount={maxCreditAmount}
                                        coverMedia={coverMedia}
                                        attachmentMedia={attachmentMedia}
                                        tags={tags}
                                        useCases={useCases}
                                        intendedUsers={intendedUsers}
                                        customFields={customFields}
                                        allowCloning={allowCloning}
                                        allowRepublishing={allowRepublishing}
                                        isAsset={isAsset}
                                    />
                                </>
                            ) : (
                                <ApplicationFormFieldsPreview pricingType={pricingType} customFields={customFields} />
                            )}

                            {previewTab === "listing" && !displayDescription && (
                                <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-3 flex items-center gap-2.5">
                                    <Wand2 className="h-4 w-4 text-amber-500 shrink-0" />
                                    <p className="text-xs text-amber-700 dark:text-amber-400">
                                        Your listing has no description yet.{" "}
                                        <button
                                            type="button"
                                            className="font-semibold underline"
                                            onClick={() => setScreen("configure")}
                                        >
                                            Add one now
                                        </button>{" "}
                                        to boost discoverability.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Preview footer */}
                        <div className="px-7 py-3.5 border-t border-zinc-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 flex items-center justify-between shrink-0 z-10">
                            <div className="flex items-center gap-3">
                                {/* Step indicator left */}
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1">
                                        <div className="h-1.5 w-1.5 rounded-full transition-all bg-zinc-200 dark:bg-zinc-700" />
                                        <div className="h-1.5 w-5 bg-zinc-800 dark:bg-zinc-200 rounded-full transition-all" />
                                    </div>
                                    <span className="text-[11px] text-zinc-800 dark:text-zinc-200 font-bold uppercase tracking-widest">Step 2</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={submitListing}
                                    disabled={!title || publishListingMutation.isPending}
                                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md shadow-emerald-200 dark:shadow-emerald-900/40 text-[13px] px-6 h-9 cursor-pointer"
                                >
                                    {publishListingMutation.isPending ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                            Saving…
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4 mr-2 opacity-80" />
                                            Save Changes
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </>
                )}

            </DialogContent>
        </Dialog>
    );
}
