"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTaskViewContext } from "@/features/dashboard/hooks/useTaskViewContext";
import { trpc } from "@/lib/trpc";
import Image from "next/image";
import { LogoUpload } from "@/components/ui/logo-upload";
import { MediaUpload, type MediaFile } from "@/components/ui/media-upload";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LazyDescriptionEditor } from "@/entities/shared/components/LazyDescriptionEditor";
import { CustomFieldsManagerModal } from "@/entities/customfields/components/CustomFieldsManagerModal";
import { SingleDateCalendar } from "@/components/ui/date-picker";
import { AssigneeSelector } from "@/entities/task/components/AssigneeSelector";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
    Plus,
    Settings,
    Share2,
    Eye,
    EyeOff,
    GripVertical,
    Trash2,
    Type,
    Calendar,
    CheckSquare,
    ImageIcon,
    Save,
    Loader2,
    Hash,
    Mail,
    Phone,
    Link as LinkIcon,
    List,
    Users,
    Tag,
    DollarSign,
    Percent,
    Star,
    Clock,
    FileText,
    CircleChevronDown,
    Upload,
    Copy,
    MoreVertical,
    ChevronDown,
    X,
    AlertCircle,
    CheckCircle2,
    MapPin,
    PenLine,
    Gauge,
    Vote,
    LayoutTemplate,
    Flag,
    ChevronLeft,
    ChevronRight,
    Play,
    Check,
    Search,
    Download,
    ArrowUpDown,
    ChevronsUpDown,
    Filter,
    FileSpreadsheet,
    Sun,
    Moon,
    Pencil,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface FormField {
    id: string;
    customFieldTitle?: string;
    type:
    | 'text'
    | 'textarea'
    | 'number'
    | 'email'
    | 'phone'
    | 'url'
    | 'date'
    | 'time'
    | 'datetime'
    | 'select'
    | 'multiselect'
    | 'radio'
    | 'checkbox'
    | 'file'
    | 'rating'
    | 'currency'
    | 'percentage'
    | 'user'
    | 'tags'
    | 'progress'
    | 'voting'
    | 'location'
    | 'signature'
    | 'block';
    label: string;
    placeholder?: string;
    /** HTML body for information block fields (builder + preview) */
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
    conditional?: {
        field: string;
        value: any;
    };
    taskFieldKey?: "description" | "assignee" | "status" | "priority" | "startDate" | "dueDate" | "tags" | "attachment";
    customFieldId?: string;
    customFieldType?: string;
    customFieldConfig?: Record<string, any>;
    showInApplicationForm?: boolean;
}

interface FormSettings {
    submitButtonText: string;
    allowMultipleSubmissions: boolean;
    showProgressBar: boolean;
    redirectUrl?: string;
    showCaptcha: boolean;
    notifyOnSubmit: boolean;
    notificationEmail?: string;
    requireAuth: boolean;
    hideBranding: boolean;
    layoutMode: "one" | "two";
    theme: "light" | "dark";
    backgroundColor: string;
    buttonColor: string;
    defaultLandingPage: "build" | "preview";
    brandLogoUrl?: string;
    brandLogoPath?: string;
    coverBackgroundColor?: string;
    coverImageUrl?: string;
    coverImagePath?: string;
    fieldCreationMode: "sidebar" | "modal";
}

type FormViewSavedConfig = {
    version: 1;
    pageMode?: "start" | "end";
    sidebarWidth?: number;
    isPageSidebarCollapsed?: boolean;
    settings: FormSettings;
    fields: FormField[];
    title?: string;
    description?: string;
    endPageMessage?: string;
};

type FormViewPublishedState = {
    version: 1;
    publishedAt: string;
    config: FormViewSavedConfig;
};

type FormResponseItem = {
    id: string;
    submittedAt: string;
    status: string;
    values: Record<string, any>;
};

type ColorMode = "HEX" | "RGB" | "HSL";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const normalized = hex.trim().replace("#", "");
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
        switch (max) {
            case rn:
                h = 60 * (((gn - bn) / d) % 6);
                break;
            case gn:
                h = 60 * ((bn - rn) / d + 2);
                break;
            default:
                h = 60 * ((rn - gn) / d + 4);
                break;
        }
    }
    if (h < 0) h += 360;
    const s = max === 0 ? 0 : d / max;
    const v = max;
    return { h, s, v };
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let rp = 0;
    let gp = 0;
    let bp = 0;
    if (h < 60) [rp, gp, bp] = [c, x, 0];
    else if (h < 120) [rp, gp, bp] = [x, c, 0];
    else if (h < 180) [rp, gp, bp] = [0, c, x];
    else if (h < 240) [rp, gp, bp] = [0, x, c];
    else if (h < 300) [rp, gp, bp] = [x, 0, c];
    else[rp, gp, bp] = [c, 0, x];
    return {
        r: Math.round((rp + m) * 255),
        g: Math.round((gp + m) * 255),
        b: Math.round((bp + m) * 255),
    };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const d = max - min;
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;
    if (d !== 0) {
        s = d / (1 - Math.abs(2 * l - 1));
        switch (max) {
            case rn:
                h = 60 * (((gn - bn) / d) % 6);
                break;
            case gn:
                h = 60 * ((bn - rn) / d + 2);
                break;
            default:
                h = 60 * ((rn - gn) / d + 4);
                break;
        }
        if (h < 0) h += 360;
    }
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToRgb(h: number, sPercent: number, lPercent: number): { r: number; g: number; b: number } {
    const s = clamp(sPercent, 0, 100) / 100;
    const l = clamp(lPercent, 0, 100) / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let rp = 0;
    let gp = 0;
    let bp = 0;
    if (h < 60) [rp, gp, bp] = [c, x, 0];
    else if (h < 120) [rp, gp, bp] = [x, c, 0];
    else if (h < 180) [rp, gp, bp] = [0, c, x];
    else if (h < 240) [rp, gp, bp] = [0, x, c];
    else if (h < 300) [rp, gp, bp] = [x, 0, c];
    else[rp, gp, bp] = [c, 0, x];
    return {
        r: Math.round((rp + m) * 255),
        g: Math.round((gp + m) * 255),
        b: Math.round((bp + m) * 255),
    };
}

