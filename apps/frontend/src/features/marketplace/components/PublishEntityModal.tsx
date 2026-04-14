"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
    Wand2,
    ArrowRight,
    CheckCircle2,
    Globe,
    Plus,
    X,
    Save,
    LayoutTemplate,
    Search,
    Check,
    Star,
} from "lucide-react";
import { ListingType } from "../types/marketplace.types";
import { aiListingService } from "@/services/ai-listing.service";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

// ─── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
    { id: "sales", label: "Sales", description: "Sales outreach, pipeline operations, and prospecting tasks." },
    { id: "marketing", label: "Marketing", description: "Marketing, product marketing, social media, SEO or advertising." },
    { id: "content", label: "Content Creation", description: "Generating text, images, videos, or audio content." },
    { id: "it", label: "IT & Software Engineering", description: "Infrastructure monitoring, code generation, code review, documentation assistance." },
    { id: "hr", label: "HR & Recruitment", description: "Candidate sourcing, resume screening, and employee onboarding automation." },
    { id: "research", label: "Research", description: "Researching, information gathering, synthesis, and insight generation." },
    { id: "support", label: "Customer Support", description: "Responding to customer queries, ticket triaging, and FAQ resolution." },
    { id: "product", label: "Product & Design", description: "Product research, UX analysis, and creative ideation tasks." },
    { id: "ops", label: "Operations", description: "Automation of business processes, admin tooling, and internal workflows." },
    { id: "data", label: "Data & Analytics", description: "Dashboard updates, data cleaning, and analysis report generation." },
    { id: "revops", label: "Revenue Ops", description: "Revenue operations support including CRM hygiene and reporting." },
    { id: "security", label: "Security", description: "Threat detection, compliance checks, and vulnerability triage." },
    { id: "finance", label: "Finance", description: "Expense reconciliation, invoicing, and financial modeling." },
    { id: "legal", label: "Legal", description: "Contract review, compliance checks, and legal research automation." },
    { id: "fun", label: "Fun", description: "Entertainment, humor, or creative play agents." },
    { id: "education", label: "Education", description: "Learning aids, tutoring agents, or course content generators." },
    { id: "ecommerce", label: "E-commerce", description: "Store management, product listing, pricing analysis, or review summarization." },
    { id: "healthcare", label: "Healthcare", description: "Patient intake, documentation, or clinical information automation." },
    { id: "realestate", label: "Real Estate", description: "Property listing, inquiry handling, and market research." },
    { id: "travel", label: "Travel", description: "Itinerary planning, booking assistance, or travel advisory agents." },
    { id: "other", label: "Other", description: "Tasks that don't fit standard categories or are highly custom." },
];

const CREDITS_TO_USD = 0.1; // 1 credit = $0.10

// ─── Types ──────────────────────────────────────────────────────────────────────

interface CustomField {
    id: string;
    label: string;
    value: string;
}

interface FieldTemplate {
    id: string;
    name: string;
    fields: CustomField[];
    createdAt: string;
}

// ─── Template Center Modal ──────────────────────────────────────────────────────

