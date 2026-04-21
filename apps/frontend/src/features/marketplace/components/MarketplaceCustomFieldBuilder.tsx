"use client";
// React needed for React.Fragment keying
import React from "react";

import { useState, useRef, useMemo } from "react";
import {
    Plus, Settings, FileText, Hash, Mail, Phone, Link as LinkIcon,
    Calendar, Clock, List, CheckCircle2, CheckSquare, Star, DollarSign,
    Percent, Upload, Users, Tag, Gauge, Vote, MapPin, PenLine, LayoutTemplate, CircleChevronDown,
    X, GripVertical, Trash2, Copy, ChevronDown, Type, Search, ChevronRight, Eye, EyeOff, Pencil, ChevronsDown
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
    DndContext, closestCenter, KeyboardSensor, MouseSensor, TouchSensor,
    useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates,
    verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DescriptionEditor } from "@/entities/shared/components/DescriptionEditor";
import { CustomFieldsManagerModal } from "@/entities/customfields/components/CustomFieldsManagerModal";
import { trpc } from "@/lib/trpc";

export interface MarketplaceCustomField {
    id: string;
    dbId?: string;
    customFieldTitle?: string;
    showInApplicationForm?: boolean;
    type: 'text' | 'textarea' | 'number' | 'email' | 'phone' | 'url' | 'date' | 'time' | 'datetime' | 'select' | 'multiselect' | 'radio' | 'checkbox' | 'file' | 'rating' | 'currency' | 'percentage' | 'user' | 'tags' | 'progress' | 'voting' | 'location' | 'signature' | 'block';
    label: string;
    placeholder?: string;
    content?: string;
    required: boolean;
    description?: string;
    options?: string[];
    defaultValue?: any;
    validation?: {
        min?: number;
        max?: number;
        pattern?: string;
        message?: string;
    };
    hideDetailsInTemplate?: boolean;
}

const OPTION_COLOR_PALETTE = [
    "#a5b4fc", "#93c5fd", "#7dd3fc", "#5eead4", "#86efac", "#fcd34d", "#fdba74",
    "#6366f1", "#3b82f6", "#0ea5e9", "#14b8a6", "#22c55e", "#f59e0b", "#f97316",
    "#fca5a5", "#f9a8d4", "#d8b4fe", "#d6bbb1", "#d4d4d4", "#bdbdbd", "#ef4444",
    "#ec4899", "#a855f7", "#8b5e3c", "#71717a",
];

const fieldTypes: { type: MarketplaceCustomField['type']; icon: LucideIcon; label: string }[] = [
    { type: 'text', icon: Type, label: 'Short Text' },
    { type: 'textarea', icon: FileText, label: 'Long Text' },
    { type: 'number', icon: Hash, label: 'Number' },
    { type: 'email', icon: Mail, label: 'Email' },
    { type: 'phone', icon: Phone, label: 'Phone' },
    { type: 'url', icon: LinkIcon, label: 'URL' },
    { type: 'date', icon: Calendar, label: 'Date' },
    { type: 'time', icon: Clock, label: 'Time' },
    { type: 'select', icon: List, label: 'Dropdown' },
    { type: 'multiselect', icon: List, label: 'Multi-Select' },
    { type: 'radio', icon: CheckCircle2, label: 'Radio Buttons' },
    { type: 'checkbox', icon: CheckSquare, label: 'Checkboxes' },
    { type: 'rating', icon: Star, label: 'Rating' },
    { type: 'currency', icon: DollarSign, label: 'Currency' },
    { type: 'percentage', icon: Percent, label: 'Percentage' },
    { type: 'file', icon: Upload, label: 'File Upload' },
    { type: 'user', icon: Users, label: 'User Picker' },
    { type: 'tags', icon: Tag, label: 'Tags' },
    { type: 'progress', icon: Gauge, label: 'Progress' },
    { type: 'voting', icon: Vote, label: 'Voting' },
    { type: 'location', icon: MapPin, label: 'Location' },
    { type: 'signature', icon: PenLine, label: 'Signature' },
    { type: 'block', icon: LayoutTemplate, label: 'Information block' },
];