function ThemeColorPicker({
    color,
    mode,
    onModeChange,
    onColorChange,
    onSave,
}: {
    color: string;
    mode: ColorMode;
    onModeChange: (m: ColorMode) => void;
    onColorChange: (hex: string) => void;
    onSave: () => void;
}) {
    const panelRef = useRef<HTMLDivElement | null>(null);
    const modeOrder: ColorMode[] = ["RGB", "HEX", "HSL"];
    const rgb = hexToRgb(color) ?? { r: 255, g: 255, b: 255 };
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

    const updateFromPanel = (clientX: number, clientY: number) => {
        const rect = panelRef.current?.getBoundingClientRect();
        if (!rect) return;
        const s = clamp((clientX - rect.left) / rect.width, 0, 1);
        const v = clamp(1 - (clientY - rect.top) / rect.height, 0, 1);
        const nextRgb = hsvToRgb(hsv.h, s, v);
        onColorChange(rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b));
    };

    return (
        <div className="space-y-4 p-1">
            {/* Saturation/Brightness Panel */}
            <div
                ref={panelRef}
                className="relative h-36 w-full rounded-2xl cursor-crosshair overflow-hidden shadow-sm"
                style={{ backgroundColor: `hsl(${Math.round(hsv.h)} 100% 50%)` }}
                onMouseDown={(e) => {
                    updateFromPanel(e.clientX, e.clientY);
                    const onMove = (ev: MouseEvent) => updateFromPanel(ev.clientX, ev.clientY);
                    const onUp = () => {
                        window.removeEventListener("mousemove", onMove);
                        window.removeEventListener("mouseup", onUp);
                    };
                    window.addEventListener("mousemove", onMove);
                    window.addEventListener("mouseup", onUp);
                }}
            >
                <div className="absolute inset-0" style={{ background: "linear-gradient(to right, #fff 0%, rgba(255,255,255,0) 100%)" }} />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #000 0%, rgba(0,0,0,0) 100%)" }} />
                <div
                    className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white shadow-lg ring-1 ring-black/10"
                    style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
                />
            </div>

            {/* Hue Slider */}
            <div className="flex items-center gap-4 px-1">
                <div className="relative flex-1 h-3 rounded-full cursor-pointer">
                    <input
                        type="range"
                        min={0}
                        max={360}
                        value={Math.round(hsv.h)}
                        onChange={(e) => {
                            const nextRgb = hsvToRgb(Number(e.target.value), hsv.s, hsv.v);
                            onColorChange(rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b));
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    />
                    <div className="absolute inset-0 rounded-full shadow-inner border border-black/5" style={{ background: "linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)" }} />
                    <div
                        className="absolute top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-white shadow-md border border-zinc-100 flex items-center justify-center pointer-events-none z-10"
                        style={{ left: `calc(${(hsv.h / 360) * 100}% - 12px)` }}
                    >
                        <div className="h-3 w-3 rounded-full shadow-inner ring-1 ring-black/5" style={{ backgroundColor: `hsl(${hsv.h} 100% 50%)` }} />
                    </div>
                </div>
                <div className="h-9 w-9 shrink-0 rounded-full border-2 border-white shadow-md ring-1 ring-zinc-200" style={{ backgroundColor: color }} />
            </div>

            {/* Value Inputs */}
            <div className="flex gap-2">
                <button
                    type="button"
                    className="h-8 w-[72px] shrink-0 flex items-center justify-between px-2.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 transition-all text-[12px] font-bold text-zinc-800 shadow-sm active:scale-[0.97] cursor-pointer"
                    onClick={() => {
                        const idx = modeOrder.indexOf(mode);
                        const next = modeOrder[(idx + 1) % modeOrder.length];
                        onModeChange(next);
                    }}
                >
                    {mode}
                    <ChevronsUpDown className="h-4 w-4 text-zinc-400" />
                </button>

                {mode === "HEX" ? (
                    <div className="flex-1 h-8 px-2.5 rounded-lg border border-zinc-200 bg-white shadow-sm flex items-center focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-400/10 transition-all">
                        <input
                            value={color}
                            onChange={(e) => onColorChange(e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`)}
                            className="w-full bg-transparent border-none p-0 h-full text-[12px] font-normal text-zinc-800 text-center placeholder:text-zinc-300 focus:outline-none focus:ring-0"
                        />
                    </div>
                ) : (
                    <div className="flex-1 h-8 flex items-center rounded-lg border border-zinc-200 bg-white shadow-sm focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-400/10 transition-all overflow-hidden">
                        {mode === "RGB" ? (
                            <>
                                <input
                                    className="w-full bg-transparent border-none p-0 h-full text-center text-[12px] font-normal focus:outline-none focus:ring-0"
                                    value={rgb.r}
                                    onChange={(e) => onColorChange(rgbToHex(Number(e.target.value || 0), rgb.g, rgb.b))}
                                />
                                <div className="w-[1px] h-3 bg-zinc-200 shrink-0" />
                                <input
                                    className="w-full bg-transparent border-none p-0 h-full text-center text-[12px] font-normal focus:outline-none focus:ring-0"
                                    value={rgb.g}
                                    onChange={(e) => onColorChange(rgbToHex(rgb.r, Number(e.target.value || 0), rgb.b))}
                                />
                                <div className="w-[1px] h-3 bg-zinc-200 shrink-0" />
                                <input
                                    className="w-full bg-transparent border-none p-0 h-full text-center text-[12px] font-normal focus:outline-none focus:ring-0"
                                    value={rgb.b}
                                    onChange={(e) => onColorChange(rgbToHex(rgb.r, rgb.g, Number(e.target.value || 0)))}
                                />
                            </>
                        ) : (
                            <>
                                <input
                                    className="w-full bg-transparent border-none p-0 h-full text-center text-[12px] font-normal focus:outline-none focus:ring-0"
                                    value={hsl.h}
                                    onChange={(e) => { const next = hslToRgb(Number(e.target.value || 0), hsl.s, hsl.l); onColorChange(rgbToHex(next.r, next.g, next.b)); }}
                                />
                                <div className="w-[1px] h-3 bg-zinc-200 shrink-0" />
                                <input
                                    className="w-full bg-transparent border-none p-0 h-full text-center text-[12px] font-normal focus:outline-none focus:ring-0"
                                    value={hsl.s}
                                    onChange={(e) => { const next = hslToRgb(hsl.h, Number(e.target.value || 0), hsl.l); onColorChange(rgbToHex(next.r, next.g, next.b)); }}
                                />
                                <div className="w-[1px] h-3 bg-zinc-200 shrink-0" />
                                <input
                                    className="w-full bg-transparent border-none p-0 h-full text-center text-[12px] font-normal focus:outline-none focus:ring-0"
                                    value={hsl.l}
                                    onChange={(e) => { const next = hslToRgb(hsl.h, hsl.s, Number(e.target.value || 0)); onColorChange(rgbToHex(next.r, next.g, next.b)); }}
                                />
                            </>
                        )}
                    </div>
                )}
            </div>

            <Button
                className="w-full h-10 text-[13px] font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-lg shadow-violet-200 transition-all active:scale-[0.98] cursor-pointer"
                onClick={onSave}
            >
                Save
            </Button>
        </div>
    );
}

// ---------------------------------------------------------------------------
// FormView field-type row: hover triggers right-side flyout (same style as
// MarketplaceCustomFieldBuilder.FieldTypeRow)
// ---------------------------------------------------------------------------
type FormFieldType = FormField["type"];

const DB_TYPE_TO_FIELD_TYPE: Record<string, FormFieldType> = {
    TEXT: 'text', NUMBER: 'number', DROPDOWN: 'select',
    MULTI_SELECT: 'multiselect', DATE: 'date', CHECKBOX: 'checkbox',
    URL: 'url', EMAIL: 'email', PHONE: 'phone', CURRENCY: 'currency',
    RATING: 'rating', USER: 'user', LOCATION: 'location', FORMULA: 'text',
};

const FIELD_TYPES_MAP: { type: FormField["type"]; icon: LucideIcon; label: string }[] = [
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

function FormViewFieldTypeRow({
    type,
    icon: Icon,
    label,
    existingFields,
    onCreateNew,
    onAddExisting,
}: {
    type: FormFieldType;
    icon: LucideIcon;
    label: string;
    existingFields: any[];
    onCreateNew: (el?: HTMLElement | null) => void;
    onAddExisting: (field: any) => void;
}) {
    const [open, setOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const scheduleClose = () => {
        closeTimer.current = setTimeout(() => setOpen(false), 120);
    };
    const cancelClose = () => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
    };

    return (
        <Popover open={open} onOpenChange={setOpen} modal={false}>
            <PopoverTrigger asChild>
                <button
                    ref={triggerRef}
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
                {/* Create new */}
                <p className="px-2 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    Create new field
                </p>
                <button
                    type="button"
                    onClick={() => onCreateNew(triggerRef.current)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer group/create"
                >
                    <div className="h-7 w-7 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 group-hover/create:bg-indigo-100 text-indigo-500">
                        <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[13px] font-medium text-zinc-700 group-hover/create:text-indigo-700">{label}</span>
                </button>

                {/* Existing custom fields */}
                {existingFields.length > 0 && (
                    <>
                        <div className="my-1.5 h-px bg-zinc-100" />
                        <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                            Map existing field
                        </p>
                        {existingFields.map((field: any) => (
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

function FieldInsertGap({
    insertIndex,
    fieldCreationMode,
    onOpenModal,
    onFocusSidebar,
}: {
    insertIndex: number;
    fieldCreationMode: "sidebar" | "modal";
    onOpenModal: (index: number, anchorEl?: HTMLElement | null) => void;
    onFocusSidebar: (index: number) => void;
}) {
    const [hover, setHover] = useState(false);

    return (
        <div
            className="relative z-[35] flex min-h-8 shrink-0 w-full items-center justify-center py-0.5"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            data-field-insert-rail
        >
            <div
                className={cn(
                    "pointer-events-none absolute inset-x-10 top-1/2 h-px -translate-y-1/2 bg-zinc-300 transition-opacity",
                    hover ? "opacity-100" : "opacity-0",
                )}
            />
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        aria-label="Add field here"
                        className={cn(
                            "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-md cursor-pointer transition-all",
                            hover
                                ? "pointer-events-auto scale-100 opacity-100"
                                : "pointer-events-none scale-90 opacity-0",
                            "hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 focus-visible:pointer-events-auto focus-visible:scale-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30",
                        )}
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (fieldCreationMode === "modal") onOpenModal(insertIndex, e.currentTarget);
                            else onFocusSidebar(insertIndex);
                        }}
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Add field here</TooltipContent>
            </Tooltip>
        </div>
    );
}

// Enhanced Sortable Field Component
function SortableField({ field, onDelete, onUpdate, onDuplicate, onOpenAdvancedSettings, resolvedWorkspaceId, spaceId, projectId }: {
    field: FormField;
    onDelete: (id: string) => void;
    onUpdate: (id: string, updates: Partial<FormField>) => void;
    onDuplicate: (id: string) => void;
    onOpenAdvancedSettings: (fieldId: string) => void;
    resolvedWorkspaceId?: string;
    spaceId?: string;
    projectId?: string;
}) {
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [editingOptions, setEditingOptions] = useState(false);
    /** When false, only the header row is shown (easier drag-to-reorder). */
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
        const baseClasses = "bg-zinc-50 border-zinc-200";
        const effectiveOptions =
            field.options && field.options.length > 0
                ? field.options
                : (field.customFieldConfig as any)?.options;

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

            case 'phone':
                return (
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input disabled type="tel" placeholder={field.placeholder || "+1 (555) 000-0000"} className={cn(baseClasses, "pl-9")} />
                    </div>
                );

            case 'url':
                return (
                    <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input disabled type="url" placeholder={field.placeholder || "https://example.com"} className={cn(baseClasses, "pl-9")} />
                    </div>
                );

            case 'number':
            case 'currency':
            case 'percentage':
                const icon = field.type === 'currency' ? DollarSign : field.type === 'percentage' ? Percent : Hash;
                const IconComponent = icon;
                return (
                    <div className="relative">
                        <IconComponent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input disabled type="number" placeholder={field.placeholder || "0"} className={cn(baseClasses, "pl-9")} />
                    </div>
                );

            case 'select':
                return (
                    <div className="relative">
                        <select disabled className={cn(baseClasses, "w-full h-10 px-3 rounded-md border appearance-none pr-8")}>
                            <option>{field.placeholder || "Select an option"}</option>
                            {effectiveOptions?.map((opt: string, i: number) => <option key={i}>{opt}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                    </div>
                );

            case 'multiselect':
                return (
                    <div className={cn(baseClasses, "p-2 rounded-md border min-h-[40px] flex flex-wrap gap-1")}>
                        <span className="text-sm text-zinc-400">{field.placeholder || "Select multiple options"}</span>
                    </div>
                );

            case 'radio':
                return (
                    <div className="space-y-2">
                        {(effectiveOptions || ['Option 1', 'Option 2']).map((opt: string, i: number) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className="h-4 w-4 rounded-full border-2 border-zinc-300 bg-white"></div>
                                <span className="text-sm text-zinc-600">{opt}</span>
                            </div>
                        ))}
                    </div>
                );

            case 'checkbox':
                return (
                    <div className="space-y-2">
                        {(effectiveOptions || ['Option 1', 'Option 2']).map((opt: string, i: number) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className="h-4 w-4 rounded border-2 border-zinc-300 bg-white"></div>
                                <span className="text-sm text-zinc-600">{opt}</span>
                            </div>
                        ))}
                    </div>
                );

            case 'rating':
                return (
                    <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Star key={i} className="h-6 w-6 text-zinc-300 fill-zinc-300" />
                        ))}
                    </div>
                );

            case 'file':
                return (
                    <div className={cn(baseClasses, "p-4 rounded-md border-2 border-dashed text-center")}>
                        <Upload className="h-8 w-8 text-zinc-400 mx-auto mb-2" />
                        <p className="text-sm text-zinc-500">Click or drag to upload</p>
                    </div>
                );

            case 'user':
                return (
                    <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input disabled placeholder={field.placeholder || "Assign to user"} className={cn(baseClasses, "pl-9")} />
                    </div>
                );

            case 'tags':
                return (
                    <div className={cn(baseClasses, "p-2 rounded-md border min-h-[40px] flex flex-wrap gap-1")}>
                        <span className="text-sm text-zinc-400">{field.placeholder || "Add tags"}</span>
                    </div>
                );

            case 'progress':
                return (
                    <div className="space-y-2">
                        <div className="h-2 w-full rounded-full bg-zinc-200 overflow-hidden">
                            <div className="h-full w-1/2 rounded-full bg-indigo-500" />
                        </div>
                        <div className="flex justify-between text-xs text-zinc-500">
                            <span>0%</span>
                            <span>50%</span>
                            <span>100%</span>
                        </div>
                    </div>
                );

            case 'voting':
                return (
                    <div className="space-y-2">
                        {(effectiveOptions || ['Option A', 'Option B']).map((opt: string, i: number) => (
                            <div key={i} className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2">
                                <span className="text-sm text-zinc-700">{opt}</span>
                                <div className="flex gap-1">
                                    <div className="h-7 w-7 rounded-md border border-zinc-200 bg-zinc-50" />
                                    <div className="h-7 w-7 rounded-md border border-zinc-200 bg-zinc-50" />
                                </div>
                            </div>
                        ))}
                    </div>
                );

            case 'location':
                return (
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input disabled placeholder={field.placeholder || "Address or place name"} className={cn(baseClasses, "pl-9")} />
                    </div>
                );

            case 'signature':
                return (
                    <div className={cn(baseClasses, "h-28 rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-1")}>
                        <PenLine className="h-6 w-6 text-zinc-400" />
                        <span className="text-xs text-zinc-500">Sign here</span>
                    </div>
                );

            case 'block':
                return (
                    <div className="rounded-md border border-zinc-200 bg-zinc-50/80 p-4 text-left">
                        {field.content?.trim() ? (
                            <div
                                className="prose prose-sm max-w-none text-zinc-700"
                                dangerouslySetInnerHTML={{ __html: field.content }}
                            />
                        ) : (
                            <p className="text-sm text-zinc-700">Add content for this information block…</p>
                        )}
                    </div>
                );

            default:
                return <Input disabled placeholder={field.placeholder || `Enter ${field.label}...`} className={baseClasses} />;
        }
    };

    const FieldTypeIcon = (() => {
        const typeToIcon: Record<FormField["type"], any> = {
            text: Type,
            textarea: FileText,
            number: Hash,
            email: Mail,
            phone: Phone,
            url: LinkIcon,
            date: Calendar,
            time: Clock,
            datetime: Calendar,
            select: List,
            multiselect: List,
            radio: CheckCircle2,
            checkbox: CheckSquare,
            file: Upload,
            rating: Star,
            currency: DollarSign,
            percentage: Percent,
            user: Users,
            tags: Tag,
            progress: Gauge,
            voting: Vote,
            location: MapPin,
            signature: PenLine,
            block: LayoutTemplate,
        };
        return typeToIcon[field.type] ?? Type;
    })();

    return (
        <div ref={setNodeRef} style={style} className={cn(
            "group relative bg-white rounded-lg border transition-all overflow-hidden",
            isDragging ? "shadow-lg scale-[1.02] border-indigo-500 ring-2 ring-indigo-200" : "border-zinc-200 hover:border-indigo-300 hover:shadow-sm"
        )}>
            {/* Header: field name + collapse + hover actions */}
            <div
                className={cn(
                    "flex items-center gap-3 px-4 py-3 bg-white",
                    builderExpanded && "border-b border-zinc-100",
                )}
            >
                <div
                    className="cursor-grab active:cursor-grabbing text-zinc-300 hover:text-zinc-500 p-1 -ml-1"
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="h-7 w-7 rounded-md bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-600 shrink-0">
                        <FieldTypeIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1 min-w-0">
                            <span className="text-sm font-semibold text-zinc-900 truncate">
                                {field.customFieldTitle || field.label || "Untitled field"}
                            </span>
                            {field.required && <span className="text-red-500 text-sm">*</span>}
                        </div>
                        <div className="text-[11px] text-zinc-500 capitalize">{field.type}</div>
                    </div>
                </div>

                <div
                    className={cn(
                        "ml-auto flex shrink-0 items-center gap-1 transition-opacity",
                        builderExpanded ? "opacity-0 group-hover:opacity-100" : "opacity-100",
                    )}
                >
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
                    <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-zinc-400 hover:text-indigo-600 cursor-pointer"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </PopoverTrigger>
                            </TooltipTrigger>
                            <TooltipContent side="top" sideOffset={8}>
                                Edit field
                            </TooltipContent>
                        </Tooltip>
                        <PopoverContent
                            align="end"
                            sideOffset={10}
                            className="w-[320px] p-0 font-sans shadow-xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200 z-50"
                        >
                            <div className="px-4 pt-4 flex items-center gap-2">
                                <div>
                                    <div className="text-[16px] leading-tight font-bold tracking-tight text-zinc-900">Edit field</div>
                                    <div className="text-[11px] text-zinc-400 mt-0.5">{FIELD_TYPES_MAP.find(t => t.type === field.type)?.label}</div>
                                </div>
                            </div>
                            <div className="px-4 pb-4 pt-3 space-y-4">
                                <div className="space-y-1.5 flex flex-col">
                                    <Label className="text-[13px] font-semibold text-zinc-800">
                                        Field Title <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        value={field.label}
                                        onChange={(e) => onUpdate(field.id, { label: e.target.value })}
                                        placeholder="Enter field title..."
                                        className="h-10 text-[14px]"
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <Label className="text-[13px] font-semibold text-zinc-800">
                                        Description <span className="text-zinc-400 font-normal italic">(optional)</span>
                                    </Label>
                                    <Textarea
                                        value={field.description || ""}
                                        onChange={(e) => onUpdate(field.id, { description: e.target.value })}
                                        placeholder="Add helpful instructions for users..."
                                        rows={3}
                                        className="resize-none text-[13px]"
                                    />
                                </div>
                            </div>

                            <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-4" />

                            {/* Advanced settings footer */}
                            <div className="p-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSettingsOpen(false);
                                        if (field.customFieldId) {
                                            onOpenAdvancedSettings(field.customFieldId);
                                        } else {
                                            toast.info("Advanced settings are only available for custom fields.");
                                        }
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
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-400 hover:text-indigo-600 cursor-pointer"
                        onClick={() => onDuplicate(field.id)}
                    >
                        <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-400 hover:text-red-500 cursor-pointer"
                        onClick={() => onDelete(field.id)}
                    >
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
                            aria-expanded={builderExpanded}
                            aria-label={builderExpanded ? "Collapse field" : "Expand field"}
                            onClick={(e) => {
                                e.stopPropagation();
                                setBuilderExpanded((v) => !v);
                            }}
                        >
                            <CircleChevronDown className={cn("h-4 w-4 transition-transform duration-200", builderExpanded && "rotate-180")} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={6}>
                        {builderExpanded ? "Collapse field" : "Expand field"}
                    </TooltipContent>
                </Tooltip>
            </div>

            {builderExpanded ? (
                <div className="px-6 py-5">
                    {/* Field name (displayed in the form) */}
                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-zinc-600">Field name</Label>
                        <Input
                            value={field.label}
                            onChange={(e) => onUpdate(field.id, { label: e.target.value })}
                            className="h-10 text-sm"
                            placeholder="Enter name..."
                        />
                    </div>

                    {/* Field Description */}
                    <div className="mt-4 space-y-2">
                        <Label className="text-xs font-medium text-zinc-600">Description (optional)</Label>
                        <Input
                            value={field.description || ""}
                            onChange={(e) => onUpdate(field.id, { description: e.target.value })}
                            className="h-10 text-sm"
                            placeholder="Add a question description (optional)"
                        />
                    </div>

                    {/* Placeholder/Helper Text */}
                    {field.type !== 'block' && (
                        <div className="mt-3 space-y-2">
                            <Label className="text-xs font-medium text-zinc-600">Placeholder</Label>
                            <Input
                                value={field.placeholder || ""}
                                onChange={(e) => onUpdate(field.id, { placeholder: e.target.value })}
                                className="h-10 text-sm"
                                placeholder="Placeholder text..."
                            />
                        </div>
                    )}

                    {/* Block body (only in expanded builder) */}
                    {field.type === 'block' && (
                        <div className="mt-4 space-y-2">
                            <Label className="text-xs font-medium text-zinc-600">Information block content</Label>
                            <div className="rounded-md border border-zinc-200 bg-white min-h-[140px] overflow-hidden">
                                <LazyDescriptionEditor
                                    content={field.content || "<p>Add information for respondents...</p>"}
                                    onChange={(html) => onUpdate(field.id, { content: html })}
                                    editable
                                    workspaceId={resolvedWorkspaceId || null}
                                    spaceId={spaceId || null}
                                    projectId={projectId || null}
                                />
                            </div>
                        </div>
                    )}

                    {/* Options Editor for Select/Radio/Checkbox */}
                    {hasOptions && (
                        <div className="mt-6 pt-5 border-t border-zinc-100">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-medium text-zinc-600">Options</span>
                                <Button variant="ghost" size="sm" className="h-7 text-xs cursor-pointer" onClick={addOption}>
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add Option
                                </Button>
                            </div>
                            <div className="space-y-1.5">
                                {(field.options || []).map((option, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <div className="flex-1 relative">
                                            <Input
                                                value={option}
                                                onChange={(e) => updateOption(idx, e.target.value)}
                                                className="h-8 text-sm pr-8"
                                                placeholder={`Option ${idx + 1}`}
                                            />
                                            <button
                                                onClick={() => removeOption(idx)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-red-500 cursor-pointer"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
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
            ) : null}
        </div>
    );
}

interface FormViewProps {
    workspaceId?: string;
    folderId?: string;
    listId?: string;
    spaceId?: string;
    projectId?: string;
    teamId?: string;
    viewId?: string;
    initialConfig?: any;
    selectedTaskIdFromParent?: string | null;
    onTaskSelect?: (taskId: string | null) => void;
    context?: string;
    entity?: any;
}

export function FormView({
    workspaceId,
    folderId,
    listId,
    spaceId,
    projectId,
    teamId,
    viewId,
    initialConfig,
}: FormViewProps) {
    const [title, setTitle] = useState("New Task Request Form");
    const [description, setDescription] = useState("Please fill out this form to create a new task in our workspace.");
    const [coverPickerOpen, setCoverPickerOpen] = useState(false);
    const [coverTab, setCoverTab] = useState<"background" | "image">("background");
    const [coverColorPickerOpen, setCoverColorPickerOpen] = useState(false);
    const [coverColorDraft, setCoverColorDraft] = useState("#7c3aed");
    const [coverColorMode, setCoverColorMode] = useState<ColorMode>("HEX");
    const [previewMode, setPreviewMode] = useState(false);
    const [activeTab, setActiveTab] = useState<"builder" | "responses">("builder");
    const [showSettings, setShowSettings] = useState(false);
    const [endPageMessage, setEndPageMessage] = useState("<p><strong>Thank you!</strong></p><p>your submission has been received.</p>");
    const [pageMode, setPageMode] = useState<"start" | "end">("start");
    const [isPageSidebarCollapsed, setIsPageSidebarCollapsed] = useState(false);
    const [sidebarSearch, setSidebarSearch] = useState("");
    const [sidebarWidth, setSidebarWidth] = useState(288);
    const [isEditingFormTitle, setIsEditingFormTitle] = useState(false);
    const [fieldPickerOpen, setFieldPickerOpen] = useState(false);
    const [fieldPickerSearch, setFieldPickerSearch] = useState("");
    const [fieldPickerAnchorPos, setFieldPickerAnchorPos] = useState<{ left: number; top: number } | null>(null);
    const [isFieldTypeSidebarOpen, setIsFieldTypeSidebarOpen] = useState(false);
    const sidebarResizeStateRef = useRef<{
        isResizing: boolean;
        startX: number;
        startWidth: number;
    }>({ isResizing: false, startX: 0, startWidth: 288 });
    /** When set, the next field added via sidebar or modal is inserted at this index (then cleared). `null` = append at end. */
    const fieldInsertIndexRef = useRef<number | null>(null);
    const leftFieldSidebarRef = useRef<HTMLDivElement | null>(null);
    const sidebarFieldSearchInputRef = useRef<HTMLInputElement | null>(null);
    const [selectedAdvancedFieldId, setSelectedAdvancedFieldId] = useState<string | undefined>(undefined);

    const utils = trpc.useUtils();
    const { data: viewData, isLoading: isViewLoading, isFetching: isViewFetching } = trpc.view.get.useQuery(
        { id: viewId as string },
        { enabled: !!viewId }
    );
    const updateViewMutation = trpc.view.update.useMutation();
    const {
        resolvedWorkspaceId,
        space,
        customFields = [],
        agents: contextAgents,
        workspaceMembers: membersRaw = [],
        currentList,
    } = useTaskViewContext({ spaceId, projectId, teamId, listId, workspaceId });
    const [fields, setFields] = useState<FormField[]>([]);

    const [settings, setSettings] = useState<FormSettings>({
        submitButtonText: "Submit Request",
        allowMultipleSubmissions: true,
        showProgressBar: true,
        redirectUrl: "",
        showCaptcha: false,
        notifyOnSubmit: true,
        notificationEmail: "",
        requireAuth: false,
        hideBranding: false,
        layoutMode: "one",
        theme: "light",
        backgroundColor: "#F8FAFC", // slate-50
        buttonColor: "#18181B", // zinc-900
        defaultLandingPage: "build",
        coverBackgroundColor: "#7c3aed",
        coverImageUrl: "",
        coverImagePath: "media",
        fieldCreationMode: "sidebar",
    });

    useEffect(() => {
        if (previewMode || settings.fieldCreationMode !== "sidebar") {
            setIsFieldTypeSidebarOpen(false);
        }
    }, [previewMode, settings.fieldCreationMode]);

    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [copied, setCopied] = useState(false);
    const [publishedState, setPublishedState] = useState<FormViewPublishedState | null>(null);
    const autosaveTimerRef = useRef<number | null>(null);
    const isHydratingRef = useRef(true);
    const [previewValues, setPreviewValues] = useState<Record<string, any>>({});
    const [responsesSearch, setResponsesSearch] = useState("");
    const [responsesSortBy, setResponsesSortBy] = useState<"submittedAt" | "status">("submittedAt");
    const [responsesSortDir, setResponsesSortDir] = useState<"asc" | "desc">("desc");
    const [responsesStatusFilter, setResponsesStatusFilter] = useState<"all" | "submitted">("all");
    const [responsesPage, setResponsesPage] = useState(1);
    const [responsesPageSize, setResponsesPageSize] = useState(20);
    const [submittingResponse, setSubmittingResponse] = useState(false);
    const [exportingResponses, setExportingResponses] = useState(false);
    const {
        data: responsesResult,
        isLoading: responsesLoading,
        refetch: refetchResponses,
    } = trpc.view.listResponses.useQuery(
        {
            viewId: viewId as string,
            query: responsesSearch || undefined,
            status: responsesStatusFilter === "all" ? undefined : responsesStatusFilter,
            sortBy: responsesSortBy,
            sortDir: responsesSortDir,
            page: responsesPage,
            pageSize: responsesPageSize,
        },
        { enabled: !!viewId }
    );
    const responses = responsesResult?.items ?? [];
    const responseTotal = responsesResult?.total ?? 0;
    const responseTotalPages = responsesResult?.totalPages ?? 1;
    const submitResponseMutation = trpc.view.submitResponse.useMutation();
    const deleteResponseMutation = trpc.view.deleteResponse.useMutation();
    const deleteAllResponsesMutation = trpc.view.deleteAllResponses.useMutation();

    function AgentfloxLogoMark({ className }: { className?: string }) {
        return (
            <div className={cn("flex items-center gap-2 select-none", className)}>
                <span className="relative inline-block h-6 w-6">
                    <Image
                        src="/images/logo.png"
                        alt="Agentflox logo"
                        fill
                        className="object-contain"
                    />
                </span>
                <div className="leading-none">
                    <div className="text-xs font-semibold tracking-tight text-zinc-900">agentflox</div>
                </div>
            </div>
        );
    }

    const SIDEBAR_MIN_WIDTH = 260;
    const SIDEBAR_MAX_WIDTH = 460;

    useEffect(() => {
        if (!viewData) return;
        const raw = (viewData.config ?? {}) as Record<string, any>;
        const saved = raw.formView as FormViewSavedConfig | undefined;
        if (!saved || saved.version !== 1) return;

        if (saved.pageMode) setPageMode(saved.pageMode);
        if (typeof saved.sidebarWidth === "number") setSidebarWidth(saved.sidebarWidth);
        if (typeof saved.isPageSidebarCollapsed === "boolean") setIsPageSidebarCollapsed(saved.isPageSidebarCollapsed);
        if (saved.settings) {
            setSettings((prev) => ({
                ...prev,
                ...saved.settings,
                // back-compat defaults
                layoutMode: (saved.settings as any).layoutMode ?? prev.layoutMode,
                theme: (saved.settings as any).theme ?? prev.theme,
                backgroundColor: (saved.settings as any).backgroundColor ?? prev.backgroundColor,
                buttonColor: (saved.settings as any).buttonColor ?? prev.buttonColor,
                coverBackgroundColor: (saved.settings as any).coverBackgroundColor ?? prev.coverBackgroundColor,
                coverImageUrl: (saved.settings as any).coverImageUrl ?? prev.coverImageUrl,
                coverImagePath: (saved.settings as any).coverImagePath ?? prev.coverImagePath,
                defaultLandingPage: (saved.settings as any).defaultLandingPage ?? prev.defaultLandingPage,
                fieldCreationMode: (saved.settings as any).fieldCreationMode ?? prev.fieldCreationMode,
            }));
            const landing = (saved.settings as any).defaultLandingPage ?? "build";
            setPreviewMode(landing === "preview");
        }
        if (Array.isArray(saved.fields)) setFields(saved.fields);
        if (typeof saved.title === "string") setTitle(saved.title);
        if (typeof saved.description === "string") setDescription(saved.description);
        if (typeof saved.endPageMessage === "string") setEndPageMessage(saved.endPageMessage);

        const published = raw.formViewPublished as FormViewPublishedState | undefined;
        if (published && published.version === 1) setPublishedState(published);
        else setPublishedState(null);

        setHasUnsavedChanges(false);
        isHydratingRef.current = false;
    }, [viewData]);

    const draftConfig: FormViewSavedConfig = useMemo(() => ({
        version: 1,
        pageMode,
        sidebarWidth,
        isPageSidebarCollapsed,
        settings,
        fields,
        title,
        description,
        endPageMessage,
    }), [description, endPageMessage, fields, isPageSidebarCollapsed, pageMode, settings, sidebarWidth, title]);

    const isPublished = !!publishedState;
    const responseCount = responseTotal;

    const getResponseValueAsText = useCallback((value: any): string => {
        if (value === null || value === undefined) return "";
        if (typeof value === "string") return value;
        if (typeof value === "number" || typeof value === "boolean") return String(value);
        if (Array.isArray(value)) return value.map((v) => getResponseValueAsText(v)).join(", ");
        if (typeof value === "object") {
            try {
                return JSON.stringify(value);
            } catch {
                return "[Object]";
            }
        }
        return String(value);
    }, []);

    const getResponsePreviewText = useCallback((item: FormResponseItem): string => {
        const parts = fields
            .slice(0, 3)
            .map((field) => {
                const raw = item.values[field.id];
                const val = getResponseValueAsText(raw);
                if (!val) return "";
                return `${field.label}: ${val}`;
            })
            .filter(Boolean);
        return parts.join(" · ");
    }, [fields, getResponseValueAsText]);

    useEffect(() => {
        setResponsesPage(1);
    }, [responsesSearch, responsesStatusFilter, responsesSortBy, responsesSortDir, responsesPageSize]);

    const BACKGROUND_COLORS: Array<{ value: string; label: string }> = [
        { value: "#FFFFFF", label: "White" },
        { value: "#EEF2FF", label: "Indigo 50" },
        { value: "#E0F2FE", label: "Sky 50" },
        { value: "#ECFDF5", label: "Emerald 50" },
        { value: "#F0FDF4", label: "Green 50" },
        { value: "#FEF9C3", label: "Yellow 100" },
        { value: "#FFEDD5", label: "Orange 100" },
        { value: "#FCE7F3", label: "Pink 100" },
        { value: "#F5F3FF", label: "Violet 50" },
        { value: "#EDE9FE", label: "Violet 100" },
        { value: "linear-gradient(135deg, #E0E7FF 0%, #F5F3FF 100%)", label: "Purple Graduate" },
        { value: "linear-gradient(135deg, #FCE7F3 0%, #FFE4E6 100%)", label: "Pink Graduate" },
        { value: "linear-gradient(135deg, #FFEDD5 0%, #FEF9C3 100%)", label: "Orange Graduate" },
        { value: "linear-gradient(135deg, #ECFDF5 0%, #DCFCE7 100%)", label: "Green Graduate" },
        { value: "linear-gradient(135deg, #E0F2FE 0%, #E0E7FF 100%)", label: "Blue Graduate" },
        { value: "linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)", label: "Lavender Graduate" },
    ];

    const BUTTON_COLORS: Array<{ value: string; label: string }> = [
        { value: "#18181B", label: "Zinc" },
        { value: "#4F46E5", label: "Indigo" },
        { value: "#0EA5E9", label: "Sky" },
        { value: "#10B981", label: "Emerald" },
        { value: "#F59E0B", label: "Amber" },
        { value: "#EF4444", label: "Red" },
        { value: "#EC4899", label: "Pink" },
        { value: "#8B5CF6", label: "Violet" },
    ];

    const [customizeLayoutOpen, setCustomizeLayoutOpen] = useState(true);
    const [customizeColorsOpen, setCustomizeColorsOpen] = useState(true);
    const [customizeSubmissionOpen, setCustomizeSubmissionOpen] = useState(true);
    const [customizeBrandingOpen, setCustomizeBrandingOpen] = useState(true);
    const [customizeViewSettingsOpen, setCustomizeViewSettingsOpen] = useState(true);
    const [customBgPickerOpen, setCustomBgPickerOpen] = useState(false);
    const [customBtnPickerOpen, setCustomBtnPickerOpen] = useState(false);
    const [customBgDraft, setCustomBgDraft] = useState(settings.backgroundColor);
    const [customBtnDraft, setCustomBtnDraft] = useState(settings.buttonColor);
    const [customBgMode, setCustomBgMode] = useState<ColorMode>("HEX");
    const [customBtnMode, setCustomBtnMode] = useState<ColorMode>("HEX");
    const [customFieldDialogOpen, setCustomFieldDialogOpen] = useState(false);
    const [customFieldsManagerOpen, setCustomFieldsManagerOpen] = useState(false);
    const [customFieldAnchorPos, setCustomFieldAnchorPos] = useState<{ left: number; top: number } | null>(null);
    const [customFieldName, setCustomFieldName] = useState("");
    const [customFieldDescription, setCustomFieldDescription] = useState("");
    const [customFieldPendingType, setCustomFieldPendingType] = useState<FormField["type"]>("text");
    const [customFieldOptions, setCustomFieldOptions] = useState<Array<{ id: string; label: string; color: string }>>([
        { id: "opt-1", label: "Option 1", color: "#ec4899" },
        { id: "opt-2", label: "Option 2", color: "#7c3aed" },
    ]);
    const [customFieldOptionInput, setCustomFieldOptionInput] = useState("");
    const [isOptionInputOpen, setIsOptionInputOpen] = useState(false);
    const [optionDraftColor, setOptionDraftColor] = useState("#a5b4fc");
    const [draggedOptionId, setDraggedOptionId] = useState<string | null>(null);
    const [userFieldSettings, setUserFieldSettings] = useState({
        showWholeWorkspace: false,
        showGuests: false,
        allowMultiple: true,
        includeTeams: false,
    });
    const [currencyCode, setCurrencyCode] = useState("USD");

    const normalizeHex = (v: string) => {
        const s = (v || "").trim();
        if (!s) return "";
        if (s.startsWith("#")) return s;
        return `#${s}`;
    };
    const isValidHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v.trim());
    const workspaceMembers = useMemo(() => {
        return (membersRaw as Array<{ user: { id: string; name?: string | null; email?: string | null; image?: string | null } }>).map((m) => ({
            id: m.user.id,
            name: m.user.name || m.user.email || "Unknown",
            image: m.user.image,
            email: m.user.email,
            type: "user",
        }));
    }, [membersRaw]);
    const agents = contextAgents;
    const listStatuses = useMemo(() => ((currentList as any)?.statuses ?? []) as Array<{ id: string; name: string; color?: string }>, [currentList]);
    const customFieldsById = useMemo(() => {
        const m = new Map<string, any>();
        (customFields as any[]).forEach((f: any) => m.set(f.id, f));
        return m;
    }, [customFields]);
    const visibleFields = useMemo(
        () => fields.filter((field) => field.showInApplicationForm !== false),
        [fields]
    );

    const mapFormFieldTypeToCustomType = (type: FormField["type"]): string => {
        const map: Record<FormField["type"], string> = {
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
            checkbox: "CHECKBOX",
            file: "FILES",
            rating: "RATING",
            currency: "MONEY",
            percentage: "NUMBER",
            user: "PEOPLE",
            tags: "LABELS",
            progress: "NUMBER",
            voting: "VOTING",
            location: "LOCATION",
            signature: "SIGNATURE",
            block: "CUSTOM_TEXT",
        };
        return map[type] ?? "TEXT";
    };

    const createCustomFieldMutation = trpc.customFields.create.useMutation({
        onSuccess: async () => {
            await utils.customFields.list.invalidate();
        },
        onError: (err) => toast.error(err.message || "Failed to create custom field"),
    });

    const publicFormUrl = useMemo(() => {
        if (!viewId) return "";
        if (typeof window !== "undefined") {
            return `${window.location.origin}/f/${viewId}`;
        }
        return `/f/${viewId}`;
    }, [viewId]);

    const OPTION_COLOR_PALETTE = [
        "#a5b4fc", "#93c5fd", "#7dd3fc", "#5eead4", "#86efac", "#fcd34d", "#fdba74",
        "#6366f1", "#3b82f6", "#0ea5e9", "#14b8a6", "#22c55e", "#f59e0b", "#f97316",
        "#fca5a5", "#f9a8d4", "#d8b4fe", "#d6bbb1", "#d4d4d4", "#bdbdbd", "#ef4444",
        "#ec4899", "#a855f7", "#8b5e3c", "#71717a",
    ];
    const CURRENCY_OPTIONS = [
        { value: "USD", label: "USD - US Dollar ($)" },
        { value: "EUR", label: "EUR - Euro (€)" },
        { value: "GBP", label: "GBP - British Pound (£)" },
        { value: "JPY", label: "JPY - Japanese Yen (¥)" },
        { value: "VND", label: "VND - Vietnamese Dong (₫)" },
    ];

    const saveDraftConfig = async (opts?: { silent?: boolean }) => {
        if (!viewId) {
            setHasUnsavedChanges(false);
            return;
        }
        const raw = ((viewData?.config ?? {}) as Record<string, any>) ?? {};
        try {
            await updateViewMutation.mutateAsync({ id: viewId, config: { ...raw, formView: draftConfig } });
            setHasUnsavedChanges(false);
            void utils.view.get.invalidate({ id: viewId });
        } catch {
            // keep unsaved state
        }
    };

    // Autosave on every edit (debounced)
    useEffect(() => {
        if (isHydratingRef.current) return;
        setHasUnsavedChanges(true);

        if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = window.setTimeout(() => {
            void saveDraftConfig({ silent: true });
        }, 600);

        return () => {
            if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draftConfig]);

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            const s = sidebarResizeStateRef.current;
            if (!s.isResizing) return;
            const nextWidth = Math.min(
                SIDEBAR_MAX_WIDTH,
                Math.max(SIDEBAR_MIN_WIDTH, s.startWidth + (e.clientX - s.startX))
            );
            setSidebarWidth(nextWidth);
        };

        const stop = () => {
            const s = sidebarResizeStateRef.current;
            if (!s.isResizing) return;
            s.isResizing = false;
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", stop);
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", stop);
        };
    }, []);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );



    const taskFieldPresets: Array<{
        key: string;
        label: string;
        icon: LucideIcon;
        create: () => Omit<FormField, 'id'>;
    }> = [
            {
                key: 'description',
                label: 'Description',
                icon: FileText,
                create: () => ({
                    type: 'textarea',
                    taskFieldKey: 'description',
                    label: 'Description',
                    required: false,
                    placeholder: 'Describe the task in detail…',
                    description: 'Details, requirements, and context',
                }),
            },
            {
                key: 'assignee',
                label: 'Assignee',
                icon: Users,
                create: () => ({
                    type: 'user',
                    taskFieldKey: 'assignee',
                    label: 'Assignee',
                    required: false,
                    placeholder: 'Choose assignee',
                    description: 'Who owns this task?',
                }),
            },
            {
                key: 'status',
                label: 'Status',
                icon: List,
                create: () => ({
                    type: 'select',
                    taskFieldKey: 'status',
                    label: 'Status',
                    required: true,
                    options: ['To do', 'In progress', 'Done', 'Blocked'],
                    placeholder: 'Select status',
                    description: 'Current workflow state',
                }),
            },
            {
                key: 'priority',
                label: 'Priority',
                icon: AlertCircle,
                create: () => ({
                    type: 'select',
                    taskFieldKey: 'priority',
                    label: 'Priority',
                    required: true,
                    options: ['Low', 'Medium', 'High', 'Urgent'],
                    placeholder: 'Select priority',
                    description: 'How urgent is this task?',
                }),
            },
            {
                key: 'startDate',
                label: 'Start date',
                icon: Calendar,
                create: () => ({
                    type: 'date',
                    taskFieldKey: 'startDate',
                    label: 'Start date',
                    required: false,
                    placeholder: 'Select start date',
                }),
            },
            {
                key: 'dueDate',
                label: 'Due date',
                icon: Calendar,
                create: () => ({
                    type: 'date',
                    taskFieldKey: 'dueDate',
                    label: 'Due date',
                    required: true,
                    placeholder: 'Select due date',
                }),
            },
            {
                key: 'tags',
                label: 'Tags',
                icon: Tag,
                create: () => ({
                    type: 'tags',
                    taskFieldKey: 'tags',
                    label: 'Tags',
                    required: false,
                    placeholder: 'Add tags',
                    description: 'Organize with labels',
                }),
            },
            {
                key: 'attachment',
                label: 'Attachment',
                icon: Upload,
                create: () => ({
                    type: 'file',
                    taskFieldKey: 'attachment',
                    label: 'Attachment',
                    required: false,
                    description: 'Upload files related to this task',
                }),
            },
        ];

    const normalizedSidebarSearch = sidebarSearch.trim().toLowerCase();
    const filteredTaskFieldPresets = normalizedSidebarSearch
        ? taskFieldPresets.filter((p) => p.label.toLowerCase().includes(normalizedSidebarSearch))
        : taskFieldPresets;
    const filteredFieldTypes = normalizedSidebarSearch
        ? FIELD_TYPES_MAP.filter((f) => f.label.toLowerCase().includes(normalizedSidebarSearch))
        : FIELD_TYPES_MAP;

    const normalizedPickerSearch = fieldPickerSearch.trim().toLowerCase();
    const filteredPickerTaskPresets = normalizedPickerSearch
        ? taskFieldPresets.filter((p) => p.label.toLowerCase().includes(normalizedPickerSearch))
        : taskFieldPresets;
    const filteredPickerFieldTypes = normalizedPickerSearch
        ? FIELD_TYPES_MAP.filter((f) => f.label.toLowerCase().includes(normalizedPickerSearch))
        : FIELD_TYPES_MAP;

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setFields((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                setHasUnsavedChanges(true);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const focusLeftSidebarForAdd = (insertIndex: number) => {
        fieldInsertIndexRef.current = insertIndex;
        setIsFieldTypeSidebarOpen(true);
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                leftFieldSidebarRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
                window.setTimeout(() => {
                    sidebarFieldSearchInputRef.current?.focus();
                    sidebarFieldSearchInputRef.current?.select();
                }, 320);
            });
        });
    };

    const openFieldPickerAtIndex = (insertIndex: number, anchorEl?: HTMLElement | null) => {
        fieldInsertIndexRef.current = insertIndex;
        if (anchorEl) {
            const rect = anchorEl.getBoundingClientRect();
            setFieldPickerAnchorPos({ left: rect.right + 6, top: rect.top });
        } else {
            setFieldPickerAnchorPos(null);
        }
        setFieldPickerOpen(true);
    };

    const addField = (type: FormField['type'], anchorEl?: HTMLElement | null) => {
        if (type === "block") {
            const infoBlock: FormField = {
                id: `${Date.now()}-info-block`,
                type: "block",
                label: "Information block",
                required: false,
                content: "<p>Add information for respondents...</p>",
            };
            setFields((prev) => {
                const raw = fieldInsertIndexRef.current;
                fieldInsertIndexRef.current = null;
                const idx = raw === null ? prev.length : Math.max(0, Math.min(raw, prev.length));
                const next = [...prev];
                next.splice(idx, 0, infoBlock);
                return next;
            });
            setHasUnsavedChanges(true);
            setFieldPickerOpen(false);
            setSidebarSearch("");
            setFieldPickerSearch("");
            return;
        }
        if (fieldPickerOpen && fieldPickerAnchorPos) {
            // Replace the field-picker popover in-place with create-field popover.
            setCustomFieldAnchorPos(fieldPickerAnchorPos);
            setFieldPickerOpen(false);
        } else if (anchorEl) {
            const rect = anchorEl.getBoundingClientRect();
            setCustomFieldAnchorPos({ left: rect.right + 6, top: rect.top });
        } else {
            setCustomFieldAnchorPos(null);
        }
        setCustomFieldPendingType(type);
        setCustomFieldName("");
        setCustomFieldDescription("");
        setCustomFieldOptions([
            { id: `${Date.now()}-opt-1`, label: "Option 1", color: "#ec4899" },
            { id: `${Date.now()}-opt-2`, label: "Option 2", color: "#7c3aed" },
        ]);
        setUserFieldSettings({
            showWholeWorkspace: false,
            showGuests: false,
            allowMultiple: true,
            includeTeams: false,
        });
        setCurrencyCode("USD");
        setCustomFieldOptionInput("");
        setIsOptionInputOpen(false);
        setOptionDraftColor("#a5b4fc");
        setDraggedOptionId(null);
        setCustomFieldDialogOpen(true);
        if (settings.fieldCreationMode !== "modal" && !fieldPickerOpen) {
            setFieldPickerOpen(false);
        }
    };

    const addCustomFieldOptionsFromInput = () => {
        const raw = customFieldOptionInput.trim();
        if (!raw) return;
        const parts = raw
            .split(/\n|,/g)
            .map((s) => s.trim())
            .filter(Boolean);
        if (!parts.length) return;
        setCustomFieldOptions((prev) => [
            ...prev,
            ...parts.map((label, idx) => ({
                id: `${Date.now()}-new-${idx}`,
                label,
                color: optionDraftColor || OPTION_COLOR_PALETTE[(prev.length + idx) % OPTION_COLOR_PALETTE.length],
            })),
        ]);
        setCustomFieldOptionInput("");
        setIsOptionInputOpen(false);
        setOptionDraftColor("#a5b4fc");
    };

    const moveCustomFieldOption = (dragId: string, overId: string) => {
        if (!dragId || !overId || dragId === overId) return;
        setCustomFieldOptions((prev) => {
            const from = prev.findIndex((o) => o.id === dragId);
            const to = prev.findIndex((o) => o.id === overId);
            if (from < 0 || to < 0) return prev;
            const next = [...prev];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return next;
        });
    };

    const addTaskPreset = (key: string) => {
        const preset = taskFieldPresets.find((p) => p.key === key);
        if (!preset) return;
        const created = preset.create();
        const newField: FormField = {
            id: `${Date.now()}-${key}`,
            ...created,
        };
        setFields((prev) => {
            const raw = fieldInsertIndexRef.current;
            fieldInsertIndexRef.current = null;
            const idx = raw === null ? prev.length : Math.max(0, Math.min(raw, prev.length));
            const next = [...prev];
            next.splice(idx, 0, newField);
            return next;
        });
        setHasUnsavedChanges(true);
        setIsFieldTypeSidebarOpen(false);
        setFieldPickerOpen(false);
        setSidebarSearch("");
        setFieldPickerSearch("");
    };

    const handleCreateCustomField = async () => {
        const trimmedName = customFieldName.trim();
        if (!trimmedName) {
            toast.error("Field name is required");
            return;
        }
        if (!(resolvedWorkspaceId || listId || folderId || spaceId || projectId || teamId)) {
            toast.error("Missing context to create custom field");
            return;
        }
        const customType = mapFormFieldTypeToCustomType(customFieldPendingType);
        const shouldHaveOptions = ['select', 'multiselect', 'radio', 'checkbox', 'voting'].includes(customFieldPendingType);
        const options = shouldHaveOptions
            ? customFieldOptions
                .map((o) => o.label.trim())
                .filter(Boolean)
            : undefined;
        const config: Record<string, any> = {};
        if (customFieldDescription.trim()) config.description = customFieldDescription.trim();
        if (options && options.length > 0) config.options = options;
        if (shouldHaveOptions) {
            config.optionColors = customFieldOptions.map((o) => ({ label: o.label, color: o.color }));
        }
        if (customFieldPendingType === "user") {
            config.userPicker = {
                showWholeWorkspace: userFieldSettings.showWholeWorkspace,
                showGuests: userFieldSettings.showGuests,
                allowMultiple: userFieldSettings.allowMultiple,
                includeTeams: userFieldSettings.includeTeams,
            };
        }
        if (customFieldPendingType === "currency") {
            config.currencyCode = currencyCode;
        }

        const created = await createCustomFieldMutation.mutateAsync({
            workspaceId: resolvedWorkspaceId,
            listId,
            folderId,
            spaceId,
            projectId,
            teamId,
            name: trimmedName,
            type: customType,
            applyTo: ["TASK"],
            config: Object.keys(config).length ? config : undefined,
            isRequired: false,
        });

        const newField: FormField = {
            id: `${Date.now()}-${customFieldPendingType}`,
            customFieldTitle: trimmedName,
            type: customFieldPendingType,
            label: trimmedName,
            description: customFieldDescription.trim() || undefined,
            required: false,
            placeholder: "",
            options: options && options.length ? options : undefined,
            customFieldId: created.id,
            customFieldType: customType,
            customFieldConfig: config,
        };
        setFields((prev) => {
            const raw = fieldInsertIndexRef.current;
            fieldInsertIndexRef.current = null;
            const idx = raw === null ? prev.length : Math.max(0, Math.min(raw, prev.length));
            const next = [...prev];
            next.splice(idx, 0, newField);
            return next;
        });
        setHasUnsavedChanges(true);
        setCustomFieldDialogOpen(false);
        setCustomFieldAnchorPos(null);
        setIsFieldTypeSidebarOpen(false);
        setFieldPickerOpen(false);
        setSidebarSearch("");
        setFieldPickerSearch("");
        setCustomFieldName("");
        setCustomFieldDescription("");
        setCustomFieldOptions([
            { id: "opt-1", label: "Option 1", color: "#ec4899" },
            { id: "opt-2", label: "Option 2", color: "#7c3aed" },
        ]);
        setUserFieldSettings({
            showWholeWorkspace: false,
            showGuests: false,
            allowMultiple: true,
            includeTeams: false,
        });
        setCurrencyCode("USD");
        setCustomFieldOptionInput("");
        setIsOptionInputOpen(false);
        setOptionDraftColor("#a5b4fc");
        setDraggedOptionId(null);
        toast.success("Field created");
    };

    const deleteField = (id: string) => {
        setFields(fields.filter(f => f.id !== id));
        setHasUnsavedChanges(true);
    };

    const updateField = (id: string, updates: Partial<FormField>) => {
        setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
        setHasUnsavedChanges(true);
    };

    const duplicateField = (id: string) => {
        const field = fields.find(f => f.id === id);
        if (field) {
            const newField = { ...field, id: Date.now().toString(), label: `${field.label} (Copy)` };
            const index = fields.findIndex(f => f.id === id);
            const newFields = [...fields];
            newFields.splice(index + 1, 0, newField);
            setFields(newFields);
            setHasUnsavedChanges(true);
        }
    };

    const saveForm = () => void saveDraftConfig();

    const handleSubmitResponse = async () => {
        if (!previewMode || submittingResponse) return;
        setSubmittingResponse(true);
        try {
            if (!viewId) throw new Error("Missing view id");
            await submitResponseMutation.mutateAsync({
                viewId,
                values: previewValues,
            });
            setPreviewValues({});
            await refetchResponses();
            toast.success("Form response submitted");
        } finally {
            setSubmittingResponse(false);
        }
    };

    const handleDeleteResponse = async (responseId: string) => {
        if (!viewId) return;
        await deleteResponseMutation.mutateAsync({ viewId, responseId });
        await refetchResponses();
        toast.success("Response deleted");
    };

    const handleDeleteAllResponses = async () => {
        if (!viewId) return;
        await deleteAllResponsesMutation.mutateAsync({ viewId });
        await refetchResponses();
        toast.success("All responses deleted");
    };

    const handleDownloadResponses = async () => {
        if (!viewId || !responseTotal || exportingResponses) return;
        setExportingResponses(true);
        try {
            const pageSize = 200;
            const totalPages = Math.max(1, Math.ceil(responseTotal / pageSize));
            const allItems: FormResponseItem[] = [];
            for (let page = 1; page <= totalPages; page += 1) {
                const res = await utils.view.listResponses.fetch({
                    viewId,
                    query: responsesSearch || undefined,
                    status: responsesStatusFilter === "all" ? undefined : responsesStatusFilter,
                    sortBy: responsesSortBy,
                    sortDir: responsesSortDir,
                    page,
                    pageSize,
                });
                allItems.push(...(res?.items ?? []));
            }
            const rows = allItems.map((item) => {
                const row: Record<string, any> = {
                    ID: item.id,
                    Status: item.status,
                    "Submitted At": new Date(item.submittedAt).toLocaleString(),
                };
                visibleFields.forEach((field) => {
                    row[field.label] = getResponseValueAsText(item.values[field.id]);
                });
                return row;
            });
            const XLSX = await import("xlsx");
            const worksheet = XLSX.utils.json_to_sheet(rows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Responses");
            XLSX.writeFile(workbook, `${title || "form"}-responses.xlsx`);
            toast.success("Responses exported");
        } catch {
            toast.error("Unable to export responses");
        } finally {
            setExportingResponses(false);
        }
    };

    const publishNow = async () => {
        if (!viewId) return;
        const raw = ((viewData?.config ?? {}) as Record<string, any>) ?? {};
        const nextPublished: FormViewPublishedState = {
            version: 1,
            publishedAt: new Date().toISOString(),
            config: draftConfig,
        };
        await updateViewMutation.mutateAsync({ id: viewId, config: { ...raw, formViewPublished: nextPublished } });
        setPublishedState(nextPublished);
        void utils.view.get.invalidate({ id: viewId });
    };

    const unpublish = async () => {
        if (!viewId) return;
        const raw = ((viewData?.config ?? {}) as Record<string, any>) ?? {};
        await updateViewMutation.mutateAsync({ id: viewId, config: { ...raw, formViewPublished: null } });
        setPublishedState(null);
        void utils.view.get.invalidate({ id: viewId });
    };

    if (isViewLoading && viewId) {
        return (
            <div className="flex h-full min-h-0 min-w-0 flex-col bg-slate-50">
                <div className="flex shrink-0 items-center justify-between px-6 py-3.5 bg-white border-b border-zinc-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-lg" />
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-48" />
                            <Skeleton className="h-3 w-36" />
                        </div>
                    </div>
                    <Skeleton className="h-8 w-80 rounded-xl" />
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-20 rounded-md" />
                        <Skeleton className="h-8 w-20 rounded-md" />
                        <Skeleton className="h-8 w-20 rounded-md" />
                    </div>
                </div>
                <div className="flex-1 p-8 space-y-4">
                    <Skeleton className="h-20 w-full rounded-2xl" />
                    <Skeleton className="h-40 w-full rounded-2xl" />
                    <Skeleton className="h-40 w-full rounded-2xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 min-w-0 flex-col bg-slate-50">
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between px-6 py-3.5 bg-white border-b border-zinc-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center text-white shadow-md">
                        <CheckSquare className="h-5 w-5" />
                    </div>
                    <div>
                        {isEditingFormTitle ? (
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onBlur={() => setIsEditingFormTitle(false)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === "Escape") setIsEditingFormTitle(false);
                                }}
                                className="h-8 text-base font-semibold px-2 -ml-2 w-[360px] max-w-[45vw]"
                                autoFocus
                            />
                        ) : (
                            <h2
                                className="text-lg font-semibold text-zinc-900 cursor-pointer"
                                onClick={() => setIsEditingFormTitle(true)}
                                title="Click to rename"
                            >
                                {title}
                            </h2>
                        )}
                        <p className="text-xs text-zinc-500">Form Builder · {fields.length} fields · {responseCount} responses</p>
                    </div>
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <div className="inline-flex rounded-2xl border border-zinc-200 bg-zinc-50 p-1 shadow-sm">
                        <button
                            type="button"
                            onClick={() => {
                                setActiveTab("builder");
                                setPreviewMode(false);
                            }}
                            className={cn(
                                "px-4 h-8 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-2",
                                activeTab === "builder" && !previewMode
                                    ? "bg-white shadow-sm border border-zinc-200 text-zinc-900"
                                    : "text-zinc-600 hover:bg-white/70 hover:text-zinc-900"
                            )}
                        >
                            <Settings className={cn("h-3.5 w-3.5", !previewMode ? "text-violet-600" : "text-zinc-400")} />
                            Build
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setActiveTab("builder");
                                setPreviewMode(true);
                            }}
                            className={cn(
                                "px-4 h-8 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-2",
                                activeTab === "builder" && previewMode
                                    ? "bg-white shadow-sm border border-zinc-200 text-zinc-900"
                                    : "text-zinc-600 hover:bg-white/70 hover:text-zinc-900"
                            )}
                        >
                            <Eye className={cn("h-3.5 w-3.5", previewMode ? "text-violet-600" : "text-zinc-400")} />
                            Preview
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("responses")}
                            className={cn(
                                "px-4 h-8 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-2",
                                activeTab === "responses"
                                    ? "bg-white shadow-sm border border-zinc-200 text-zinc-900"
                                    : "text-zinc-600 hover:bg-white/70 hover:text-zinc-900"
                            )}
                        >
                            <FileSpreadsheet className={cn("h-3.5 w-3.5", activeTab === "responses" ? "text-violet-600" : "text-zinc-400")} />
                            Responses
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                    "h-8 text-xs font-medium text-zinc-700 border-zinc-200 cursor-pointer",
                                    showSettings && "bg-violet-50 text-violet-700 border-violet-200"
                                )}
                                onClick={() => setShowSettings(!showSettings)}
                            >
                                <Settings className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline ml-1">Settings</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Form settings</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs font-medium text-zinc-700 border-zinc-200 cursor-pointer"
                                onClick={() => window.open(publicFormUrl, "_blank")}
                            >
                                <LinkIcon className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline ml-1">Open link</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Open public form link</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs font-medium text-zinc-700 border-zinc-200 cursor-pointer"
                                onClick={async () => {
                                    try {
                                        await navigator.clipboard.writeText(publicFormUrl);
                                        setCopied(true);
                                        window.setTimeout(() => setCopied(false), 1200);
                                    } catch {
                                        // ignore
                                    }
                                }}
                            >
                                <Copy className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline ml-1">{copied ? "Copied" : "Copy"}</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Copy public form link</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                className={cn(
                                    "h-8 px-3 text-xs font-medium border-0 shadow-sm cursor-pointer",
                                    isPublished
                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                        : "bg-zinc-900 hover:bg-zinc-800 text-white"
                                )}
                                onClick={() => {
                                    if (isPublished) void unpublish();
                                    else void publishNow();
                                }}
                            >
                                <Share2 className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline ml-1">
                                    {isPublished ? "Unpublish" : "Publish"}
                                </span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            {isPublished ? "Unpublish form" : "Publish form"}
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>

            <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
                {/* Sidebar - Field Types */}
                {activeTab === "builder" && !previewMode && settings.fieldCreationMode === "sidebar" && isFieldTypeSidebarOpen && (
                    <div
                        ref={leftFieldSidebarRef}
                        className="bg-white border-r border-zinc-200 flex flex-col min-h-0 overflow-hidden relative group shrink-0"
                        style={{ width: sidebarWidth }}
                    >
                        <div className="shrink-0 p-4 border-b border-zinc-100 bg-gradient-to-r from-indigo-50 to-purple-50 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h3 className="font-semibold text-sm text-zinc-800 mb-1">Add Form Fields</h3>
                                <p className="text-xs text-zinc-500">Drag fields to reorder on canvas</p>
                            </div>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        type="button"
                                        className="h-8 w-8 shrink-0 rounded-md border border-zinc-200 bg-white/80 hover:bg-white text-zinc-600 hover:text-zinc-900 flex items-center justify-center cursor-pointer"
                                        aria-label="Hide field picker"
                                        onClick={() => setIsFieldTypeSidebarOpen(false)}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Hide field picker</TooltipContent>
                            </Tooltip>
                        </div>
                        <div className="shrink-0 p-4 border-b border-zinc-100">
                            <Input
                                ref={sidebarFieldSearchInputRef}
                                value={sidebarSearch}
                                onChange={(e) => setSidebarSearch(e.target.value)}
                                placeholder="Search fields..."
                                className="h-9"
                            />
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                            <div className="p-4 space-y-5">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-2">Task fields</p>
                                    <div className="space-y-0.5">
                                        {filteredTaskFieldPresets.map((preset) => {
                                            const Icon = preset.icon;
                                            return (
                                                <button
                                                    key={preset.key}
                                                    type="button"
                                                    onClick={() => addTaskPreset(preset.key)}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-100 transition-colors text-left cursor-pointer group"
                                                >
                                                    <div className="h-8 w-8 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:border-zinc-200 shadow-sm transition-all text-zinc-500">
                                                        <Icon className="h-4 w-4" />
                                                    </div>
                                                    <span className="text-[13px] font-medium text-zinc-700 flex-1">{preset.label}</span>
                                                </button>
                                            );
                                        })}
                                        {filteredTaskFieldPresets.length === 0 && (
                                            <div className="text-xs text-zinc-500 px-2 py-2">
                                                No task fields match <span className="font-medium text-zinc-700">"{sidebarSearch.trim()}"</span>.
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-2">All field types</p>
                                    <div className="space-y-0.5">
                                        {filteredFieldTypes.map((fieldType) => {
                                            const matchingExisting = (customFields as any[]).filter(
                                                (f: any) => DB_TYPE_TO_FIELD_TYPE[f.type] === fieldType.type
                                            );
                                            return (
                                                <FormViewFieldTypeRow
                                                    key={fieldType.type}
                                                    type={fieldType.type}
                                                    icon={fieldType.icon}
                                                    label={fieldType.label}
                                                    existingFields={matchingExisting}
                                                    onCreateNew={(el) => {
                                                        if (fieldType.type === 'block') {
                                                            addField('block', el);
                                                        } else {
                                                            addField(fieldType.type, el);
                                                        }
                                                    }}
                                                    onAddExisting={(field: any) => {
                                                        const newFormField: FormField = {
                                                            id: `${Date.now()}-${fieldType.type}`,
                                                            customFieldTitle: field.name,
                                                            type: fieldType.type,
                                                            label: field.name,
                                                            description: field.config?.description ?? undefined,
                                                            required: false,
                                                            placeholder: '',
                                                            options: field.config?.options,
                                                            customFieldId: field.id,
                                                            customFieldType: field.type,
                                                            customFieldConfig: field.config,
                                                        };
                                                        setFields((prev) => {
                                                            const raw = fieldInsertIndexRef.current;
                                                            fieldInsertIndexRef.current = null;
                                                            const idx = raw === null ? prev.length : Math.max(0, Math.min(raw, prev.length));
                                                            const next = [...prev];
                                                            next.splice(idx, 0, newFormField);
                                                            return next;
                                                        });
                                                        setHasUnsavedChanges(true);
                                                        setIsFieldTypeSidebarOpen(false);
                                                    }}
                                                />
                                            );
                                        })}
                                        {filteredFieldTypes.length === 0 && (
                                            <div className="text-xs text-zinc-500 px-2 py-2">
                                                No field types match <span className="font-medium text-zinc-700">"{sidebarSearch.trim()}"</span>.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>


                        {/* Resize handle (right edge) */}
                        <div
                            role="separator"
                            aria-orientation="vertical"
                            className={cn(
                                "absolute right-0 top-0 bottom-0 w-2 cursor-col-resize",
                                "opacity-0 group-hover:opacity-100 transition-opacity",
                                "after:absolute after:right-0 after:top-0 after:bottom-0 after:w-[2px] after:bg-indigo-300/60 after:rounded-full after:opacity-60"
                            )}
                            onMouseDown={(e) => {
                                sidebarResizeStateRef.current = {
                                    isResizing: true,
                                    startX: e.clientX,
                                    startWidth: sidebarWidth,
                                };
                                document.body.style.cursor = "col-resize";
                                document.body.style.userSelect = "none";
                            }}
                        />
                    </div>
                )}

                {/* Canvas */}
                <div
                    className={cn(
                        "min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain",
                        settings.theme === "dark" ? "bg-zinc-950" : "bg-gradient-to-br from-slate-50 to-zinc-100"
                    )}
                    style={settings.theme === "light" ? { backgroundColor: settings.backgroundColor } : undefined}
                >
                    {activeTab === "responses" ? (
                        <div className="min-h-full p-8">
                            <div className="mx-auto w-full max-w-6xl space-y-4">
                                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <h3 className="text-base font-semibold text-zinc-900">Responses</h3>
                                            <p className="text-xs text-zinc-500">{responseCount} total responses</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-8 text-xs"
                                                disabled={!responseTotal || exportingResponses}
                                                onClick={() => {
                                                    void handleDownloadResponses();
                                                }}
                                            >
                                                {exportingResponses ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
                                                Download Excel
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                                disabled={!responseTotal}
                                                onClick={() => {
                                                    void handleDeleteAllResponses();
                                                }}
                                            >
                                                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                                Delete all
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="mt-3 grid gap-2 md:grid-cols-3">
                                        <Input
                                            value={responsesSearch}
                                            onChange={(e) => setResponsesSearch(e.target.value)}
                                            placeholder="Search responses..."
                                            className="h-9"
                                        />
                                        <Select value={responsesStatusFilter} onValueChange={(v: "all" | "submitted") => setResponsesStatusFilter(v)}>
                                            <SelectTrigger className="h-9">
                                                <Filter className="mr-2 h-3.5 w-3.5 text-zinc-500" />
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All statuses</SelectItem>
                                                <SelectItem value="submitted">Submitted</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="h-9 justify-start text-xs"
                                            onClick={() => {
                                                setResponsesSortBy((prev) => (prev === "submittedAt" ? "status" : "submittedAt"));
                                                setResponsesSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
                                            }}
                                        >
                                            <ArrowUpDown className="mr-2 h-3.5 w-3.5" />
                                            Sort: {responsesSortBy === "submittedAt" ? "Date" : "Status"} ({responsesSortDir})
                                        </Button>
                                    </div>
                                </div>
                                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                                    <div className="w-full overflow-x-auto">
                                        <table className="min-w-full text-sm">
                                            <thead className="bg-zinc-50 border-b border-zinc-200">
                                                <tr>
                                                    <th className="px-4 py-3 text-left font-medium text-zinc-700">ID</th>
                                                    <th className="px-4 py-3 text-left font-medium text-zinc-700">Submitted at</th>
                                                    <th className="px-4 py-3 text-left font-medium text-zinc-700">Status</th>
                                                    <th className="px-4 py-3 text-left font-medium text-zinc-700">Preview</th>
                                                    <th className="px-4 py-3 text-right font-medium text-zinc-700">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {responsesLoading ? (
                                                    <tr>
                                                        <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-500">
                                                            Loading responses...
                                                        </td>
                                                    </tr>
                                                ) : responses.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="px-4 py-14 text-center">
                                                            <div className="mx-auto max-w-md">
                                                                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50">
                                                                    <FileSpreadsheet className="h-5 w-5 text-zinc-400" />
                                                                </div>
                                                                <p className="text-sm font-medium text-zinc-800">No responses yet</p>
                                                                <p className="mt-1 text-xs text-zinc-500">
                                                                    Response submissions will appear here with filtering, sorting, and export support.
                                                                </p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    responses.map((item) => (
                                                        <tr key={item.id} className="border-b border-zinc-100 last:border-0">
                                                            <td className="px-4 py-3 text-xs text-zinc-700">{item.id}</td>
                                                            <td className="px-4 py-3 text-xs text-zinc-700">{new Date(item.submittedAt).toLocaleString()}</td>
                                                            <td className="px-4 py-3">
                                                                <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                                                    {item.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-xs text-zinc-600">{getResponsePreviewText(item) || "—"}</td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex justify-end">
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                                        onClick={() => {
                                                                            void handleDeleteResponse(item.id);
                                                                        }}
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3">
                                    <div className="text-xs text-zinc-500">
                                        Page {responsesPage} of {responseTotalPages} · {responseTotal} total
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-xs"
                                            disabled={responsesPage <= 1 || responsesLoading}
                                            onClick={() => setResponsesPage((p) => Math.max(1, p - 1))}
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-xs"
                                            disabled={responsesPage >= responseTotalPages || responsesLoading}
                                            onClick={() => setResponsesPage((p) => Math.min(responseTotalPages, p + 1))}
                                        >
                                            Next
                                        </Button>
                                        <select
                                            className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-xs"
                                            value={responsesPageSize}
                                            onChange={(e) => setResponsesPageSize(Number(e.target.value))}
                                        >
                                            {[20, 50, 100, 200].map((size) => (
                                                <option key={size} value={size}>
                                                    {size} / page
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                {isViewFetching && (
                                    <div className="text-xs text-zinc-500 flex items-center gap-2">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        Syncing latest form data...
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : pageMode === "start" ? (
                        <div className="min-h-full p-8 flex justify-center">
                            <div className="w-full max-w-3xl">
                                <div className="bg-white rounded-2xl shadow-lg border border-zinc-200 overflow-x-hidden overflow-y-visible">
                                    {/* Form Cover */}
                                    <div
                                        className="h-40 relative group overflow-hidden rounded-t-2xl"
                                        style={{
                                            backgroundColor: settings.coverBackgroundColor || "#7c3aed",
                                        }}
                                    >
                                        {settings.coverImageUrl ? (
                                            <Image
                                                src={settings.coverImageUrl}
                                                alt="Form header cover"
                                                fill
                                                className="object-cover"
                                            />
                                        ) : null}
                                        {!previewMode && (
                                            <Popover
                                                open={coverPickerOpen}
                                                onOpenChange={(open) => {
                                                    setCoverPickerOpen(open);
                                                    if (open) {
                                                        setCoverTab("background");
                                                        setCoverColorDraft(settings.coverBackgroundColor || "#7c3aed");
                                                        setCoverColorMode("HEX");
                                                    }
                                                }}
                                            >
                                                <PopoverTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-all cursor-pointer"
                                                    >
                                                        <span className="opacity-0 group-hover:opacity-100 text-white font-medium flex items-center gap-2 transition-opacity">
                                                            <ImageIcon className="h-5 w-5" />
                                                            Customize cover
                                                        </span>
                                                    </button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[420px] p-4" align="start">
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="text-sm font-semibold text-zinc-800">Cover settings</div>
                                                            <button
                                                                type="button"
                                                                className="h-7 rounded-md border border-zinc-200 px-2 text-[11px] font-medium text-zinc-600 hover:bg-red-50 hover:text-red-500 hover:border-red-200 cursor-pointer transition-colors"
                                                                onClick={() => {
                                                                    setSettings({ ...settings, coverBackgroundColor: "", coverImageUrl: "", coverImagePath: "" });
                                                                    setHasUnsavedChanges(true);
                                                                }}
                                                            >
                                                                Clear cover
                                                            </button>
                                                        </div>

                                                        <div className="space-y-3">
                                                            <div className="flex flex-wrap gap-2 items-center">
                                                                <button
                                                                    type="button"
                                                                    className={cn(
                                                                        "h-8 w-8 rounded-lg border border-zinc-200 bg-white relative overflow-hidden cursor-pointer flex items-center justify-center transition-all",
                                                                        !settings.coverBackgroundColor && !settings.coverImageUrl ? "border-zinc-900 ring-2 ring-zinc-900/10" : "hover:scale-105"
                                                                    )}
                                                                    onClick={() => {
                                                                        setSettings({ ...settings, coverBackgroundColor: "", coverImageUrl: "", coverImagePath: "" });
                                                                        setHasUnsavedChanges(true);
                                                                    }}
                                                                    aria-label="Remove cover"
                                                                >
                                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                                        <div className="w-[1px] h-full bg-red-400 rotate-45" />
                                                                    </div>
                                                                </button>
                                                                {BACKGROUND_COLORS.map((c) => (
                                                                    <button
                                                                        key={`cover-${c.value}`}
                                                                        type="button"
                                                                        className={cn(
                                                                            "h-8 w-8 rounded-lg border cursor-pointer transition-all",
                                                                            settings.coverBackgroundColor === c.value && !settings.coverImageUrl ? "border-zinc-900 ring-2 ring-zinc-900/10" : "border-zinc-200 hover:scale-105"
                                                                        )}
                                                                        style={{ background: c.value }}
                                                                        onClick={() => {
                                                                            setSettings({ ...settings, coverBackgroundColor: c.value, coverImageUrl: "", coverImagePath: "" });
                                                                            setHasUnsavedChanges(true);
                                                                        }}
                                                                        aria-label={c.label}
                                                                    />
                                                                ))}

                                                                <Popover
                                                                    open={coverColorPickerOpen}
                                                                    onOpenChange={(o) => {
                                                                        setCoverColorPickerOpen(o);
                                                                        if (o) {
                                                                            setCoverColorDraft(settings.coverBackgroundColor || "#7c3aed");
                                                                            setCoverColorMode("HEX");
                                                                        }
                                                                    }}
                                                                >
                                                                    <PopoverTrigger asChild>
                                                                        <button
                                                                            type="button"
                                                                            className="h-8 w-8 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 cursor-pointer flex items-center justify-center text-zinc-600 transition-all active:scale-95"
                                                                            aria-label="Custom cover color"
                                                                        >
                                                                            <Pencil className="h-4 w-4" />
                                                                        </button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent align="start" sideOffset={12} className="w-[260px] p-4 rounded-2xl border border-zinc-200 shadow-2xl animate-in zoom-in-95 duration-200">
                                                                        <ThemeColorPicker
                                                                            color={isValidHex(coverColorDraft) ? coverColorDraft : "#7c3aed"}
                                                                            mode={coverColorMode}
                                                                            onModeChange={setCoverColorMode}
                                                                            onColorChange={(hex) => setCoverColorDraft(normalizeHex(hex))}
                                                                            onSave={() => {
                                                                                if (!isValidHex(coverColorDraft)) return;
                                                                                setSettings({ ...settings, coverBackgroundColor: coverColorDraft, coverImageUrl: "", coverImagePath: "" });
                                                                                setHasUnsavedChanges(true);
                                                                                setCoverColorPickerOpen(false);
                                                                            }}
                                                                        />
                                                                    </PopoverContent>
                                                                </Popover>

                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                        <button
                                                                            type="button"
                                                                            className={cn(
                                                                                "h-8 w-8 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 cursor-pointer flex items-center justify-center text-zinc-600 transition-all active:scale-95",
                                                                                settings.coverImageUrl && "border-zinc-900 ring-2 ring-zinc-900/10 bg-white"
                                                                            )}
                                                                        >
                                                                            <ImageIcon className="h-4 w-4" />
                                                                        </button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent align="start" sideOffset={16} className="w-[340px] p-4 rounded-2xl border border-zinc-200 shadow-2xl animate-in zoom-in-95 duration-200 z-[100]">
                                                                        <div className="space-y-3">
                                                                            <div className="text-xs font-semibold text-zinc-800">
                                                                                {settings.coverImageUrl ? "Current cover" : "Upload cover image"}
                                                                            </div>
                                                                            {settings.coverImageUrl ? (
                                                                                <div className="relative group aspect-[2.5/1] w-full rounded-xl overflow-hidden border border-zinc-200 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                                                                                    <Image
                                                                                        src={settings.coverImageUrl}
                                                                                        alt="Cover preview"
                                                                                        fill
                                                                                        className="object-cover"
                                                                                    />
                                                                                    <button
                                                                                        type="button"
                                                                                        className="absolute top-2 right-2 h-5 w-5 rounded-full bg-black/60 text-white hover:bg-black/80 flex items-center justify-center cursor-pointer transition-all active:scale-90"
                                                                                        onClick={() => {
                                                                                            setSettings({ ...settings, coverImageUrl: "", coverImagePath: "" });
                                                                                            setHasUnsavedChanges(true);
                                                                                        }}
                                                                                    >
                                                                                        <X className="h-3 w-3" />
                                                                                    </button>
                                                                                </div>
                                                                            ) : (
                                                                                <MediaUpload
                                                                                    bucket="media"
                                                                                    pathPrefix={`forms/${viewId || "draft"}/cover`}
                                                                                    maxFiles={1}
                                                                                    initialMedia={
                                                                                        settings.coverImageUrl && settings.coverImagePath
                                                                                            ? [{
                                                                                                id: settings.coverImagePath,
                                                                                                name: "cover",
                                                                                                url: settings.coverImageUrl,
                                                                                                path: settings.coverImagePath,
                                                                                                size: 0,
                                                                                                type: "image/*"
                                                                                            }]
                                                                                            : []
                                                                                    }
                                                                                    onChange={(media) => {
                                                                                        const first = media[0];
                                                                                        setSettings({
                                                                                            ...settings,
                                                                                            coverImageUrl: first?.url || "",
                                                                                            coverImagePath: first?.path || "",
                                                                                            coverBackgroundColor: first ? "" : settings.coverBackgroundColor
                                                                                        });
                                                                                        setHasUnsavedChanges(true);
                                                                                    }}
                                                                                />
                                                                            )}
                                                                            {!settings.coverImageUrl && (
                                                                                <p className="text-[10px] text-zinc-400 text-center">
                                                                                    Recommended size: 1200x400px (3:1 aspect ratio)
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </PopoverContent>
                                                                </Popover>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        )}
                                        {settings.showProgressBar && (
                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                                                <div className="h-full bg-white/60 w-0 transition-all duration-300" style={{ width: '0%' }}></div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="px-10 py-8 -mt-12 relative z-10">
                                        {/* Form Header Card */}
                                        <div className="bg-white p-8 rounded-xl shadow-md border border-zinc-100 mb-8 text-center hover:shadow-lg transition-shadow">
                                            {!settings.hideBranding ? (
                                                <div className="flex justify-center mb-4">
                                                    <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 shadow-sm">
                                                        <AgentfloxLogoMark />
                                                        <span className="text-[11px] text-zinc-500">Powered forms</span>
                                                    </div>
                                                </div>
                                            ) : settings.brandLogoUrl ? (
                                                <div className="flex justify-center mb-4">
                                                    <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 shadow-sm">
                                                        <span className="relative inline-block h-6 w-6">
                                                            <Image
                                                                src={settings.brandLogoUrl}
                                                                alt="Custom brand logo"
                                                                fill
                                                                className="object-contain"
                                                            />
                                                        </span>
                                                        <span className="text-[11px] text-zinc-500">Your brand</span>
                                                    </div>
                                                </div>
                                            ) : null}
                                            <input
                                                className="text-3xl font-bold text-center w-full border-0 border-b border-transparent focus:border-violet-500 px-4 py-2 transition-all text-zinc-900 placeholder:text-zinc-300 bg-transparent mb-2 outline-none"
                                                placeholder="Form Title"
                                                value={title}
                                                onChange={(e) => { setTitle(e.target.value); setHasUnsavedChanges(true); }}
                                                disabled={previewMode}
                                            />
                                            <input
                                                className="text-base text-center w-full border-0 border-b border-transparent focus:border-violet-500 px-4 py-1 transition-all text-zinc-500 placeholder:text-zinc-300 bg-transparent outline-none"
                                                placeholder="Add a description..."
                                                value={description}
                                                onChange={(e) => { setDescription(e.target.value); setHasUnsavedChanges(true); }}
                                                disabled={previewMode}
                                            />
                                        </div>

                                        {/* Form Fields */}
                                        {!previewMode ? (
                                            <DndContext
                                                sensors={sensors}
                                                collisionDetection={closestCenter}
                                                onDragEnd={handleDragEnd}
                                            >
                                                <SortableContext
                                                    items={fields.map(f => f.id)}
                                                    strategy={verticalListSortingStrategy}
                                                >
                                                    <div className="flex min-h-[200px] flex-col gap-3">
                                                        {fields.length > 0 && (
                                                            <FieldInsertGap
                                                                insertIndex={0}
                                                                fieldCreationMode={settings.fieldCreationMode}
                                                                onOpenModal={openFieldPickerAtIndex}
                                                                onFocusSidebar={focusLeftSidebarForAdd}
                                                            />
                                                        )}
                                                        {fields.map((field, fieldIndex) => (
                                                            <Fragment key={field.id}>
                                                                <SortableField
                                                                    field={field}
                                                                    onDelete={deleteField}
                                                                    onUpdate={updateField}
                                                                    onDuplicate={duplicateField}
                                                                    onOpenAdvancedSettings={(fieldId) => {
                                                                        setSelectedAdvancedFieldId(fieldId);
                                                                        setCustomFieldsManagerOpen(true);
                                                                    }}
                                                                    resolvedWorkspaceId={resolvedWorkspaceId}
                                                                    spaceId={spaceId}
                                                                    projectId={projectId}
                                                                />
                                                                {fieldIndex < fields.length - 1 ? (
                                                                    <FieldInsertGap
                                                                        insertIndex={fieldIndex + 1}
                                                                        fieldCreationMode={settings.fieldCreationMode}
                                                                        onOpenModal={openFieldPickerAtIndex}
                                                                        onFocusSidebar={focusLeftSidebarForAdd}
                                                                    />
                                                                ) : null}
                                                            </Fragment>
                                                        ))}

                                                        {fields.length === 0 && (
                                                            <div className="py-16 text-center border-2 border-dashed border-zinc-300 rounded-xl bg-zinc-50/50">
                                                                <CheckSquare className="h-12 w-12 text-zinc-300 mx-auto mb-3" />
                                                                <p className="text-zinc-500 font-medium mb-1">No fields yet</p>
                                                                <p className="text-sm text-zinc-400">
                                                                    {settings.fieldCreationMode === "sidebar"
                                                                        ? "Click Add field below to open the field picker"
                                                                        : "Use Add field below to get started"}
                                                                </p>
                                                            </div>
                                                        )}

                                                        <div className="mt-8">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                className="h-10 w-full cursor-pointer rounded-xl border-dashed border-zinc-300 bg-white text-[13px] text-zinc-500 hover:text-zinc-800 hover:border-zinc-400 hover:bg-zinc-50/50 transition-all shadow-none"
                                                                onClick={(e) =>
                                                                    settings.fieldCreationMode === "modal"
                                                                        ? openFieldPickerAtIndex(fields.length, e.currentTarget)
                                                                        : focusLeftSidebarForAdd(fields.length)
                                                                }
                                                            >
                                                                <Plus className="mr-2 h-3.5 w-3.5" />
                                                                Add field
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </SortableContext>
                                            </DndContext>
                                        ) : (
                                            <div className="space-y-3">
                                                {visibleFields.map((field) => (
                                                    <div key={field.id} className="bg-white p-5 rounded-lg border border-zinc-200">
                                                        <Label className="text-sm font-semibold text-zinc-900 mb-1 block">
                                                            {field.label}
                                                            {field.required && <span className="text-red-500 ml-1">*</span>}
                                                        </Label>
                                                        {field.description && (
                                                            <p className="text-xs text-zinc-500 mb-3">{field.description}</p>
                                                        )}
                                                        {renderPreviewField(field, {
                                                            previewMode,
                                                            previewValues,
                                                            onPreviewValueChange: (fieldId, value) => setPreviewValues((prev) => ({ ...prev, [fieldId]: value })),
                                                            workspaceMembers,
                                                            agents,
                                                            listStatuses,
                                                            customField: field.customFieldId ? customFieldsById.get(field.customFieldId) : undefined,
                                                        })}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Submit Button */}
                                        <div className="mt-8 space-y-3">
                                            {previewMode && settings.showCaptcha && (
                                                <div className="rounded-lg border border-zinc-200 bg-white p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <div className="text-sm font-medium text-zinc-900">CAPTCHA</div>
                                                            <div className="text-xs text-zinc-500 mt-0.5">Verify you’re human before submitting</div>
                                                        </div>
                                                        <div className="h-10 w-28 rounded-md bg-zinc-100 border border-zinc-200" />
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex justify-end">
                                                <Button
                                                    className="px-8"
                                                    style={{ backgroundColor: settings.buttonColor }}
                                                    disabled={!previewMode || submittingResponse}
                                                    onClick={() => {
                                                        void handleSubmitResponse();
                                                    }}
                                                >
                                                    {submittingResponse && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                    {settings.submitButtonText}
                                                </Button>
                                            </div>
                                            {previewMode && settings.redirectUrl?.trim() && (
                                                <p className="text-[11px] text-zinc-500 text-right">
                                                    Redirect after submit to <span className="font-medium text-zinc-700">{settings.redirectUrl}</span>
                                                </p>
                                            )}
                                            {previewMode && !settings.hideBranding && (
                                                <div className="pt-2 flex justify-end">
                                                    <div className="text-[11px] text-zinc-400 inline-flex items-center gap-2">
                                                        <AgentfloxLogoMark className="opacity-80" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="min-h-full p-8 flex items-center justify-center">
                            <div className="w-full max-w-3xl">
                                <div className="bg-white rounded-2xl shadow-lg border border-zinc-200 overflow-hidden">
                                    <div className="p-10">
                                        <div className="flex items-center justify-center mb-6">
                                            <div className="h-12 w-12 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center shadow-sm">
                                                <CheckSquare className="h-6 w-6 text-zinc-700" />
                                            </div>
                                        </div>
                                        <div className="mx-auto max-w-xl">
                                            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                                                <LazyDescriptionEditor
                                                    content={endPageMessage}
                                                    onChange={(html) => {
                                                        setEndPageMessage(html);
                                                        setHasUnsavedChanges(true);
                                                    }}
                                                    editable={!previewMode}
                                                    workspaceId={resolvedWorkspaceId || null}
                                                    spaceId={spaceId || null}
                                                    projectId={projectId || null}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right-side Start/End stepper (collapsible) */}
                {activeTab === "builder" && (isPageSidebarCollapsed ? (
                    <div className="w-12 shrink-0 bg-white border-l border-zinc-200 flex flex-col items-center py-3 gap-2 min-h-0 self-stretch overflow-y-auto overscroll-contain">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    onClick={() => setIsPageSidebarCollapsed(false)}
                                    className="h-9 w-9 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 flex items-center justify-center text-zinc-700 cursor-pointer"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="left" sideOffset={8}>
                                Expand pages sidebar
                            </TooltipContent>
                        </Tooltip>

                        <div className="w-full px-1">
                            <div className="h-px w-full bg-zinc-200" />
                        </div>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    onClick={() => setPageMode("start")}
                                    className={cn(
                                        "h-9 w-9 rounded-md border flex items-center justify-center cursor-pointer",
                                        pageMode === "start"
                                            ? "border-zinc-300 bg-zinc-50 text-zinc-900"
                                            : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                                    )}
                                >
                                    <Play className="h-4 w-4" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="left" sideOffset={8}>
                                Start Page
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    onClick={() => setPageMode("end")}
                                    className={cn(
                                        "h-9 w-9 rounded-md border flex items-center justify-center cursor-pointer",
                                        pageMode === "end"
                                            ? "border-zinc-300 bg-zinc-50 text-zinc-900"
                                            : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                                    )}
                                >
                                    <Check className="h-4 w-4" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="left" sideOffset={8}>
                                End Page
                            </TooltipContent>
                        </Tooltip>
                    </div>
                ) : (
                    <div className="w-56 shrink-0 bg-white border-l border-zinc-200 flex flex-col min-h-0 self-stretch overflow-hidden">
                        <div className="shrink-0 p-3 border-b border-zinc-100 flex items-center justify-between">
                            <div className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Pages</div>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        type="button"
                                        onClick={() => setIsPageSidebarCollapsed(true)}
                                        className="h-8 w-8 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 flex items-center justify-center text-zinc-700 cursor-pointer"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="left" sideOffset={8}>
                                    Collapse pages sidebar
                                </TooltipContent>
                            </Tooltip>
                        </div>
                        <div className="p-4">
                            <div className="relative pl-6">
                                <div className="absolute left-[9px] top-1 bottom-1 w-[6px] rounded-full bg-zinc-900/90" />
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            onClick={() => setPageMode("start")}
                                            className="flex items-center gap-2 py-2 w-full text-left cursor-pointer"
                                        >
                                            <span className={cn(
                                                "h-2 w-2 rounded-full",
                                                pageMode === "start" ? "bg-zinc-900" : "bg-zinc-300"
                                            )} />
                                            <span className={cn(
                                                "text-sm",
                                                pageMode === "start" ? "text-zinc-900 font-medium" : "text-zinc-500"
                                            )}>
                                                Start Page
                                            </span>
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left" sideOffset={8}>
                                        Start Page
                                    </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            onClick={() => setPageMode("end")}
                                            className="flex items-center gap-2 py-2 w-full text-left cursor-pointer"
                                        >
                                            <span className={cn(
                                                "h-2 w-2 rounded-full",
                                                pageMode === "end" ? "bg-zinc-900" : "bg-zinc-300"
                                            )} />
                                            <span className={cn(
                                                "text-sm",
                                                pageMode === "end" ? "text-zinc-900 font-medium" : "text-zinc-500"
                                            )}>
                                                End Page
                                            </span>
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left" sideOffset={8}>
                                        End Page
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Settings Panel */}
                {activeTab === "builder" && showSettings && (
                    <div className="flex h-full min-h-0 w-96 shrink-0 flex-col overflow-hidden border-l border-zinc-200 bg-white">
                        <div className="shrink-0 p-4 border-b border-zinc-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-sm text-zinc-800">Form Settings</h3>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowSettings(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                            <div className="p-4 space-y-4 pb-8">
                                {/* Submission settings */}
                                <button
                                    type="button"
                                    className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2 cursor-pointer"
                                    onClick={() => setCustomizeSubmissionOpen((v) => !v)}
                                >
                                    <span className="font-medium">Submission settings</span>
                                    <ChevronDown className={cn("h-4 w-4 text-zinc-400 transition-transform", customizeSubmissionOpen && "rotate-180")} />
                                </button>
                                {customizeSubmissionOpen && (
                                    <div className="px-2 pb-2">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="text-xs font-medium text-zinc-700">Redirect URL</div>
                                                <Input
                                                    value={settings.redirectUrl || ""}
                                                    onChange={(e) => {
                                                        setSettings({ ...settings, redirectUrl: e.target.value });
                                                        setHasUnsavedChanges(true);
                                                    }}
                                                    placeholder="https://"
                                                    className="h-9 w-56 text-xs rounded-xl"
                                                />
                                            </div>

                                            <div className="flex items-center justify-between gap-4">
                                                <div className="text-xs font-medium text-zinc-700">Button label</div>
                                                <Input
                                                    value={settings.submitButtonText}
                                                    onChange={(e) => {
                                                        setSettings({ ...settings, submitButtonText: e.target.value });
                                                        setHasUnsavedChanges(true);
                                                    }}
                                                    placeholder="Submit"
                                                    className="h-9 w-56 text-xs rounded-xl"
                                                />
                                            </div>

                                            <div className="space-y-4 pt-2">
                                                {/* Progress Bar */}
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <Label className="text-sm text-zinc-700 font-medium">Show Progress Bar</Label>
                                                        <p className="text-xs text-zinc-500 mt-0.5">Display completion progress</p>
                                                    </div>
                                                    <Switch
                                                        checked={settings.showProgressBar}
                                                        onCheckedChange={(checked) => {
                                                            setSettings({ ...settings, showProgressBar: checked });
                                                            setHasUnsavedChanges(true);
                                                        }}
                                                    />
                                                </div>

                                                {/* Multiple Submissions */}
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <Label className="text-sm text-zinc-700 font-medium">Multiple Submissions</Label>
                                                        <p className="text-xs text-zinc-500 mt-0.5">Allow users to submit multiple times</p>
                                                    </div>
                                                    <Switch
                                                        checked={settings.allowMultipleSubmissions}
                                                        onCheckedChange={(checked) => {
                                                            setSettings({ ...settings, allowMultipleSubmissions: checked });
                                                            setHasUnsavedChanges(true);
                                                        }}
                                                    />
                                                </div>

                                                {/* Require Auth */}
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <Label className="text-sm text-zinc-700 font-medium">Require Sign In</Label>
                                                        <p className="text-xs text-zinc-500 mt-0.5">Only authenticated users can submit</p>
                                                    </div>
                                                    <Switch
                                                        checked={settings.requireAuth}
                                                        onCheckedChange={(checked) => {
                                                            setSettings({ ...settings, requireAuth: checked });
                                                            setHasUnsavedChanges(true);
                                                        }}
                                                    />
                                                </div>

                                                {/* CAPTCHA */}
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <Label className="text-sm text-zinc-700 font-medium">Show CAPTCHA</Label>
                                                        <p className="text-xs text-zinc-500 mt-0.5">Add human verification before submit</p>
                                                    </div>
                                                    <Switch
                                                        checked={settings.showCaptcha}
                                                        onCheckedChange={(checked) => {
                                                            setSettings({ ...settings, showCaptcha: checked });
                                                            setHasUnsavedChanges(true);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Layout */}
                                <button
                                    type="button"
                                    className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2 cursor-pointer"
                                    onClick={() => setCustomizeLayoutOpen((v) => !v)}
                                >
                                    <span className="font-medium">Layout</span>
                                    <ChevronDown className={cn("h-4 w-4 text-zinc-400 transition-transform", customizeLayoutOpen && "rotate-180")} />
                                </button>
                                {customizeLayoutOpen && (
                                    <div className="px-2 pb-2">
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                className={cn(
                                                    "rounded-xl border p-3 text-left hover:bg-zinc-50 cursor-pointer transition-all",
                                                    settings.layoutMode === "one"
                                                        ? "border-violet-500 ring-4 ring-violet-500/10 bg-violet-50/30"
                                                        : "border-zinc-200 bg-white"
                                                )}
                                                onClick={() => { setSettings({ ...settings, layoutMode: "one" }); setHasUnsavedChanges(true); }}
                                            >
                                                <div className="h-16 rounded-md bg-zinc-100/80 border border-zinc-200 mb-2 flex items-center justify-center">
                                                    <div className="w-[88%] space-y-1.5">
                                                        <div className="h-5 rounded-md border border-zinc-300 bg-white/70 flex items-center justify-center px-1.5 gap-1.5">
                                                            <div className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
                                                            <div className="h-1.5 w-6 rounded bg-zinc-300" />
                                                        </div>
                                                        <div className="h-4.5 rounded-md border border-zinc-300 bg-white/70 flex items-center justify-center px-1.5 gap-1.5">
                                                            <div className="h-1 w-4 rounded-full bg-zinc-300/90" />
                                                            <div className="h-1 w-7 rounded-full bg-zinc-300/90" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-xs font-medium text-zinc-800 leading-none">One column</div>
                                            </button>
                                            <button
                                                type="button"
                                                className={cn(
                                                    "rounded-xl border p-3 text-left hover:bg-zinc-50 cursor-pointer transition-all",
                                                    settings.layoutMode === "two"
                                                        ? "border-violet-500 ring-4 ring-violet-500/10 bg-violet-50/30"
                                                        : "border-zinc-200 bg-white"
                                                )}
                                                onClick={() => { setSettings({ ...settings, layoutMode: "two" }); setHasUnsavedChanges(true); }}
                                            >
                                                <div className="h-16 rounded-md bg-zinc-100/80 border border-zinc-200 mb-2 flex items-center justify-center">
                                                    <div className="w-[88%] space-y-1.5">
                                                        <div className="h-5 rounded-md border border-zinc-300 bg-white/70 flex items-center justify-center px-1.5 gap-1.5">
                                                            <div className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
                                                            <div className="h-1.5 w-6 rounded bg-zinc-300" />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-1.5">
                                                            <div className="h-4.5 rounded-md border border-zinc-300 bg-white/70 flex items-center justify-center px-1.5 gap-1.5">
                                                                <div className="h-1 w-4 rounded-full bg-zinc-300/90" />
                                                            </div>
                                                            <div className="h-4.5 rounded-md border border-zinc-300 bg-white/70 flex items-center justify-center px-1.5 gap-1.5">
                                                                <div className="h-1 w-4 rounded-full bg-zinc-300/90" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-xs font-medium text-zinc-800 leading-none">Two column</div>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Colors */}
                                <button
                                    type="button"
                                    className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2 cursor-pointer"
                                    onClick={() => setCustomizeColorsOpen((v) => !v)}
                                >
                                    <span className="font-medium">Colors</span>
                                    <ChevronDown className={cn("h-4 w-4 text-zinc-400 transition-transform", customizeColorsOpen && "rotate-180")} />
                                </button>
                                {customizeColorsOpen && (
                                    <div className="px-2 pb-2 space-y-4">
                                        <div>
                                            <div className="text-xs font-medium text-zinc-600 mb-2">Theme</div>
                                            <div className="inline-flex w-full rounded-xl bg-zinc-100 p-1 border border-zinc-200">
                                                <button
                                                    type="button"
                                                    className={cn(
                                                        "flex-1 h-8 rounded-lg text-xs font-semibold cursor-pointer transition-colors inline-flex items-center justify-center gap-1.5",
                                                        settings.theme === "light" ? "bg-white shadow-sm border border-zinc-200 text-zinc-900" : "text-zinc-600 hover:bg-white/60"
                                                    )}
                                                    onClick={() => { setSettings({ ...settings, theme: "light" }); setHasUnsavedChanges(true); }}
                                                >
                                                    <Sun className="h-3.5 w-3.5" />
                                                    Light
                                                </button>
                                                <button
                                                    type="button"
                                                    className={cn(
                                                        "flex-1 h-8 rounded-lg text-xs font-semibold cursor-pointer transition-colors inline-flex items-center justify-center gap-1.5",
                                                        settings.theme === "dark" ? "bg-white shadow-sm border border-zinc-200 text-zinc-900" : "text-zinc-600 hover:bg-white/60"
                                                    )}
                                                    onClick={() => { setSettings({ ...settings, theme: "dark" }); setHasUnsavedChanges(true); }}
                                                >
                                                    <Moon className="h-3.5 w-3.5" />
                                                    Dark
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-xs font-medium text-zinc-600 mb-2">Background</div>
                                            <div className="flex flex-wrap gap-2 items-center">
                                                <button
                                                    type="button"
                                                    className={cn(
                                                        "h-8 w-8 rounded-lg border border-zinc-200 bg-white relative overflow-hidden cursor-pointer flex items-center justify-center transition-all",
                                                        !settings.backgroundColor ? "border-zinc-900 ring-2 ring-zinc-900/10" : "hover:scale-105"
                                                    )}
                                                    onClick={() => { setSettings({ ...settings, backgroundColor: "" }); setHasUnsavedChanges(true); }}
                                                    aria-label="Remove background color"
                                                >
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="w-[1px] h-full bg-red-400 rotate-45" />
                                                    </div>
                                                </button>
                                                {BACKGROUND_COLORS.map((c) => (
                                                    <button
                                                        key={c.value}
                                                        type="button"
                                                        className={cn(
                                                            "h-8 w-8 rounded-lg border cursor-pointer",
                                                            settings.backgroundColor === c.value ? "border-zinc-900 ring-2 ring-zinc-900/10" : "border-zinc-200"
                                                        )}
                                                        style={{ backgroundColor: c.value }}
                                                        onClick={() => { setSettings({ ...settings, backgroundColor: c.value }); setHasUnsavedChanges(true); }}
                                                        aria-label={c.label}
                                                    />
                                                ))}
                                                <Popover open={customBgPickerOpen} onOpenChange={(o) => { setCustomBgPickerOpen(o); setCustomBgDraft(settings.backgroundColor); setCustomBgMode("HEX"); }}>
                                                    <PopoverTrigger asChild>
                                                        <button
                                                            type="button"
                                                            className="h-8 w-8 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 cursor-pointer flex items-center justify-center text-zinc-600"
                                                            aria-label="Custom background color"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>
                                                    </PopoverTrigger>
                                                    <PopoverContent align="end" sideOffset={8} className="w-[260px] p-4 rounded-2xl border border-zinc-200 shadow-2xl animate-in zoom-in-95 duration-200">
                                                        <ThemeColorPicker
                                                            color={isValidHex(customBgDraft) ? customBgDraft : "#ffffff"}
                                                            mode={customBgMode}
                                                            onModeChange={setCustomBgMode}
                                                            onColorChange={(hex) => setCustomBgDraft(normalizeHex(hex))}
                                                            onSave={() => {
                                                                if (!isValidHex(customBgDraft)) return;
                                                                setSettings({ ...settings, backgroundColor: customBgDraft });
                                                                setHasUnsavedChanges(true);
                                                                setCustomBgPickerOpen(false);
                                                            }}
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-xs font-medium text-zinc-600 mb-2">Buttons color</div>
                                            <div className="flex flex-wrap gap-2 items-center">
                                                <button
                                                    type="button"
                                                    className={cn(
                                                        "h-8 w-8 rounded-full border border-zinc-200 bg-white relative overflow-hidden cursor-pointer flex items-center justify-center transition-all",
                                                        !settings.buttonColor ? "border-zinc-900 ring-2 ring-zinc-900/10" : "hover:scale-105"
                                                    )}
                                                    onClick={() => { setSettings({ ...settings, buttonColor: "" }); setHasUnsavedChanges(true); }}
                                                    aria-label="Remove button color"
                                                >
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="w-[1px] h-full bg-red-400 rotate-45" />
                                                    </div>
                                                </button>
                                                {BUTTON_COLORS.map((c) => (
                                                    <button
                                                        key={c.value}
                                                        type="button"
                                                        className={cn(
                                                            "h-8 w-8 rounded-full border cursor-pointer",
                                                            settings.buttonColor === c.value ? "border-zinc-900 ring-2 ring-zinc-900/10" : "border-zinc-200"
                                                        )}
                                                        style={{ backgroundColor: c.value }}
                                                        onClick={() => { setSettings({ ...settings, buttonColor: c.value }); setHasUnsavedChanges(true); }}
                                                        aria-label={c.label}
                                                    />
                                                ))}
                                                <Popover open={customBtnPickerOpen} onOpenChange={(o) => { setCustomBtnPickerOpen(o); setCustomBtnDraft(settings.buttonColor); setCustomBtnMode("HEX"); }}>
                                                    <PopoverTrigger asChild>
                                                        <button
                                                            type="button"
                                                            className="h-8 w-8 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 cursor-pointer flex items-center justify-center text-zinc-600"
                                                            aria-label="Custom button color"
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                        </button>
                                                    </PopoverTrigger>
                                                    <PopoverContent align="end" sideOffset={8} className="w-[260px] p-4 rounded-2xl border border-zinc-200 shadow-2xl animate-in zoom-in-95 duration-200">
                                                        <ThemeColorPicker
                                                            color={isValidHex(customBtnDraft) ? customBtnDraft : "#18181b"}
                                                            mode={customBtnMode}
                                                            onModeChange={setCustomBtnMode}
                                                            onColorChange={(hex) => setCustomBtnDraft(normalizeHex(hex))}
                                                            onSave={() => {
                                                                if (!isValidHex(customBtnDraft)) return;
                                                                setSettings({ ...settings, buttonColor: customBtnDraft });
                                                                setHasUnsavedChanges(true);
                                                                setCustomBtnPickerOpen(false);
                                                            }}
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Branding */}
                                <button
                                    type="button"
                                    className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2 cursor-pointer"
                                    onClick={() => setCustomizeBrandingOpen((v) => !v)}
                                >
                                    <span className="font-medium">Branding</span>
                                    <ChevronDown className={cn("h-4 w-4 text-zinc-400 transition-transform", customizeBrandingOpen && "rotate-180")} />
                                </button>
                                {customizeBrandingOpen && (
                                    <div className="px-2 pb-2 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Label className="text-sm text-zinc-700 font-medium">Hide Agentflox branding</Label>
                                                <p className="text-xs text-zinc-500 mt-0.5">Remove the “Powered by agentflox” mark</p>
                                            </div>
                                            <Switch
                                                checked={settings.hideBranding}
                                                onCheckedChange={(checked) => {
                                                    setSettings({ ...settings, hideBranding: checked });
                                                    setHasUnsavedChanges(true);
                                                }}
                                            />
                                        </div>

                                        {!settings.hideBranding && (
                                            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                                                <div className="text-xs text-zinc-500 mb-2">Preview</div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="relative inline-block h-6 w-6">
                                                            <Image
                                                                src="/images/logo.png"
                                                                alt="Agentflox logo"
                                                                fill
                                                                className="object-contain"
                                                            />
                                                        </span>
                                                        <span className="text-xs font-semibold tracking-tight text-zinc-900">agentflox</span>
                                                    </div>
                                                    <span className="text-[11px] text-zinc-500">Powered forms</span>
                                                </div>
                                            </div>
                                        )}

                                        {settings.hideBranding && (
                                            <div className="rounded-xl border border-zinc-200 bg-white p-3">
                                                <div className="text-sm font-medium text-zinc-800 mb-1">Your brand logo</div>
                                                <div className="text-xs text-zinc-500 mb-3">Upload a logo to show at the top of your form.</div>
                                                <LogoUpload
                                                    bucket="logos"
                                                    currentLogoUrl={settings.brandLogoUrl}
                                                    currentLogoPath={settings.brandLogoPath}
                                                    onUploadSuccess={(url, path) => {
                                                        setSettings({ ...settings, brandLogoUrl: url || undefined, brandLogoPath: path || undefined });
                                                        setHasUnsavedChanges(true);
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* View settings */}
                                <button
                                    type="button"
                                    className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2 cursor-pointer"
                                    onClick={() => setCustomizeViewSettingsOpen((v) => !v)}
                                >
                                    <span className="font-medium">View settings</span>
                                    <ChevronDown className={cn("h-4 w-4 text-zinc-400 transition-transform", customizeViewSettingsOpen && "rotate-180")} />
                                </button>
                                {customizeViewSettingsOpen && (
                                    <div className="px-2 pb-2 space-y-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <div className="text-xs font-medium text-zinc-700">Default landing page</div>
                                                <div className="text-[11px] text-zinc-500 mt-0.5">Which mode opens first</div>
                                            </div>
                                            <div className="inline-flex rounded-xl bg-zinc-100 p-1 border border-zinc-200">
                                                <button
                                                    type="button"
                                                    className={cn(
                                                        "h-8 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-colors",
                                                        settings.defaultLandingPage === "preview" ? "bg-white shadow-sm border border-zinc-200 text-zinc-900" : "text-zinc-600 hover:bg-white/60"
                                                    )}
                                                    onClick={() => {
                                                        setSettings({ ...settings, defaultLandingPage: "preview" });
                                                        setPreviewMode(true);
                                                        setHasUnsavedChanges(true);
                                                    }}
                                                >
                                                    Preview
                                                </button>
                                                <button
                                                    type="button"
                                                    className={cn(
                                                        "h-8 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-colors",
                                                        settings.defaultLandingPage === "build" ? "bg-white shadow-sm border border-zinc-200 text-zinc-900" : "text-zinc-600 hover:bg-white/60"
                                                    )}
                                                    onClick={() => {
                                                        setSettings({ ...settings, defaultLandingPage: "build" });
                                                        setPreviewMode(false);
                                                        setHasUnsavedChanges(true);
                                                    }}
                                                >
                                                    Build
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <div className="text-xs font-medium text-zinc-700">Field creation mode</div>
                                                <div className="text-[11px] text-zinc-500 mt-0.5">Choose how fields are added</div>
                                            </div>
                                            <div className="inline-flex rounded-xl bg-zinc-100 p-1 border border-zinc-200">
                                                <button
                                                    type="button"
                                                    className={cn(
                                                        "h-8 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-colors",
                                                        settings.fieldCreationMode === "sidebar" ? "bg-white shadow-sm border border-zinc-200 text-zinc-900" : "text-zinc-600 hover:bg-white/60"
                                                    )}
                                                    onClick={() => {
                                                        setSettings({ ...settings, fieldCreationMode: "sidebar" });
                                                        setHasUnsavedChanges(true);
                                                    }}
                                                >
                                                    Sidebar
                                                </button>
                                                <button
                                                    type="button"
                                                    className={cn(
                                                        "h-8 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-colors",
                                                        settings.fieldCreationMode === "modal" ? "bg-white shadow-sm border border-zinc-200 text-zinc-900" : "text-zinc-600 hover:bg-white/60"
                                                    )}
                                                    onClick={() => {
                                                        setSettings({ ...settings, fieldCreationMode: "modal" });
                                                        setHasUnsavedChanges(true);
                                                    }}
                                                >
                                                    Modal
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Create custom field popover (for non-task field types) */}
            <Popover
                open={customFieldDialogOpen}
                onOpenChange={(open) => {
                    setCustomFieldDialogOpen(open);
                    if (!open) setCustomFieldAnchorPos(null);
                }}
            >
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        aria-hidden
                        className="fixed left-1/2 top-1/2 h-0 w-0 -translate-x-1/2 -translate-y-1/2 opacity-0 pointer-events-none"
                    />
                </PopoverTrigger>
                <PopoverAnchor asChild>
                    <span
                        aria-hidden
                        className="fixed h-0 w-0"
                        style={{
                            left: customFieldAnchorPos?.left ?? 0,
                            top: customFieldAnchorPos?.top ?? 0,
                        }}
                    />
                </PopoverAnchor>
                <PopoverContent side="right" align="start" sideOffset={8} collisionPadding={16} className="w-[320px] p-0 gap-0 overflow-hidden rounded-2xl">
                    <div className="px-4 pt-4 flex items-center gap-2">
                        <div>
                            <div className="text-[16px] leading-tight font-bold tracking-tight text-zinc-900">Create field</div>
                            <div className="text-[11px] text-zinc-400 mt-0.5">{FIELD_TYPES_MAP.find(t => t.type === customFieldPendingType)?.label}</div>
                        </div>
                    </div>
                    <div className="px-4 pb-4 pt-3 space-y-4 max-h-[64vh] overflow-y-auto">
                        <div className="space-y-1.5">
                            <Label className="text-[13px] font-semibold text-zinc-700">
                                Field name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                value={customFieldName}
                                onChange={(e) => setCustomFieldName(e.target.value)}
                                placeholder="Enter name..."
                                className="h-9 text-[14px]"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[13px] font-semibold text-zinc-700">Description <span className="text-zinc-400 italic">(optional)</span></Label>
                            <Textarea
                                value={customFieldDescription}
                                onChange={(e) => setCustomFieldDescription(e.target.value)}
                                placeholder="Add description..."
                                rows={2}
                                className="resize-none text-[13px]"
                            />
                            <p className="text-[12px] text-zinc-500">
                                View descriptions when hovering over fields in tasks or views
                            </p>
                        </div>
                        {['select', 'multiselect', 'radio', 'checkbox', 'voting'].includes(customFieldPendingType) && (
                            <div className="space-y-2.5">
                                <Label className="text-[13px] font-semibold text-zinc-700">
                                    Dropdown options<span className="text-red-500">*</span>
                                </Label>
                                <div className="space-y-1.5">
                                    {customFieldOptions.map((opt) => (
                                        <div
                                            key={opt.id}
                                            draggable
                                            onDragStart={() => setDraggedOptionId(opt.id)}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={() => {
                                                if (draggedOptionId) moveCustomFieldOption(draggedOptionId, opt.id);
                                                setDraggedOptionId(null);
                                            }}
                                            className="group flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-2 py-1.5"
                                        >
                                            <button
                                                type="button"
                                                className="h-7 w-7 rounded-md text-zinc-400 hover:text-zinc-600 cursor-grab active:cursor-grabbing flex items-center justify-center"
                                                aria-label="Drag to reorder option"
                                            >
                                                <GripVertical className="h-4 w-4" />
                                            </button>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <button type="button" className="h-4 w-4 rounded-full border border-zinc-200 shrink-0 cursor-pointer" style={{ backgroundColor: opt.color }} aria-label="Change option color" />
                                                </PopoverTrigger>
                                                <PopoverContent side="bottom" align="start" className="w-[220px] p-3 rounded-2xl">
                                                    <div className="text-xs font-medium text-zinc-600 mb-2">Color</div>
                                                    <div className="grid grid-cols-7 gap-2">
                                                        {OPTION_COLOR_PALETTE.map((c) => (
                                                            <button
                                                                key={c}
                                                                type="button"
                                                                className="h-6 w-6 rounded-full border border-zinc-200 cursor-pointer"
                                                                style={{ backgroundColor: c }}
                                                                onClick={() => setCustomFieldOptions((prev) => prev.map((x) => (x.id === opt.id ? { ...x, color: c } : x)))}
                                                            />
                                                        ))}
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                            <Input
                                                variant="ghost"
                                                value={opt.label}
                                                onChange={(e) => setCustomFieldOptions((prev) => prev.map((x) => (x.id === opt.id ? { ...x, label: e.target.value } : x)))}
                                                className="h-8 bg-transparent px-0 focus-visible:ring-0 focus-visible:outline-none text-[14px]"
                                            />
                                            <button
                                                type="button"
                                                className="h-7 w-7 shrink-0 rounded-md text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
                                                aria-label="Delete option"
                                                onClick={() => setCustomFieldOptions((prev) => prev.filter((x) => x.id !== opt.id))}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {isOptionInputOpen ? (
                                        <div className="group flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-2 py-1.5">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className="h-4 w-4 rounded-full border border-zinc-200 shrink-0 cursor-pointer"
                                                        style={{ backgroundColor: optionDraftColor }}
                                                        aria-label="Draft option color"
                                                    />
                                                </PopoverTrigger>
                                                <PopoverContent side="bottom" align="start" className="w-[220px] p-3 rounded-2xl">
                                                    <div className="text-xs font-medium text-zinc-600 mb-2">Color</div>
                                                    <div className="grid grid-cols-7 gap-2">
                                                        {OPTION_COLOR_PALETTE.map((c) => (
                                                            <button
                                                                key={c}
                                                                type="button"
                                                                className="h-6 w-6 rounded-full border border-zinc-200 cursor-pointer"
                                                                style={{ backgroundColor: c }}
                                                                onClick={() => setOptionDraftColor(c)}
                                                            />
                                                        ))}
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                            <Input
                                                variant="ghost"
                                                autoFocus
                                                value={customFieldOptionInput}
                                                onChange={(e) => setCustomFieldOptionInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        e.preventDefault();
                                                        addCustomFieldOptionsFromInput();
                                                    }
                                                }}
                                                placeholder="Type option name..."
                                                className="h-8 bg-transparent px-0 focus-visible:ring-0 focus-visible:outline-none text-[14px]"
                                            />
                                            <button
                                                type="button"
                                                className="h-7 w-7 shrink-0 rounded-md text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
                                                aria-label="Remove draft option"
                                                onClick={() => {
                                                    setIsOptionInputOpen(false);
                                                    setCustomFieldOptionInput("");
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setIsOptionInputOpen(true)}
                                            className="group w-full flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-2 py-1.5 text-left cursor-pointer"
                                        >
                                            <div className="h-7 w-7 rounded-md text-zinc-700 flex items-center justify-center">
                                                <Plus className="h-4 w-4" />
                                            </div>
                                            <span className="text-[14px] text-zinc-500">Type or paste options</span>
                                            <span className="ml-auto h-7 w-7 rounded-md text-zinc-400 flex items-center justify-center">
                                                <Plus className="h-4 w-4" />
                                            </span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                        {customFieldPendingType === "user" && (
                            <div className="space-y-2.5">
                                <Label className="text-[13px] font-semibold text-zinc-700">Settings</Label>
                                <div className="space-y-2">
                                    <label className="flex items-start gap-2 text-[13px] text-zinc-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="mt-0.5 h-4 w-4 rounded border-zinc-300"
                                            checked={userFieldSettings.showWholeWorkspace}
                                            onChange={(e) => setUserFieldSettings((prev) => ({ ...prev, showWholeWorkspace: e.target.checked }))}
                                        />
                                        <span>Show people from my entire Workspace</span>
                                    </label>
                                    <label className="flex items-start gap-2 text-[13px] text-zinc-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="mt-0.5 h-4 w-4 rounded border-zinc-300"
                                            checked={userFieldSettings.showGuests}
                                            onChange={(e) => setUserFieldSettings((prev) => ({ ...prev, showGuests: e.target.checked }))}
                                        />
                                        <span>Show guests</span>
                                    </label>
                                    <label className="flex items-start gap-2 text-[13px] text-zinc-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="mt-0.5 h-4 w-4 rounded border-zinc-300"
                                            checked={userFieldSettings.allowMultiple}
                                            onChange={(e) => setUserFieldSettings((prev) => ({ ...prev, allowMultiple: e.target.checked }))}
                                        />
                                        <span>Select multiple people</span>
                                    </label>
                                    <label className="flex items-start gap-2 text-[13px] text-zinc-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="mt-0.5 h-4 w-4 rounded border-zinc-300"
                                            checked={userFieldSettings.includeTeams}
                                            onChange={(e) => setUserFieldSettings((prev) => ({ ...prev, includeTeams: e.target.checked }))}
                                        />
                                        <span>Include teams</span>
                                    </label>
                                </div>
                            </div>
                        )}
                        {customFieldPendingType === "currency" && (
                            <div className="space-y-1.5">
                                <Label className="text-[13px] font-semibold text-zinc-700">Currency</Label>
                                <Select value={currencyCode} onValueChange={setCurrencyCode}>
                                    <SelectTrigger className="h-9 text-[14px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CURRENCY_OPTIONS.map((c) => (
                                            <SelectItem key={c.value} value={c.value}>
                                                {c.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50 flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setCustomFieldDialogOpen(false);
                                setCustomFieldAnchorPos(null);
                            }}
                            className="h-8 px-3 text-[12px] font-semibold rounded-md border-zinc-300 text-zinc-700 hover:text-zinc-900 cursor-pointer"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => void handleCreateCustomField()}
                            disabled={createCustomFieldMutation.isPending || !customFieldName.trim() || (['select', 'multiselect', 'radio', 'checkbox', 'voting'].includes(customFieldPendingType) && customFieldOptions.filter((o) => o.label.trim()).length === 0)}
                            className="h-8 px-4 text-[12px] font-semibold rounded-md bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm cursor-pointer"
                        >
                            {createCustomFieldMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                            Create Field
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>

            <CustomFieldsManagerModal
                open={customFieldsManagerOpen}
                onOpenChange={(v) => {
                    setCustomFieldsManagerOpen(v);
                    if (!v) setSelectedAdvancedFieldId(undefined);
                }}
                workspaceId={resolvedWorkspaceId || ""}
                initialFieldId={selectedAdvancedFieldId}
            />

            {/* Field picker popover (for modal creation mode) */}
            <Popover
                open={fieldPickerOpen}
                onOpenChange={(open) => {
                    setFieldPickerOpen(open);
                    if (!open) {
                        setFieldPickerSearch("");
                        fieldInsertIndexRef.current = null;
                        setFieldPickerAnchorPos(null);
                    }
                }}
            >
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        aria-hidden
                        className="fixed left-1/2 top-1/2 h-0 w-0 -translate-x-1/2 -translate-y-1/2 opacity-0 pointer-events-none"
                    />
                </PopoverTrigger>
                <PopoverAnchor asChild>
                    <span
                        aria-hidden
                        className="fixed h-0 w-0"
                        style={{
                            left: fieldPickerAnchorPos?.left ?? 0,
                            top: fieldPickerAnchorPos?.top ?? 0,
                        }}
                    />
                </PopoverAnchor>
                <PopoverContent
                    side="right"
                    align="start"
                    sideOffset={8}
                    collisionPadding={16}
                    className="w-[320px] p-0 font-sans shadow-xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200 z-50"
                >
                    {/* Search bar */}
                    <div className="p-3 border-b border-zinc-100 bg-zinc-50/50">
                        <div className="flex h-9 items-center rounded-md border border-zinc-200 bg-white px-3 shadow-sm">
                            <Search className="h-4 w-4 shrink-0 text-zinc-400" />
                            <Input
                                variant="ghost"
                                value={fieldPickerSearch}
                                onChange={(e) => setFieldPickerSearch(e.target.value)}
                                placeholder="Search field types..."
                                className="h-full bg-transparent pl-2 pr-0 focus:outline-none focus:ring-0 focus-visible:ring-0"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="max-h-[420px] overflow-y-auto p-1.5 scrollbar-thin" onWheel={(e) => e.stopPropagation()}>
                        {/* Task properties section */}
                        {filteredPickerTaskPresets.length > 0 && (
                            <>
                                <p className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                                    Task property
                                </p>
                                {filteredPickerTaskPresets.map((preset) => {
                                    const Icon = preset.icon;
                                    return (
                                        <button
                                            key={preset.key}
                                            type="button"
                                            onClick={() => { addTaskPreset(preset.key); setFieldPickerOpen(false); }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-100 transition-colors text-left cursor-pointer group"
                                        >
                                            <div className="h-8 w-8 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:border-zinc-200 shadow-sm transition-all text-zinc-500">
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <span className="text-[13px] font-medium text-zinc-700 flex-1">{preset.label}</span>
                                        </button>
                                    );
                                })}
                                <div className="my-1.5 h-px bg-zinc-100 mx-2" />
                            </>
                        )}

                        {/* Custom field types with flyout */}
                        {filteredPickerFieldTypes.length > 0 && (
                            <>
                                <p className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                                    Field type
                                </p>
                                {filteredPickerFieldTypes.map((ft) => {
                                    const matchingExisting = (customFields as any[]).filter(
                                        (f: any) => DB_TYPE_TO_FIELD_TYPE[f.type] === ft.type
                                    );
                                    return (
                                        <FormViewFieldTypeRow
                                            key={ft.type}
                                            type={ft.type}
                                            icon={ft.icon}
                                            label={ft.label}
                                            existingFields={matchingExisting}
                                            onCreateNew={(el) => {
                                                if (ft.type === 'block') {
                                                    addField('block', el);
                                                    setFieldPickerOpen(false);
                                                } else {
                                                    addField(ft.type, el);
                                                }
                                            }}
                                            onAddExisting={(field: any) => {
                                                // Map an existing custom field directly
                                                const newFormField: FormField = {
                                                    id: `${Date.now()}-${ft.type}`,
                                                    customFieldTitle: field.name,
                                                    type: ft.type,
                                                    label: field.name,
                                                    description: field.config?.description ?? undefined,
                                                    required: false,
                                                    placeholder: '',
                                                    options: field.config?.options,
                                                    customFieldId: field.id,
                                                    customFieldType: field.type,
                                                    customFieldConfig: field.config,
                                                };
                                                setFields((prev) => {
                                                    const raw = fieldInsertIndexRef.current;
                                                    fieldInsertIndexRef.current = null;
                                                    const idx = raw === null ? prev.length : Math.max(0, Math.min(raw, prev.length));
                                                    const next = [...prev];
                                                    next.splice(idx, 0, newFormField);
                                                    return next;
                                                });
                                                setHasUnsavedChanges(true);
                                                setFieldPickerOpen(false);
                                            }}
                                        />
                                    );
                                })}
                            </>
                        )}

                        {filteredPickerTaskPresets.length === 0 && filteredPickerFieldTypes.length === 0 && (
                            <div className="px-3 py-8 text-center text-zinc-400 text-[13px]">
                                No matching field types.
                            </div>
                        )}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}

// Helper function for preview mode
function renderPreviewField(
    field: FormField,
    ctx?: {
        previewMode?: boolean;
        previewValues?: Record<string, any>;
        onPreviewValueChange?: (fieldId: string, value: any) => void;
        workspaceMembers?: Array<{ id: string; name: string; image?: string | null; email?: string | null; type?: string }>;
        agents?: Array<{ id: string; name: string; image?: string | null; type?: string }>;
        listStatuses?: Array<{ id: string; name: string; color?: string }>;
        customField?: any;
    }
) {
    const previewMode = ctx?.previewMode ?? true;
    const previewValue = ctx?.previewValues?.[field.id];
    const setPreviewValue = (value: any) => ctx?.onPreviewValueChange?.(field.id, value);
    const baseClasses = "bg-white border-zinc-200";

    if (field.taskFieldKey === "assignee") {
        return (
            <AssigneeSelector
                users={ctx?.workspaceMembers || []}
                agents={ctx?.agents || []}
                value={Array.isArray(previewValue) ? previewValue : []}
                onChange={(ids) => {
                    if (!previewMode) return;
                    setPreviewValue(ids);
                }}
                variant="compact"
                hidePopover={!previewMode}
                trigger={
                    <div className="min-h-[36px] rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-600 bg-white">
                        {Array.isArray(previewValue) && previewValue.length > 0 ? `${previewValue.length} selected` : "Select assignee"}
                    </div>
                }
            />
        );
    }
    if (field.taskFieldKey === "status") {
        const statuses = ctx?.listStatuses || [];
        const selected = statuses.find((s) => s.id === previewValue);
        if (!previewMode) {
            return (
                <div className="flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-700">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: selected?.color || "#a1a1aa" }} />
                    <span>{selected?.name || "Select status"}</span>
                </div>
            );
        }
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button type="button" className="w-full flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-700 cursor-pointer">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: selected?.color || "#a1a1aa" }} />
                        <span>{selected?.name || "Select status"}</span>
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    {statuses.length > 0 ? statuses.map((s) => (
                        <DropdownMenuItem key={s.id} onClick={() => setPreviewValue(s.id)}>
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color || "#94A3B8" }} />
                                <span>{s.name}</span>
                            </div>
                        </DropdownMenuItem>
                    )) : <DropdownMenuItem disabled>No statuses available</DropdownMenuItem>}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }
    if (field.taskFieldKey === "priority") {
        const options = [
            { value: "URGENT", label: "Urgent", className: "text-red-600" },
            { value: "HIGH", label: "High", className: "text-orange-600" },
            { value: "NORMAL", label: "Normal", className: "text-blue-600" },
            { value: "LOW", label: "Low", className: "text-zinc-600" },
        ];
        const selected = options.find((o) => o.value === previewValue);
        if (!previewMode) return <div className="rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-700">{selected?.label || "Select priority"}</div>;
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button type="button" className="w-full rounded-md border border-zinc-200 px-3 py-2 text-left text-sm text-zinc-700 cursor-pointer">
                        {selected?.label || "Select priority"}
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    {options.map((o) => (
                        <DropdownMenuItem key={o.value} onClick={() => setPreviewValue(o.value)}>
                            <span className={o.className}>{o.label}</span>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }
    if (field.taskFieldKey === "startDate" || field.taskFieldKey === "dueDate") {
        const selectedDate = previewValue ? new Date(previewValue) : undefined;
        if (!previewMode) {
            return <Input value={selectedDate ? selectedDate.toLocaleDateString() : ""} placeholder={field.placeholder || "Select date"} readOnly className={baseClasses} />;
        }
        return (
            <Popover>
                <PopoverTrigger asChild>
                    <button type="button" className="w-full rounded-md border border-zinc-200 px-3 py-2 text-left text-sm text-zinc-700 cursor-pointer bg-white">
                        {selectedDate ? selectedDate.toLocaleDateString() : (field.placeholder || "Select date")}
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <SingleDateCalendar
                        selectedDate={selectedDate}
                        onDateChange={(d) => setPreviewValue(d ? d.toISOString() : null)}
                        showTimeInput={false}
                    />
                </PopoverContent>
            </Popover>
        );
    }

    switch (field.type) {
        case 'textarea':
            return <Textarea placeholder={field.placeholder || "Enter text..."} className={cn(baseClasses, "resize-none h-24")} />;

        case 'date':
        case 'time':
        case 'datetime':
            return (
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input placeholder={field.placeholder || `Select ${field.type}`} className={cn(baseClasses, "pl-9")} />
                </div>
            );

        case 'email':
            return (
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input type="email" placeholder={field.placeholder || "email@example.com"} className={cn(baseClasses, "pl-9")} />
                </div>
            );

        case 'phone':
            return (
                <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input type="tel" placeholder={field.placeholder || "+1 (555) 000-0000"} className={cn(baseClasses, "pl-9")} />
                </div>
            );

        case 'url':
            return (
                <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input type="url" placeholder={field.placeholder || "https://example.com"} className={cn(baseClasses, "pl-9")} />
                </div>
            );

        case 'number':
        case 'currency':
        case 'percentage':
            const icon = field.type === 'currency' ? DollarSign : field.type === 'percentage' ? Percent : Hash;
            const IconComponent = icon;
            return (
                <div className="relative">
                    <IconComponent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input type="number" placeholder={field.placeholder || "0"} className={cn(baseClasses, "pl-9")} />
                </div>
            );

        case 'select':
            return (
                <div className="relative">
                    <select className={cn(baseClasses, "w-full h-10 px-3 rounded-md border appearance-none pr-8")}>
                        <option>{field.placeholder || "Select an option"}</option>
                        {field.options?.map((opt, i) => <option key={i}>{opt}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                </div>
            );

        case 'multiselect':
            return (
                <div className={cn(baseClasses, "p-2 rounded-md border min-h-[40px]")}>
                    <span className="text-sm text-zinc-400">{field.placeholder || "Select multiple options"}</span>
                </div>
            );

        case 'radio':
            return (
                <div className="space-y-2">
                    {(field.options || ['Option 1', 'Option 2']).map((opt, i) => (
                        <label key={i} className="flex items-center gap-2 cursor-pointer hover:bg-zinc-50 p-2 rounded">
                            <input type="radio" name={field.id} className="h-4 w-4 text-indigo-600" />
                            <span className="text-sm text-zinc-700">{opt}</span>
                        </label>
                    ))}
                </div>
            );

        case 'checkbox':
            return (
                <div className="space-y-2">
                    {(field.options || ['Option 1', 'Option 2']).map((opt, i) => (
                        <label key={i} className="flex items-center gap-2 cursor-pointer hover:bg-zinc-50 p-2 rounded">
                            <input type="checkbox" className="h-4 w-4 text-indigo-600 rounded" />
                            <span className="text-sm text-zinc-700">{opt}</span>
                        </label>
                    ))}
                </div>
            );

        case 'rating':
            return (
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <button key={i} className="hover:scale-110 transition-transform">
                            <Star className="h-7 w-7 text-zinc-300 hover:text-yellow-400 hover:fill-yellow-400 transition-colors" />
                        </button>
                    ))}
                </div>
            );

        case 'file':
            return (
                <div className={cn(baseClasses, "p-6 rounded-md border-2 border-dashed text-center hover:border-indigo-300 hover:bg-indigo-50/50 transition-all cursor-pointer")}>
                    <Upload className="h-10 w-10 text-zinc-400 mx-auto mb-2" />
                    <p className="text-sm text-zinc-600 font-medium">Click to upload or drag and drop</p>
                    <p className="text-xs text-zinc-400 mt-1">PDF, PNG, JPG up to 10MB</p>
                </div>
            );

        case 'user':
            return (
                <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input placeholder={field.placeholder || "Assign to user"} className={cn(baseClasses, "pl-9")} />
                </div>
            );

        case 'tags':
            return (
                <div className={cn(baseClasses, "p-2 rounded-md border min-h-[40px]")}>
                    <Input placeholder={field.placeholder || "Add tags"} className="border-none shadow-none h-7 p-0 focus-visible:ring-0" />
                </div>
            );

        case 'progress':
            return (
                <div className="space-y-2">
                    <input
                        type="range"
                        min={0}
                        max={100}
                        defaultValue={50}
                        className="w-full accent-indigo-600"
                    />
                    <div className="flex justify-between text-xs text-zinc-500">
                        <span>0%</span>
                        <span>100%</span>
                    </div>
                </div>
            );

        case 'voting':
            return (
                <div className="space-y-2">
                    {(field.options || ['Option A', 'Option B']).map((opt, i) => (
                        <label
                            key={i}
                            className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2.5 cursor-pointer hover:bg-zinc-50"
                        >
                            <span className="text-sm text-zinc-800">{opt}</span>
                            <input type="radio" name={`vote-${field.id}`} className="h-4 w-4 text-indigo-600" />
                        </label>
                    ))}
                </div>
            );

        case 'location':
            return (
                <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input placeholder={field.placeholder || "Address, city, or place"} className={cn(baseClasses, "pl-9")} />
                </div>
            );

        case 'signature':
            return (
                <div
                    className={cn(
                        baseClasses,
                        "h-32 rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-crosshair hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
                    )}
                >
                    <PenLine className="h-7 w-7 text-zinc-400" />
                    <span className="text-xs text-zinc-500">Draw your signature</span>
                </div>
            );

        case 'block':
            return (
                <div className="rounded-md border border-zinc-200 bg-zinc-50/90 p-4 text-left">
                    {field.content?.trim() ? (
                        <div
                            className="prose prose-sm max-w-none text-zinc-800"
                            dangerouslySetInnerHTML={{ __html: field.content }}
                        />
                    ) : (
                        <p className="text-sm text-zinc-800">—</p>
                    )}
                </div>
            );

        default:
            return <Input placeholder={field.placeholder || `Enter ${field.label}...`} className={baseClasses} />;
    }
}