function TemplateCenterModal({
    open,
    onClose,
    onApply,
}: {
    open: boolean;
    onClose: () => void;
    onApply: (template: FieldTemplate) => void;
}) {
    const [search, setSearch] = useState("");
    const [templates, setTemplates] = useState<FieldTemplate[]>([]);
    const [selected, setSelected] = useState<FieldTemplate | null>(null);

    useEffect(() => {
        if (open) {
            const stored = localStorage.getItem("publish_field_templates");
            setTemplates(stored ? JSON.parse(stored) : []);
            setSelected(null);
            setSearch("");
        }
    }, [open]);

    const filtered = templates.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl h-[80vh] p-0 flex flex-col overflow-hidden border-none shadow-2xl">
                {/* Header */}
                <div className="flex items-center gap-2.5 px-6 py-4 border-b border-zinc-100 shrink-0">
                    <LayoutTemplate className="h-5 w-5 text-indigo-500" />
                    <span className="text-lg font-bold text-zinc-900">Template Center</span>
                </div>

                <div className="flex flex-1 min-h-0 overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-52 border-r border-zinc-100 bg-zinc-50/60 flex flex-col py-3 px-2 shrink-0 overflow-y-auto">
                        <button className="flex items-center gap-2 px-3 py-2 rounded-md bg-indigo-50 text-indigo-700 text-sm font-semibold mb-1">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            Workspace Templates
                            <span className="ml-auto text-[11px] bg-indigo-100 text-indigo-600 rounded-full px-1.5 py-0.5 leading-none">
                                {templates.length}
                            </span>
                        </button>

                        <div className="mt-4 px-1">
                            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider px-2">
                                Categories
                            </span>
                            <div className="mt-1.5 space-y-0.5">
                                {CATEGORIES.slice(0, 10).map((c) => (
                                    <button
                                        key={c.id}
                                        className="w-full text-left text-xs text-zinc-500 hover:text-zinc-900 py-1.5 px-2 rounded hover:bg-zinc-100 transition-colors"
                                    >
                                        {c.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Main area */}
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        {/* Search bar */}
                        <div className="px-5 pt-4 pb-3 border-b border-zinc-100 shrink-0">
                            <div className="flex h-9 items-center rounded-md border border-zinc-200 bg-white px-3 shadow-sm transition-colors focus-within:border-indigo-500">
                                <Search className="h-4 w-4 shrink-0 text-zinc-400" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search templates..."
                                    className="flex-1 h-full bg-transparent pl-2 text-sm outline-none border-none placeholder:text-zinc-400"
                                />
                                {search && (
                                    <button onClick={() => setSearch("")}>
                                        <X className="h-3.5 w-3.5 text-zinc-400 hover:text-zinc-600" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Template grid */}
                        <div className="flex-1 overflow-y-auto px-5 py-4">
                            {filtered.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                                    <LayoutTemplate className="h-12 w-12 text-zinc-200 mb-3" />
                                    <p className="text-sm font-semibold text-zinc-500">No templates yet</p>
                                    <p className="text-xs text-zinc-400 mt-1 max-w-[220px]">
                                        Save custom field sets as templates and they'll appear here.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                                        Workspace Templates
                                    </p>
                                    <div className="grid grid-cols-3 gap-3">
                                        {filtered.map((t) => (
                                            <button
                                                key={t.id}
                                                onClick={() => setSelected(t)}
                                                className={cn(
                                                    "text-left p-3 rounded-xl border transition-all",
                                                    selected?.id === t.id
                                                        ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-400"
                                                        : "border-zinc-200 hover:border-indigo-300 hover:bg-zinc-50"
                                                )}
                                            >
                                                <div className="h-16 rounded-md bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mb-2.5">
                                                    <LayoutTemplate className="h-7 w-7 text-indigo-400" />
                                                </div>
                                                <p className="text-sm font-semibold text-zinc-800 truncate">{t.name}</p>
                                                <p className="text-xs text-zinc-400 mt-0.5">
                                                    {t.fields.length} field{t.fields.length !== 1 ? "s" : ""}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer — shown when a template is selected */}
                        {selected && (
                            <div className="border-t border-zinc-100 px-5 py-3 bg-white flex items-center justify-between shrink-0">
                                <div>
                                    <p className="text-sm font-semibold text-zinc-800">{selected.name}</p>
                                    <p className="text-xs text-zinc-400">{selected.fields.length} custom fields</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={onClose}>
                                        Cancel
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => { onApply(selected); onClose(); }}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                    >
                                        <Check className="h-3.5 w-3.5 mr-1.5" /> Use Template
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ─── Save Template Modal ────────────────────────────────────────────────────────

function SaveTemplateModal({
    open,
    onClose,
    fields,
}: {
    open: boolean;
    onClose: () => void;
    fields: CustomField[];
}) {
    const [name, setName] = useState("");
    const { toast } = useToast();

    const save = () => {
        if (!name.trim()) return;
        const stored = localStorage.getItem("publish_field_templates");
        const existing: FieldTemplate[] = stored ? JSON.parse(stored) : [];
        const newTemplate: FieldTemplate = {
            id: Date.now().toString(),
            name: name.trim(),
            fields,
            createdAt: new Date().toISOString(),
        };
        localStorage.setItem(
            "publish_field_templates",
            JSON.stringify([...existing, newTemplate])
        );
        toast({
            title: "Template saved!",
            description: `"${name}" is now available in your Template Center.`,
        });
        setName("");
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Save className="h-4 w-4 text-indigo-500" /> Save as Template
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                        <Label className="text-xs text-zinc-500">Template name *</Label>
                        <Input
                            autoFocus
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && save()}
                            placeholder="e.g. Blog Post Checklist"
                        />
                    </div>
                    <p className="text-xs text-zinc-400">
                        {fields.length} custom field{fields.length !== 1 ? "s" : ""} will be saved.
                    </p>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            disabled={!name.trim()}
                            onClick={save}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            Save Template
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ─── Main Modal ─────────────────────────────────────────────────────────────────

interface PublishEntityModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entityType: ListingType;
    entityId?: string;
    initialTitle?: string;
    initialDescription?: string;
}

export function PublishEntityModal({
    open,
    onOpenChange,
    entityType,
    entityId,
    initialTitle = "",
    initialDescription = "",
}: PublishEntityModalProps) {
    const { toast } = useToast();
    const [step, setStep] = useState(1);

    // Core form
    const [roughDraft, setRoughDraft] = useState(initialDescription);
    const [isAiProcessing, setIsAiProcessing] = useState(false);

    // New Step-1 fields
    const [selectedCategory, setSelectedCategory] = useState("");
    const [pricingType, setPricingType] = useState<"free" | "paid">("free");
    const [creditAmount, setCreditAmount] = useState<number>(10);
    const [customFields, setCustomFields] = useState<CustomField[]>([]);
    const [allowCloning, setAllowCloning] = useState(true);
    const [allowRepublishing, setAllowRepublishing] = useState(false);

    // Sub-modal visibility
    const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
    const [templateCenterOpen, setTemplateCenterOpen] = useState(false);

    // AI output
    const [polishedTitle, setPolishedTitle] = useState(initialTitle);
    const [polishedDescription, setPolishedDescription] = useState("");
    const [suggestedSkills, setSuggestedSkills] = useState<string[]>([]);
    const [suggestedBudget, setSuggestedBudget] = useState("");
    const [useCases, setUseCases] = useState<string[]>([]);
    const [intendedUsers, setIntendedUsers] = useState<string[]>([]);

    const isAsset = ["agent", "tool", "template", "workforce"].includes(
        entityType.toLowerCase()
    );

    // Reset when modal opens
    useEffect(() => {
        if (open) {
            setStep(1);
            setRoughDraft(initialDescription ?? "");
            setPolishedTitle(initialTitle ?? "");
            setPolishedDescription("");
            setSuggestedSkills([]);
            setSuggestedBudget("");
            setUseCases([]);
            setIntendedUsers([]);
            setSelectedCategory("");
            setPricingType("free");
            setCreditAmount(10);
            setCustomFields([]);
            setAllowCloning(true);
            setAllowRepublishing(false);
        }
    }, [open, entityId]);

    const handleNext = () => setStep((s) => s + 1);
    const handleBack = () => setStep((s) => s - 1);

    const addCustomField = () =>
        setCustomFields((f) => [...f, { id: `${Date.now()}`, label: "", value: "" }]);

    const updateField = (id: string, key: "label" | "value", val: string) =>
        setCustomFields((f) =>
            f.map((field) => (field.id === id ? { ...field, [key]: val } : field))
        );

    const removeField = (id: string) =>
        setCustomFields((f) => f.filter((field) => field.id !== id));

    const generateDraftWithAI = async () => {
        setIsAiProcessing(true);
        setStep(2);
        try {
            const response = await aiListingService.generateListing({
                entityType,
                entityId,
                title: polishedTitle,
                description: roughDraft,
            });
            if (response) {
                setPolishedTitle(response.taskTitle || polishedTitle);
                setPolishedDescription(response.detailedDesc || response.description || "");
                setSuggestedSkills([
                    ...(response.skills || []),
                    ...(response.niceToHaveSkills || []),
                ]);
                if (isAsset) {
                    setUseCases(response.useCases || []);
                    setIntendedUsers(response.intendedUsers || []);
                } else {
                    setSuggestedBudget("$800 – $1,500");
                }
            }
        } catch {
            setPolishedTitle(polishedTitle || "Optimized Listing Title");
            setPolishedDescription(
                roughDraft +
                "\n\n(AI perfectly polished and SEO optimized version of your listing would go here...)"
            );
            setSuggestedSkills(["Expert", "Verified"]);
            if (!isAsset) setSuggestedBudget("Negotiable");
        } finally {
            setIsAiProcessing(false);
        }
    };

    const submitListing = () => {
        toast({
            title: "Successfully Published!",
            description: "Your entity is now live on the global marketplace.",
        });
        onOpenChange(false);
        setStep(1);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-none shadow-2xl max-h-[85vh] flex flex-col">
                    {/* Progress bar */}
                    <div className="bg-muted/40 px-6 py-4 border-b border-border flex gap-2 shrink-0">
                        {[1, 2, 3].map((s) => (
                            <div
                                key={s}
                                className={`h-1.5 flex-1 rounded-full transition-colors ${
                                    step >= s
                                        ? step === 2 && isAiProcessing
                                            ? "bg-amber-400 animate-pulse"
                                            : "bg-primary"
                                        : "bg-zinc-200 dark:bg-zinc-800"
                                }`}
                            />
                        ))}
                    </div>

                    <DialogHeader className="px-6 pt-5 pb-1 shrink-0">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            {step === 1 && (
                                <>
                                    <Globe className="h-5 w-5 text-indigo-500" /> Publish {entityType}
                                </>
                            )}
                            {step === 2 &&
                                (isAiProcessing
                                    ? "AI is rewriting your listing…"
                                    : "Review AI Suggestions")}
                            {step === 3 && "Final Preview"}
                        </DialogTitle>
                    </DialogHeader>

                    {/* Scrollable content */}
                    <div className="px-6 pb-6 flex-1 overflow-y-auto">

                        {/* ── STEP 1 ── */}
                        {step === 1 && (
                            <div className="mt-4 space-y-5 animate-in fade-in">

                                {/* Title */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Base Title
                                    </label>
                                    <Input
                                        value={polishedTitle}
                                        onChange={(e) => setPolishedTitle(e.target.value)}
                                        placeholder="e.g. Frontend Optimization Task"
                                    />
                                </div>

                                {/* Category */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Category
                                    </label>
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                                    >
                                        <option value="">Select a category…</option>
                                        {CATEGORIES.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.label}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedCategory && (
                                        <p className="text-xs text-zinc-400">
                                            {CATEGORIES.find((c) => c.id === selectedCategory)?.description}
                                        </p>
                                    )}
                                </div>

                                {/* Description */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Description &amp; Context
                                    </label>
                                    <Textarea
                                        className="min-h-[100px] text-sm leading-relaxed resize-none"
                                        placeholder="Provide internal details or scratchpad notes. AI will extract what is public and format it for the marketplace."
                                        value={roughDraft}
                                        onChange={(e) => setRoughDraft(e.target.value)}
                                    />
                                </div>

                                {/* Pricing */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Pricing
                                    </label>
                                    <div className="flex gap-2">
                                        {(["free", "paid"] as const).map((type) => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setPricingType(type)}
                                                className={cn(
                                                    "flex-1 py-2 px-4 rounded-md border text-sm font-medium transition-all",
                                                    pricingType === type
                                                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm"
                                                        : "border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50"
                                                )}
                                            >
                                                {type === "free" ? "🆓 Free" : "💰 Paid"}
                                            </button>
                                        ))}
                                    </div>

                                    {pricingType === "paid" && (
                                        <div className="mt-2 p-3 rounded-lg border border-amber-200 bg-amber-50 space-y-2">
                                            <label className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                                                Credits Required
                                            </label>
                                            <div className="flex items-center gap-3">
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    value={creditAmount}
                                                    onChange={(e) => setCreditAmount(Number(e.target.value))}
                                                    className="w-28 h-8 text-sm"
                                                />
                                                <span className="text-sm text-zinc-500">credits</span>
                                                <div className="ml-auto text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md tabular-nums">
                                                    ≈ ${(creditAmount * CREDITS_TO_USD).toFixed(2)} USD
                                                </div>
                                            </div>
                                            <p className="text-[11px] text-amber-600">
                                                1 credit = ${CREDITS_TO_USD.toFixed(2)} USD
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Custom Fields */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Custom Fields
                                        </label>
                                        <div className="flex gap-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2"
                                                onClick={() => setTemplateCenterOpen(true)}
                                            >
                                                <LayoutTemplate className="h-3 w-3 mr-1" /> Apply Template
                                            </Button>
                                            {customFields.length > 0 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-xs text-zinc-500 hover:text-zinc-700 px-2"
                                                    onClick={() => setSaveTemplateOpen(true)}
                                                >
                                                    <Save className="h-3 w-3 mr-1" /> Save as Template
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {customFields.length > 0 && (
                                        <div className="space-y-2 rounded-lg border border-zinc-100 bg-zinc-50/70 p-3">
                                            {customFields.map((field) => (
                                                <div key={field.id} className="flex gap-2 items-center">
                                                    <Input
                                                        value={field.label}
                                                        onChange={(e) => updateField(field.id, "label", e.target.value)}
                                                        placeholder="Field name"
                                                        className="h-8 text-sm w-36 shrink-0"
                                                    />
                                                    <Input
                                                        value={field.value}
                                                        onChange={(e) => updateField(field.id, "value", e.target.value)}
                                                        placeholder="Value"
                                                        className="h-8 text-sm flex-1"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeField(field.id)}
                                                        className="h-7 w-7 flex items-center justify-center rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs border-dashed w-full text-zinc-500 hover:text-zinc-700"
                                        onClick={addCustomField}
                                    >
                                        <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Custom Field
                                    </Button>
                                </div>

                                {/* Asset-only permissions */}
                                {isAsset && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Permissions after cloning
                                        </label>
                                        <div className="rounded-lg border border-zinc-200 divide-y divide-zinc-100">
                                            <label className="flex items-start gap-3 p-3.5 cursor-pointer hover:bg-zinc-50 transition-colors">
                                                <Checkbox
                                                    checked={allowCloning}
                                                    onCheckedChange={(v) => setAllowCloning(!!v)}
                                                    className="mt-0.5"
                                                />
                                                <div>
                                                    <p className="text-sm font-medium text-zinc-800">
                                                        Allow sharing as a cloneable template
                                                    </p>
                                                    <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                                                        After a user clones this listing from the marketplace, allow them to
                                                        share this {entityType} and its associated entities as a cloneable template.
                                                    </p>
                                                </div>
                                            </label>
                                            <label className="flex items-start gap-3 p-3.5 cursor-pointer hover:bg-zinc-50 transition-colors">
                                                <Checkbox
                                                    checked={allowRepublishing}
                                                    onCheckedChange={(v) => setAllowRepublishing(!!v)}
                                                    className="mt-0.5"
                                                />
                                                <div>
                                                    <p className="text-sm font-medium text-zinc-800">
                                                        Allow republishing to the marketplace
                                                    </p>
                                                    <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                                                        After a user clones this listing from the marketplace, allow this{" "}
                                                        {entityType} and its associated entities to be included in the user's
                                                        own marketplace submissions.
                                                    </p>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── STEP 2 ── */}
                        {step === 2 && (
                            <div className="mt-6 flex flex-col items-center justify-center text-center space-y-6">
                                {isAiProcessing ? (
                                    <>
                                        <div className="relative">
                                            <Wand2 className="h-16 w-16 text-amber-500 animate-bounce" />
                                            <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full" />
                                        </div>
                                        <p className="text-muted-foreground animate-pulse">
                                            Extracting parameters, analyzing entity data…
                                        </p>
                                    </>
                                ) : (
                                    <div className="w-full text-left space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase">
                                                Public Title
                                            </label>
                                            <Input
                                                value={polishedTitle}
                                                onChange={(e) => setPolishedTitle(e.target.value)}
                                            />
                                        </div>
                                        {!isAsset && (
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-muted-foreground uppercase">
                                                    Target Budget / Price
                                                </label>
                                                <Input
                                                    value={suggestedBudget}
                                                    onChange={(e) => setSuggestedBudget(e.target.value)}
                                                />
                                            </div>
                                        )}
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase">
                                                Tags &amp; Skills
                                            </label>
                                            <div className="flex flex-wrap gap-2 pt-1">
                                                {suggestedSkills.map((skill, idx) => (
                                                    <Badge key={idx} variant="secondary" className="px-2.5 py-1">
                                                        {skill}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                        {isAsset && useCases.length > 0 && (
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-muted-foreground uppercase">
                                                    Use Cases
                                                </label>
                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    {useCases.map((uc, idx) => (
                                                        <Badge key={`uc-${idx}`} variant="outline" className="px-2.5 py-1">
                                                            {uc}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── STEP 3 ── */}
                        {step === 3 && (
                            <div className="mt-6 p-5 rounded-xl border border-primary/20 bg-primary/5 space-y-4">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <Badge className="capitalize">{entityType}</Badge>
                                    {selectedCategory && (
                                        <Badge variant="outline">
                                            {CATEGORIES.find((c) => c.id === selectedCategory)?.label}
                                        </Badge>
                                    )}
                                    {pricingType === "free" ? (
                                        <Badge variant="secondary" className="text-emerald-700 bg-emerald-50 border-emerald-200">
                                            Free
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="text-amber-700 bg-amber-50 border-amber-200">
                                            💰 {creditAmount} credits (≈ ${(creditAmount * CREDITS_TO_USD).toFixed(2)})
                                        </Badge>
                                    )}
                                    {!isAsset && suggestedBudget && (
                                        <span className="text-sm font-semibold text-emerald-600 font-mono">
                                            {suggestedBudget}
                                        </span>
                                    )}
                                    {isAsset && intendedUsers.length > 0 && (
                                        <span className="text-xs text-muted-foreground">
                                            For: {intendedUsers.join(", ")}
                                        </span>
                                    )}
                                </div>

                                <h3 className="text-2xl font-bold">{polishedTitle}</h3>
                                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                    {polishedDescription || roughDraft}
                                </p>

                                {suggestedSkills.length > 0 && (
                                    <div className="flex gap-2 flex-wrap pt-2">
                                        {suggestedSkills.map((skill, idx) => (
                                            <Badge key={idx} variant="outline" className="bg-background">
                                                {skill}
                                            </Badge>
                                        ))}
                                    </div>
                                )}

                                {customFields.filter((f) => f.label).length > 0 && (
                                    <div className="pt-3 border-t border-primary/10 mt-2">
                                        <span className="text-xs font-bold text-muted-foreground uppercase mb-2 block">
                                            Custom Fields
                                        </span>
                                        <div className="grid grid-cols-2 gap-2">
                                            {customFields
                                                .filter((f) => f.label)
                                                .map((f) => (
                                                    <div key={f.id} className="text-sm">
                                                        <span className="font-medium text-zinc-700">{f.label}: </span>
                                                        <span className="text-zinc-500">{f.value || "—"}</span>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}

                                {isAsset && useCases.length > 0 && (
                                    <div className="pt-2 border-t border-primary/10">
                                        <span className="text-xs font-bold text-muted-foreground uppercase mb-2 block">
                                            Use Cases
                                        </span>
                                        <ul className="list-disc pl-4 text-sm text-muted-foreground space-y-0.5">
                                            {useCases.map((uc, i) => (
                                                <li key={i}>{uc}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-muted/30 border-t border-border flex justify-between items-center shrink-0">
                        {step > 1 && !isAiProcessing ? (
                            <Button variant="ghost" onClick={handleBack}>
                                Back
                            </Button>
                        ) : (
                            <div />
                        )}

                        {step === 1 && (
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setPolishedDescription(roughDraft);
                                        setStep(3);
                                    }}
                                >
                                    Skip AI Auto-Write
                                </Button>
                                <Button
                                    onClick={generateDraftWithAI}
                                    disabled={!polishedTitle && !roughDraft}
                                    className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0"
                                >
                                    <Wand2 className="h-4 w-4 mr-2" /> Polish with AI
                                </Button>
                            </div>
                        )}
                        {step === 2 && !isAiProcessing && (
                            <Button onClick={handleNext}>
                                Looks Good <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                        )}
                        {step === 3 && (
                            <Button
                                onClick={submitListing}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <CheckCircle2 className="h-4 w-4 mr-2" /> Global Publish
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Sub-modals */}
            <TemplateCenterModal
                open={templateCenterOpen}
                onClose={() => setTemplateCenterOpen(false)}
                onApply={(template) => {
                    setCustomFields(
                        template.fields.map((f) => ({
                            ...f,
                            id: `${Date.now()}-${Math.random()}`,
                        }))
                    );
                }}
            />
            <SaveTemplateModal
                open={saveTemplateOpen}
                onClose={() => setSaveTemplateOpen(false)}
                fields={customFields}
            />
        </>
    );
}