function SortableFieldItem({ field, onDelete, onUpdate, onDuplicate, onOpenAdvancedSettings, onUpdateField }: {
    field: MarketplaceCustomField;
    onDelete: (id: string) => void;
    onUpdate: (id: string, updates: Partial<MarketplaceCustomField>) => void;
    onDuplicate: (id: string) => void;
    onOpenAdvancedSettings: (fieldId?: string) => void;
    onUpdateField?: (field: MarketplaceCustomField) => void;
}) {
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [builderExpanded, setBuilderExpanded] = useState(true);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: field.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.8 : 1
    };

    const hasOptions = ['select', 'multiselect', 'radio', 'checkbox', 'voting'].includes(field.type);

    const addOption = () => {
        const newOptions = [...(field.options || []), `Option ${(field.options?.length || 0) + 1}`];
        onUpdate(field.id, { options: newOptions });
    };

    const updateOption = (index: number, value: string) => {
        const newOptions = [...(field.options || [])];
        newOptions[index] = value;
        onUpdate(field.id, { options: newOptions });
    };

    const removeOption = (index: number) => {
        const newOptions = field.options?.filter((_, i) => i !== index) || [];
        onUpdate(field.id, { options: newOptions });
    };

    const renderFieldPreview = () => {
        const baseClasses = "bg-zinc-50 border-zinc-200 pointer-events-none";
        const effectiveOptions = field.options && field.options.length > 0 ? field.options : ['Option 1', 'Option 2'];

        switch (field.type) {
            case 'textarea':
                return <Textarea disabled placeholder={field.placeholder || "Enter text..."} className={cn(baseClasses, "resize-none h-24")} />;
            case 'date':
            case 'time':
            case 'datetime':
                return (
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input disabled placeholder={field.placeholder || `Select ${field.type}`} className={cn(baseClasses, "pl-9")} />
                    </div>
                );
            case 'email':
                return (
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input disabled type="email" placeholder={field.placeholder || "email@example.com"} className={cn(baseClasses, "pl-9")} />
                    </div>
                );
            case 'number':
            case 'currency':
            case 'percentage':
                const IconComponent = field.type === 'currency' ? DollarSign : field.type === 'percentage' ? Percent : Hash;
                return (
                    <div className="relative">
                        <IconComponent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input disabled type="number" placeholder={field.placeholder || "0"} className={cn(baseClasses, "pl-9")} />
                    </div>
                );
            case 'select':
                return (
                    <div className="relative">
                        <select disabled className={cn(baseClasses, "w-full h-10 px-3 rounded-md border appearance-none pr-8 cursor-not-allowed")}>
                            <option>{field.placeholder || "Select an option"}</option>
                            {effectiveOptions.map((opt: string, i: number) => <option key={i}>{opt}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                    </div>
                );
            case 'radio':
            case 'checkbox':
                return (
                    <div className="space-y-2">
                        {effectiveOptions.map((opt: string, i: number) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className={cn("h-4 w-4 border-2 border-zinc-300 bg-white", field.type === 'radio' ? "rounded-full" : "rounded")}></div>
                                <span className="text-sm text-zinc-600">{opt}</span>
                            </div>
                        ))}
                    </div>
                );
            case 'rating':
                return (
                    <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="h-6 w-6 text-zinc-300 fill-zinc-300" />)}
                    </div>
                );
            case 'block':
                return (
                    <div className="rounded-md border border-zinc-200 bg-zinc-50/80 p-4 text-left shadow-inner">
                        {field.content?.trim() ? (
                            <div className="prose prose-sm max-w-none text-zinc-700 pointer-events-none" dangerouslySetInnerHTML={{ __html: field.content }} />
                        ) : (
                            <p className="text-sm text-zinc-700 italic">Information block content will appear here</p>
                        )}
                    </div>
                );
            default:
                return <Input disabled placeholder={field.placeholder || `Enter ${field.label}...`} className={baseClasses} />;
        }
    };

    const FieldTypeIcon = fieldTypes.find(t => t.type === field.type)?.icon || Type;

    return (
        <div ref={setNodeRef} style={style} className={cn(
            "group relative bg-white rounded-xl border transition-all overflow-hidden",
            isDragging ? "shadow-xl scale-[1.02] border-indigo-500 ring-2 ring-indigo-200" : "border-zinc-200 hover:border-indigo-300 hover:shadow-sm"
        )}>
            <div className={cn("flex items-center gap-3 px-4 py-3 bg-white", builderExpanded && "border-b border-zinc-100 bg-zinc-50/30")}>
                <div className="cursor-grab active:cursor-grabbing text-zinc-300 hover:text-zinc-500 p-1 -ml-1" {...attributes} {...listeners}>
                    <GripVertical className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="h-8 w-8 rounded-lg bg-zinc-50 border border-zinc-200 shadow-sm flex items-center justify-center text-zinc-600 shrink-0">
                        <FieldTypeIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[14px] font-semibold text-zinc-900 truncate">
                                {field.customFieldTitle || field.label || "Untitled field"}
                            </span>
                            {field.required && <span className="text-red-500 text-sm leading-none">*</span>}
                        </div>
                        <div className="text-[11px] text-zinc-500 capitalize leading-tight">{field.type.replace('_', ' ')}</div>
                    </div>
                </div>

                <div className={cn("ml-auto flex shrink-0 items-center gap-1 transition-opacity", builderExpanded ? "opacity-0 group-hover:opacity-100" : "opacity-100")}>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-8 w-8 cursor-pointer",
                            field.showInApplicationForm === false
                                ? "text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                                : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                        )}
                        onClick={() => onUpdate(field.id, { showInApplicationForm: field.showInApplicationForm === false })}
                    >
                        {field.showInApplicationForm === false ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer" onClick={() => onDuplicate(field.id)}>
                        <Copy className="h-4 w-4" />
                    </Button>
                    <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-sky-600 hover:bg-sky-50 cursor-pointer">
                                <Pencil className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent
                            align="end"
                            sideOffset={8}
                            className="w-[320px] p-0 font-sans shadow-xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200 z-50"
                        >
                            <FieldConfigPopoverContent
                                mode="edit"
                                type={field.type}
                                initialName={field.customFieldTitle || field.label}
                                initialDescription={field.description}
                                onConfirm={() => setSettingsOpen(false)}
                                onCancel={() => setSettingsOpen(false)}
                                onChange={(name, description) => {
                                    const updates: Partial<MarketplaceCustomField> = {
                                        customFieldTitle: name,
                                        description,
                                    };
                                    onUpdate(field.id, updates);
                                    // Notify parent to sync with backend
                                    onUpdateField?.({ ...field, ...updates });
                                }}
                            />
                            <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-4" />

                            {/* Advanced settings footer */}
                            <div className="p-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSettingsOpen(false);
                                        onOpenAdvancedSettings(field.dbId);
                                    }}
                                    className="w-full rounded-lg flex items-center justify-between px-4 py-2 text-[13px] font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer text-left group/adv"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Settings className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 group-hover/adv:text-zinc-600 dark:group-hover/adv:text-zinc-300" />
                                        <span>Advanced settings</span>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-zinc-300 group-hover/adv:text-zinc-400 transition-colors" />
                                </button>
                            </div>
                        </PopoverContent>
                    </Popover>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-600 hover:bg-red-50 cursor-pointer" onClick={() => onDelete(field.id)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 ml-1 cursor-pointer transition-colors text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                            onClick={(e) => { e.stopPropagation(); setBuilderExpanded((v) => !v); }}
                        >
                            <CircleChevronDown className={cn("h-4 w-4 transition-transform duration-200", builderExpanded && "rotate-180")} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={6}>
                        {builderExpanded ? "Collapse field" : "Expand field"}
                    </TooltipContent>
                </Tooltip>
            </div>

            {builderExpanded && (
                <div className="px-6 py-5 bg-white">
                    <div className="grid gap-x-6 gap-y-5 grid-cols-1 md:grid-cols-2">
                        <div className="space-y-2 col-span-1 md:col-span-2">
                            <Label className="text-xs font-semibold text-zinc-700">Form Field Title</Label>
                            <Input value={field.label} onChange={(e) => onUpdate(field.id, { label: e.target.value })} className="h-10 text-[14px]" placeholder="Enter name..." />
                        </div>
                        <div className="space-y-2 col-span-1 md:col-span-2">
                            <Label className="text-xs font-semibold text-zinc-700">Description (optional)</Label>
                            <Input value={field.description || ""} onChange={(e) => onUpdate(field.id, { description: e.target.value })} className="h-10 text-[14px]" placeholder="Add a description or hint..." />
                        </div>

                        {field.type !== 'block' && (
                            <div className="space-y-2 col-span-1 md:col-span-2">
                                <Label className="text-xs font-semibold text-zinc-700">Placeholder</Label>
                                <Input value={field.placeholder || ""} onChange={(e) => onUpdate(field.id, { placeholder: e.target.value })} className="h-10 text-[14px]" placeholder="Placeholder text..." />
                            </div>
                        )}

                        {field.type === 'block' && (
                            <div className="space-y-2 col-span-1 md:col-span-2">
                                <Label className="text-xs font-semibold text-zinc-700">Content</Label>
                                <div className="rounded-md border border-zinc-200 overflow-hidden shadow-sm">
                                    <DescriptionEditor
                                        content={field.content || ""}
                                        onChange={(html) => onUpdate(field.id, { content: html })}
                                        editable
                                        workspaceId={null}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {hasOptions && (
                        <div className="mt-6 pt-5 border-t border-zinc-100 bg-zinc-50/50 -mx-6 px-6 -mb-5 pb-5">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-bold uppercase tracking-wider text-zinc-600">Options</span>
                                <Button variant="outline" size="sm" className="h-7 text-xs cursor-pointer shadow-sm bg-white" onClick={addOption}>
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add Option
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {(field.options || []).map((option, idx) => (
                                    <div key={idx} className="flex items-center gap-2 bg-white p-1 rounded-md border border-zinc-200 shadow-sm">
                                        <div className="h-6 w-6 rounded flex items-center justify-center bg-zinc-50 text-zinc-400 border border-zinc-100 shrink-0">
                                            <GripVertical className="h-3.5 w-3.5" />
                                        </div>
                                        <Input
                                            value={option}
                                            onChange={(e) => updateOption(idx, e.target.value)}
                                            className="h-8 text-[13px] border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-2"
                                            placeholder={`Option ${idx + 1}`}
                                        />
                                        <button onClick={() => removeOption(idx)} className="h-7 w-7 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded flex items-center justify-center shrink-0 mr-1 cursor-pointer transition-colors">
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-end">
                        <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md border border-zinc-200 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                            <Label htmlFor={`req-${field.id}`} className="!mb-0 !text-[9px] leading-none text-zinc-500 font-bold cursor-pointer tracking-wider uppercase">Required</Label>
                            <div className="scale-75 -mr-1">
                                <Switch
                                    id={`req-${field.id}`}
                                    checked={field.required}
                                    onCheckedChange={(checked) => onUpdate(field.id, { required: checked })}
                                    className="shrink-0 cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

// ---------------------------------------------------------------------------
// DB type → MarketplaceCustomField type mapping
// ---------------------------------------------------------------------------
const DB_TYPE_TO_FIELD_TYPE: Record<string, MarketplaceCustomField['type']> = {
    TEXT: 'text',
    NUMBER: 'number',
    DROPDOWN: 'select',
    MULTI_SELECT: 'multiselect',
    DATE: 'date',
    CHECKBOX: 'checkbox',
    URL: 'url',
    EMAIL: 'email',
    PHONE: 'phone',
    CURRENCY: 'currency',
    RATING: 'rating',
    USER: 'user',
    LOCATION: 'location',
    FORMULA: 'text',
};

// ---------------------------------------------------------------------------
// FieldTypeRow — one row in the type picker with a hover-triggered right flyout
// ---------------------------------------------------------------------------
function FieldTypeRow({
    type,
    icon: Icon,
    label,
    existingFields,
    onCreateNew,
    onAddExisting,
}: {
    type: MarketplaceCustomField['type'];
    icon: React.ElementType;
    label: string;
    existingFields: any[];
    onCreateNew: () => void;
    onAddExisting: (field: any) => void;
}) {
    const [open, setOpen] = useState(false);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const scheduleClose = () => {
        closeTimer.current = setTimeout(() => setOpen(false), 120);
    };
    const cancelClose = () => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    onMouseEnter={() => { cancelClose(); setOpen(true); }}
                    onMouseLeave={scheduleClose}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-100 transition-colors text-left cursor-pointer group"
                >
                    <div className="h-8 w-8 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:border-zinc-200 shadow-sm transition-all text-zinc-500">
                        <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-[13px] font-medium text-zinc-700 flex-1">{label}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
                </button>
            </PopoverTrigger>
            <PopoverContent
                side="right"
                align="start"
                sideOffset={4}
                onMouseEnter={cancelClose}
                onMouseLeave={scheduleClose}
                className="w-[220px] p-2 font-sans shadow-lg rounded-xl border border-zinc-200 bg-white z-[60]"
            >
                {/* Create new field */}
                <p className="px-2 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    Create new field
                </p>
                <button
                    type="button"
                    onClick={onCreateNew}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer group/create"
                >
                    <div className="h-7 w-7 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 group-hover/create:bg-indigo-100 text-indigo-500">
                        <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[13px] font-medium text-zinc-700 group-hover/create:text-indigo-700">{label}</span>
                </button>

                {/* Existing fields — only rendered if there are any */}
                {existingFields.length > 0 && (
                    <>
                        <div className="my-1.5 h-px bg-zinc-100" />
                        <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                            Map to Field in this location
                        </p>
                        {existingFields.map((field) => (
                            <button
                                key={field.id}
                                type="button"
                                onClick={() => onAddExisting(field)}
                                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer group/existing"
                            >
                                <div className="h-7 w-7 rounded-md bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0 text-zinc-500">
                                    <Icon className="h-3.5 w-3.5" />
                                </div>
                                <span className="text-[12px] font-medium text-zinc-700 truncate">{field.name}</span>
                            </button>
                        ))}
                    </>
                )}
            </PopoverContent>
        </Popover>
    );
}

// ---------------------------------------------------------------------------
// Shared field-configuration UI
// ---------------------------------------------------------------------------
interface FieldConfigPopoverContentProps {
    mode: 'create' | 'edit';
    type: MarketplaceCustomField['type'];
    initialName?: string;
    initialDescription?: string;
    onConfirm: (name: string, description: string) => void;
    onCancel: () => void;
    onChange?: (name: string, description: string) => void;
}

function FieldConfigPopoverContent({
    mode,
    type,
    initialName = "",
    initialDescription = "",
    onConfirm,
    onCancel,
    onChange,
}: FieldConfigPopoverContentProps) {
    const [name, setName] = useState(initialName);
    const [description, setDescription] = useState(initialDescription);

    const handleConfirm = () => {
        if (!name.trim()) return;
        onConfirm(name.trim(), description.trim());
    };

    const handleNameChange = (newName: string) => {
        setName(newName);
        onChange?.(newName, description);
    };

    const handleDescriptionChange = (newDesc: string) => {
        setDescription(newDesc);
        onChange?.(name, newDesc);
    };

    return (
        <>
            <div className="px-4 pt-4 flex items-center gap-2">
                <div>
                    <div className="text-[16px] leading-tight font-bold tracking-tight text-zinc-900">
                        {mode === 'create' ? 'Create field' : 'Edit field'}
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                        {fieldTypes.find(t => t.type === type)?.label}
                    </div>
                </div>
            </div>
            <div className="px-4 pb-4 pt-3 space-y-4">
                <div className="space-y-1.5 flex flex-col">
                    <Label className="text-[13px] font-semibold text-zinc-800">
                        Field Label <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        value={name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="E.g., API Key, Instance Name..."
                        className="h-10 text-[14px]"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                    />
                </div>
                <div className="space-y-1.5 flex flex-col">
                    <Label className="text-[13px] font-semibold text-zinc-800">
                        Description <span className="text-zinc-400 font-normal italic">(optional)</span>
                    </Label>
                    <Textarea
                        value={description}
                        onChange={(e) => handleDescriptionChange(e.target.value)}
                        placeholder="Add helpful instructions for users..."
                        rows={2}
                        className="resize-none text-[13px]"
                    />
                </div>
            </div>
            {mode === 'create' && (
                <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50 flex justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={onCancel}
                        className="h-8 px-3 text-[12px] font-semibold rounded-md border-zinc-300 text-zinc-700 hover:text-zinc-900 cursor-pointer"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!name.trim()}
                        className="h-8 px-4 text-[12px] font-semibold rounded-md bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm cursor-pointer"
                    >
                        Create Field
                    </Button>
                </div>
            )}
        </>
    );
}

// ---------------------------------------------------------------------------
// Shared field-picker popover content
// ---------------------------------------------------------------------------
interface FieldPickerPopoverContentProps {
    onAdd: (type: MarketplaceCustomField['type'], name: string, description: string, dbId?: string) => void;
    onClose: () => void;
    workspaceId?: string;
}

function FieldPickerPopoverContent({ onAdd, onClose, workspaceId }: FieldPickerPopoverContentProps) {
    const [step, setStep] = useState<'pick' | 'configure'>('pick');
    const [search, setSearch] = useState("");
    const [selectedType, setSelectedType] = useState<MarketplaceCustomField['type']>('text');

    // Fetch PERSONAL custom fields
    const { data: personalFieldsRaw = [] } = trpc.customFields.list.useQuery(
        { workspaceId: workspaceId! },
        { enabled: !!workspaceId }
    );
    // Group by their mapped MarketplaceCustomField type
    const personalByType = useMemo(() => {
        const map: Record<string, any[]> = {};
        (personalFieldsRaw as any[])
            .filter((f) => f.locationType === 'PERSONAL')
            .forEach((f) => {
                const t = DB_TYPE_TO_FIELD_TYPE[f.type] ?? 'text';
                if (!map[t]) map[t] = [];
                map[t].push(f);
            });
        return map;
    }, [personalFieldsRaw]);

    const handleEnterConfigure = (type: MarketplaceCustomField['type']) => {
        setSelectedType(type);
        setStep('configure');
    };

    // ── Configure step ─────────────────────────────────────────────────────
    if (step === 'configure') {
        return (
            <FieldConfigPopoverContent
                mode="create"
                type={selectedType}
                onConfirm={(name, description) => onAdd(selectedType, name, description)}
                onCancel={onClose}
            />
        );
    }

    // ── Pick step (default) ──────────────────────────────────────────────────
    const filtered = fieldTypes.filter(ft =>
        ft.label.toLowerCase().includes(search.toLowerCase())
    );
    return (
        <>
            <div className="p-3 border-b border-zinc-100 bg-zinc-50/50">
                <div className="flex h-9 items-center rounded-md border border-zinc-200 bg-white px-3 shadow-sm">
                    <Search className="h-4 w-4 shrink-0 text-zinc-400" />
                    <Input
                        variant="ghost"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search field types..."
                        className="h-full bg-transparent pl-2 pr-0 focus:outline-none focus:ring-0 focus-visible:ring-0"
                        autoFocus
                    />
                </div>
            </div>
            <div
                className="max-h-[320px] overflow-y-auto p-1.5 scrollbar-thin"
                onWheel={(e) => e.stopPropagation()}
            >
                {filtered.map(({ type, icon, label }) => (
                    <FieldTypeRow
                        key={type}
                        type={type}
                        icon={icon}
                        label={label}
                        existingFields={personalByType[type] ?? []}
                        onCreateNew={() =>
                            type === 'block'
                                ? onAdd('block', 'Information Block', '')
                                : handleEnterConfigure(type)
                        }
                        onAddExisting={(field) =>
                            onAdd(type, field.name, field.description ?? '', field.id)
                        }
                    />
                ))}
                {filtered.length === 0 && (
                    <div className="px-3 py-8 text-center text-zinc-400 text-[13px]">
                        No matching field types.
                    </div>
                )}
            </div>
        </>
    );
}

// ---------------------------------------------------------------------------
// Main builder
// ---------------------------------------------------------------------------
interface MarketplaceCustomFieldBuilderProps {
    fields: MarketplaceCustomField[];
    setFields: React.Dispatch<React.SetStateAction<MarketplaceCustomField[]>>;
    workspaceId?: string;
    /** Called immediately after a new field is added to local state */
    onCreateField?: (field: MarketplaceCustomField) => void;
    /** Called immediately after an existing field is updated in local state */
    onUpdateField?: (field: MarketplaceCustomField) => void;
    onOpenAdvancedSettings?: (fieldId?: string) => void;
}

export function MarketplaceCustomFieldBuilder({
    fields,
    setFields,
    workspaceId,
    onCreateField,
    onUpdateField,
    onOpenAdvancedSettings,
}: MarketplaceCustomFieldBuilderProps) {
    const [bottomPopoverOpen, setBottomPopoverOpen] = useState(false);
    const [customFieldsManagerOpen, setCustomFieldsManagerOpen] = useState(false);
    const [selectedAdvancedFieldId, setSelectedAdvancedFieldId] = useState<string | undefined>();

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setFields((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    /** Insert a confirmed field at the stored index (or at the end if null). */
    const insertField = (type: MarketplaceCustomField['type'], name: string, description: string, atIndex?: number, dbId?: string) => {
        const insertIndex = atIndex === undefined
            ? fields.length
            : Math.max(0, Math.min(atIndex, fields.length));

        const newField: MarketplaceCustomField =
            type === 'block'
                ? {
                    id: `${Date.now()}-block`,
                    type: 'block',
                    label: 'Information Block',
                    content: '<p>Add your rich text content here.</p>',
                    showInApplicationForm: true,
                    required: false,
                    dbId,
                }
                : {
                    id: `${Date.now()}-${type}`,
                    customFieldTitle: name,
                    type,
                    label: "",
                    description,
                    showInApplicationForm: true,
                    required: false,
                    options: ['select', 'multiselect', 'radio', 'checkbox'].includes(type)
                        ? ['Option 1', 'Option 2']
                        : undefined,
                    dbId,
                };

        setFields(prev => {
            const next = [...prev];
            next.splice(insertIndex, 0, newField);
            return next;
        });

        // Notify parent immediately so it can persist the field right away
        onCreateField?.(newField);
    };

    return (
        <div className="space-y-6">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-3">
                        {fields.map((field, index) => (
                            // Use Fragment so SortableFieldItem and InlinePlusButton are
                            // both direct flex children — gap-3 centers the + row between cards
                            <React.Fragment key={field.id}>
                                <SortableFieldItem
                                    field={field}
                                    onDelete={(id) => setFields(fields.filter(f => f.id !== id))}
                                    onUpdate={(id, updates) => setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f))}
                                    onDuplicate={(id) => {
                                        const orig = fields.find(f => f.id === id);
                                        if (orig) {
                                            const clone = { ...orig, id: Date.now().toString(), label: `${orig.label} (Copy)` };
                                            const idx = fields.findIndex(f => f.id === id);
                                            const next = [...fields];
                                            next.splice(idx + 1, 0, clone);
                                            setFields(next);
                                        }
                                    }}
                                    onOpenAdvancedSettings={(fieldId) => {
                                        if (onOpenAdvancedSettings) {
                                            onOpenAdvancedSettings(fieldId);
                                        } else {
                                            setSelectedAdvancedFieldId(fieldId);
                                            setCustomFieldsManagerOpen(true);
                                        }
                                    }}
                                    onUpdateField={onUpdateField}
                                />
                                {index < fields.length - 1 && (
                                    <InlinePlusButton
                                        insertIndex={index + 1}
                                        workspaceId={workspaceId}
                                        onInsert={(type, name, description, dbId) =>
                                            insertField(type, name, description, index + 1, dbId)
                                        }
                                    />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            {/* Bottom "Add Custom Field" button */}
            <div className="mt-4 flex justify-center">
                <Popover open={bottomPopoverOpen} onOpenChange={setBottomPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            id="add-custom-field-btn"
                            variant="outline"
                            className="border-dashed border-zinc-500/80 h-9 text-[13px] text-zinc-600 w-full sm:w-auto"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Custom Field
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent
                        align="center"
                        collisionPadding={16}
                        className="w-[320px] p-0 font-sans shadow-xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200 z-50"
                    >
                        <FieldPickerPopoverContent
                            onAdd={(type, name, description, dbId) => {
                                insertField(type, name, description, undefined, dbId);
                                setBottomPopoverOpen(false);
                            }}
                            onClose={() => setBottomPopoverOpen(false)}
                            workspaceId={workspaceId}
                        />
                    </PopoverContent>
                </Popover>
            </div>

            <CustomFieldsManagerModal
                open={customFieldsManagerOpen}
                onOpenChange={(v) => {
                    setCustomFieldsManagerOpen(v);
                    if (!v) setSelectedAdvancedFieldId(undefined);
                }}
                workspaceId={workspaceId || ""}
                initialFieldId={selectedAdvancedFieldId}
            />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Inline + button — self-contained with its own Popover
// ---------------------------------------------------------------------------
function InlinePlusButton({
    insertIndex,
    onInsert,
    workspaceId,
}: {
    insertIndex: number;
    onInsert: (type: MarketplaceCustomField['type'], name: string, description: string, dbId?: string) => void;
    workspaceId?: string;
}) {
    const [open, setOpen] = useState(false);

    return (
        /* Line is absolute so it fills the row; button stays in flex flow → always centered */
        <div className="relative flex items-center justify-center py-1">
            <div className="absolute inset-x-0 top-1/2 h-px bg-zinc-200 -translate-y-1/2 pointer-events-none" />
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        className="relative z-10 h-6 w-6 rounded-full border border-zinc-200 bg-white text-zinc-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 shadow-sm flex items-center justify-center cursor-pointer transition-colors"
                        aria-label="Add field between items"
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </button>
                </PopoverTrigger>
                <PopoverContent
                    side="bottom"
                    align="center"
                    collisionPadding={16}
                    sideOffset={8}
                    className="w-[320px] p-0 font-sans shadow-xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200 z-50"
                >
                    <FieldPickerPopoverContent
                        onAdd={(type, name, description, dbId) => {
                            onInsert(type, name, description, dbId);
                            setOpen(false);
                        }}
                        onClose={() => setOpen(false)}
                        workspaceId={workspaceId}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
}
