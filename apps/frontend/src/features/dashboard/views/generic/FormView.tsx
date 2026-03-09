"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Plus,
    Settings,
    Share2,
    Eye,
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
    Upload,
    Copy,
    MoreVertical,
    ChevronDown,
    X,
    AlertCircle,
    CheckCircle2
} from "lucide-react";
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
    type: 'text' | 'textarea' | 'number' | 'email' | 'phone' | 'url' | 'date' | 'time' | 'datetime' | 'select' | 'multiselect' | 'radio' | 'checkbox' | 'file' | 'rating' | 'currency' | 'percentage' | 'user' | 'tags';
    label: string;
    placeholder?: string;
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
}

interface FormSettings {
    submitButtonText: string;
    successMessage: string;
    allowMultipleSubmissions: boolean;
    showProgressBar: boolean;
    notifyOnSubmit: boolean;
    notificationEmail?: string;
    requireAuth: boolean;
}

// Enhanced Sortable Field Component
function SortableField({ field, onDelete, onUpdate, onDuplicate, allFields }: {
    field: FormField;
    onDelete: (id: string) => void;
    onUpdate: (id: string, updates: Partial<FormField>) => void;
    onDuplicate: (id: string) => void;
    allFields: FormField[];
}) {
    const [showSettings, setShowSettings] = useState(false);
    const [editingOptions, setEditingOptions] = useState(false);

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

    const hasOptions = ['select', 'multiselect', 'radio', 'checkbox'].includes(field.type);

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
                            {field.options?.map((opt, i) => <option key={i}>{opt}</option>)}
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
                        {(field.options || ['Option 1', 'Option 2']).map((opt, i) => (
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
                        {(field.options || ['Option 1', 'Option 2']).map((opt, i) => (
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

            default:
                return <Input disabled placeholder={field.placeholder || `Enter ${field.label}...`} className={baseClasses} />;
        }
    };

    return (
        <div ref={setNodeRef} style={style} className={cn(
            "group relative bg-white p-5 rounded-lg border transition-all",
            isDragging ? "shadow-lg scale-[1.02] border-indigo-500 ring-2 ring-indigo-200" : "border-zinc-200 hover:border-indigo-300 hover:shadow-sm"
        )}>
            {/* Top Actions Bar */}
            <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-2 mr-2 bg-white px-2 py-1 rounded border border-zinc-200">
                    <Label htmlFor={`req-${field.id}`} className="text-xs text-zinc-600 font-medium cursor-pointer">Required</Label>
                    <Switch
                        id={`req-${field.id}`}
                        checked={field.required}
                        onCheckedChange={(checked) => onUpdate(field.id, { required: checked })}
                        className="scale-75"
                    />
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-indigo-600" onClick={() => setShowSettings(!showSettings)}>
                    <Settings className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-indigo-600" onClick={() => onDuplicate(field.id)}>
                    <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-500" onClick={() => onDelete(field.id)}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            {/* Drag Handle */}
            <div className="absolute left-3 top-5 cursor-grab active:cursor-grabbing text-zinc-300 hover:text-zinc-500 p-1" {...attributes} {...listeners}>
                <GripVertical className="h-5 w-5" />
            </div>

            <div className="pl-10 pr-24">
                {/* Field Label */}
                <div className="mb-3">
                    <Input
                        value={field.label}
                        onChange={(e) => onUpdate(field.id, { label: e.target.value })}
                        className="font-semibold text-zinc-900 border-none px-2 h-auto shadow-none focus-visible:ring-1 focus-visible:ring-indigo-200 placeholder:text-zinc-400 focus-visible:bg-zinc-50 -ml-2 rounded text-base"
                        placeholder="Field Label"
                    />
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                </div>

                {/* Field Description */}
                {(field.description || showSettings) && (
                    <Input
                        value={field.description || ""}
                        onChange={(e) => onUpdate(field.id, { description: e.target.value })}
                        className="mb-3 text-sm h-7 border-none text-zinc-500 shadow-none px-2 -ml-2 focus-visible:ring-1 focus-visible:ring-indigo-200 placeholder:text-zinc-300 focus-visible:bg-zinc-50"
                        placeholder="Add a description to help users fill this field..."
                    />
                )}

                {/* Field Preview */}
                {renderFieldPreview()}

                {/* Placeholder/Helper Text */}
                <Input
                    value={field.placeholder || ""}
                    onChange={(e) => onUpdate(field.id, { placeholder: e.target.value })}
                    className="mt-2 text-xs h-6 border-none text-zinc-400 shadow-none px-2 -ml-2 focus-visible:ring-1 focus-visible:ring-indigo-200 placeholder:text-zinc-300"
                    placeholder="Placeholder text..."
                />

                {/* Options Editor for Select/Radio/Checkbox */}
                {hasOptions && (
                    <div className="mt-4 pt-4 border-t border-zinc-100">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-zinc-600">Options</span>
                            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={addOption}>
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
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-red-500"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Advanced Settings Panel */}
                {showSettings && (
                    <div className="mt-4 pt-4 border-t border-zinc-100 space-y-3">
                        <div className="text-xs font-medium text-zinc-600 mb-2">Advanced Settings</div>

                        {/* Validation Rules */}
                        {['number', 'currency', 'percentage', 'text'].includes(field.type) && (
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-xs text-zinc-500">Min Value</Label>
                                    <Input
                                        type="number"
                                        className="h-8 text-sm mt-1"
                                        placeholder="0"
                                        value={field.validation?.min || ''}
                                        onChange={(e) => onUpdate(field.id, {
                                            validation: { ...field.validation, min: parseFloat(e.target.value) }
                                        })}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-zinc-500">Max Value</Label>
                                    <Input
                                        type="number"
                                        className="h-8 text-sm mt-1"
                                        placeholder="100"
                                        value={field.validation?.max || ''}
                                        onChange={(e) => onUpdate(field.id, {
                                            validation: { ...field.validation, max: parseFloat(e.target.value) }
                                        })}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Default Value */}
                        <div>
                            <Label className="text-xs text-zinc-500">Default Value</Label>
                            <Input
                                className="h-8 text-sm mt-1"
                                placeholder="Set default value..."
                                value={field.defaultValue || ''}
                                onChange={(e) => onUpdate(field.id, { defaultValue: e.target.value })}
                            />
                        </div>

                        {/* Conditional Logic */}
                        <div>
                            <Label className="text-xs text-zinc-500">Show only if...</Label>
                            <select className="w-full h-8 text-sm mt-1 px-2 border border-zinc-200 rounded-md bg-white">
                                <option value="">Always show</option>
                                {allFields.filter(f => f.id !== field.id).map(f => (
                                    <option key={f.id} value={f.id}>{f.label} is filled</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

interface FormViewProps {
    spaceId?: string;
    projectId?: string;
    teamId?: string;
    viewId?: string;
    initialConfig?: any;
}

export default function FormView({ spaceId, projectId, teamId, viewId, initialConfig }: FormViewProps) {
    const [title, setTitle] = useState("New Task Request Form");
    const [description, setDescription] = useState("Please fill out this form to create a new task in our workspace.");
    const [coverImage, setCoverImage] = useState("gradient");
    const [previewMode, setPreviewMode] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const [fields, setFields] = useState<FormField[]>([
        { id: "1", type: "text", label: "Task Name", required: true, placeholder: "Enter task name", description: "Give your task a clear, descriptive name" },
        { id: "2", type: "textarea", label: "Description", required: false, placeholder: "Describe the task in detail...", description: "Provide any relevant details, requirements, or context" },
        { id: "3", type: "select", label: "Priority", required: true, options: ["Low", "Medium", "High", "Urgent"], description: "How urgent is this task?" },
        { id: "4", type: "date", label: "Due Date", required: true, placeholder: "Select date" },
    ]);

    const [settings, setSettings] = useState<FormSettings>({
        submitButtonText: "Submit Request",
        successMessage: "Thank you! Your form has been submitted successfully.",
        allowMultipleSubmissions: true,
        showProgressBar: true,
        notifyOnSubmit: true,
        notificationEmail: "",
        requireAuth: false
    });

    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const fieldTypes = [
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
    ];

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

    const addField = (type: FormField['type']) => {
        const newField: FormField = {
            id: Date.now().toString(),
            type,
            label: `New ${fieldTypes.find(f => f.type === type)?.label || 'Field'}`,
            required: false,
            placeholder: "",
            options: ['select', 'multiselect', 'radio', 'checkbox'].includes(type) ? ['Option 1', 'Option 2', 'Option 3'] : undefined
        };
        setFields([...fields, newField]);
        setHasUnsavedChanges(true);
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

    const saveForm = () => {
        // Simulate save
        setHasUnsavedChanges(false);
        // In real implementation: updateMutation.mutate(...)
    };

    return (
        <div className="h-screen flex flex-col bg-slate-50">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-zinc-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center text-white shadow-md">
                        <CheckSquare className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
                        <p className="text-xs text-zinc-500">Form Builder · {fields.length} fields</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewMode(!previewMode)}
                        className={cn(previewMode && "bg-indigo-50 text-indigo-600 border-indigo-200")}
                    >
                        <Eye className="h-4 w-4 mr-2" />
                        {previewMode ? "Edit Mode" : "Preview"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)}>
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                    </Button>
                    {hasUnsavedChanges && (
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700"
                            size="sm"
                            onClick={saveForm}
                        >
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                        </Button>
                    )}
                    <Button className={cn("bg-green-600 hover:bg-green-700", hasUnsavedChanges && "opacity-50")} size="sm" disabled={hasUnsavedChanges}>
                        <Share2 className="h-4 w-4 mr-2" />
                        Publish
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex">
                {/* Sidebar - Field Types */}
                {!previewMode && (
                    <div className="w-72 bg-white border-r border-zinc-200 flex flex-col overflow-y-auto">
                        <div className="p-4 border-b border-zinc-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                            <h3 className="font-semibold text-sm text-zinc-800 mb-1">Add Form Fields</h3>
                            <p className="text-xs text-zinc-500">Drag fields to reorder on canvas</p>
                        </div>
                        <div className="p-4">
                            <div className="space-y-1">
                                {fieldTypes.map((fieldType) => {
                                    const Icon = fieldType.icon;
                                    return (
                                        <Button
                                            key={fieldType.type}
                                            variant="outline"
                                            className="w-full justify-start text-zinc-700 h-10 font-normal hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 transition-all group"
                                            onClick={() => addField(fieldType.type as FormField['type'])}
                                        >
                                            <Icon className="h-4 w-4 mr-3 text-zinc-400 group-hover:text-indigo-600" />
                                            {fieldType.label}
                                            <Plus className="h-3.5 w-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mt-auto p-4 border-t border-zinc-100 bg-zinc-50/50">
                            <div className="flex items-start gap-2 text-xs text-zinc-500">
                                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-medium text-zinc-700 mb-1">Pro Tips</p>
                                    <ul className="space-y-1 list-disc list-inside">
                                        <li>Drag fields to reorder</li>
                                        <li>Click settings for validation</li>
                                        <li>Use conditional logic</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Canvas */}
                <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 to-zinc-100">
                    <div className="min-h-full p-8 flex justify-center">
                        <div className="w-full max-w-3xl">
                            <div className="bg-white rounded-2xl shadow-lg border border-zinc-200 overflow-hidden">
                                {/* Form Cover */}
                                <div className="h-40 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 relative group">
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-all cursor-pointer">
                                        <span className="opacity-0 group-hover:opacity-100 text-white font-medium flex items-center gap-2 transition-opacity">
                                            <ImageIcon className="h-5 w-5" />
                                            Change Cover Image
                                        </span>
                                    </div>
                                    {settings.showProgressBar && (
                                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                                            <div className="h-full bg-white/60 w-0 transition-all duration-300" style={{ width: '0%' }}></div>
                                        </div>
                                    )}
                                </div>

                                <div className="px-10 py-8 -mt-12 relative z-10">
                                    {/* Form Header Card */}
                                    <div className="bg-white p-8 rounded-xl shadow-md border border-zinc-100 mb-8 text-center hover:shadow-lg transition-shadow">
                                        <input
                                            className="text-3xl font-bold text-center w-full border-none focus:ring-0 p-0 text-zinc-900 placeholder:text-zinc-300 bg-transparent selection:bg-indigo-100 mb-2"
                                            placeholder="Form Title"
                                            value={title}
                                            onChange={(e) => { setTitle(e.target.value); setHasUnsavedChanges(true); }}
                                            disabled={previewMode}
                                        />
                                        <input
                                            className="text-center w-full border-none focus:ring-0 p-0 text-zinc-600 placeholder:text-zinc-300 bg-transparent text-base"
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
                                                <div className="space-y-5 min-h-[200px]">
                                                    {fields.map((field) => (
                                                        <SortableField
                                                            key={field.id}
                                                            field={field}
                                                            onDelete={deleteField}
                                                            onUpdate={updateField}
                                                            onDuplicate={duplicateField}
                                                            allFields={fields}
                                                        />
                                                    ))}

                                                    {fields.length === 0 && (
                                                        <div className="py-16 text-center border-2 border-dashed border-zinc-300 rounded-xl bg-zinc-50/50">
                                                            <CheckSquare className="h-12 w-12 text-zinc-300 mx-auto mb-3" />
                                                            <p className="text-zinc-500 font-medium mb-1">No fields yet</p>
                                                            <p className="text-sm text-zinc-400">Add fields from the sidebar to get started</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </SortableContext>
                                        </DndContext>
                                    ) : (
                                        <div className="space-y-5">
                                            {fields.map((field) => (
                                                <div key={field.id} className="bg-white p-5 rounded-lg border border-zinc-200">
                                                    <Label className="text-sm font-semibold text-zinc-900 mb-1 block">
                                                        {field.label}
                                                        {field.required && <span className="text-red-500 ml-1">*</span>}
                                                    </Label>
                                                    {field.description && (
                                                        <p className="text-xs text-zinc-500 mb-3">{field.description}</p>
                                                    )}
                                                    {renderPreviewField(field)}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Submit Button */}
                                    <div className="mt-8 flex justify-end">
                                        <Button className="bg-indigo-600 hover:bg-indigo-700 px-8" disabled={!previewMode}>
                                            {settings.submitButtonText}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Settings Panel */}
                {showSettings && (
                    <div className="w-96 bg-white border-l border-zinc-200 overflow-y-auto">
                        <div className="p-4 border-b border-zinc-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-sm text-zinc-800">Form Settings</h3>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowSettings(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="p-4 space-y-6">
                            {/* Submit Button */}
                            <div>
                                <Label className="text-sm font-medium text-zinc-700 mb-2 block">Submit Button Text</Label>
                                <Input
                                    value={settings.submitButtonText}
                                    onChange={(e) => {
                                        setSettings({ ...settings, submitButtonText: e.target.value });
                                        setHasUnsavedChanges(true);
                                    }}
                                    placeholder="Submit"
                                    className="h-9"
                                />
                            </div>

                            {/* Success Message */}
                            <div>
                                <Label className="text-sm font-medium text-zinc-700 mb-2 block">Success Message</Label>
                                <Textarea
                                    value={settings.successMessage}
                                    onChange={(e) => {
                                        setSettings({ ...settings, successMessage: e.target.value });
                                        setHasUnsavedChanges(true);
                                    }}
                                    placeholder="Thank you for submitting!"
                                    className="resize-none h-20"
                                />
                            </div>

                            <div className="border-t border-zinc-200 pt-6">
                                <h4 className="text-sm font-medium text-zinc-700 mb-4">Form Behavior</h4>

                                <div className="space-y-4">
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
                                </div>
                            </div>

                            <div className="border-t border-zinc-200 pt-6">
                                <h4 className="text-sm font-medium text-zinc-700 mb-4">Notifications</h4>

                                <div className="space-y-4">
                                    {/* Email Notification */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label className="text-sm text-zinc-700 font-medium">Email on Submit</Label>
                                            <p className="text-xs text-zinc-500 mt-0.5">Get notified of new submissions</p>
                                        </div>
                                        <Switch
                                            checked={settings.notifyOnSubmit}
                                            onCheckedChange={(checked) => {
                                                setSettings({ ...settings, notifyOnSubmit: checked });
                                                setHasUnsavedChanges(true);
                                            }}
                                        />
                                    </div>

                                    {settings.notifyOnSubmit && (
                                        <div>
                                            <Label className="text-xs text-zinc-500 mb-1 block">Notification Email</Label>
                                            <Input
                                                type="email"
                                                value={settings.notificationEmail || ''}
                                                onChange={(e) => {
                                                    setSettings({ ...settings, notificationEmail: e.target.value });
                                                    setHasUnsavedChanges(true);
                                                }}
                                                placeholder="you@example.com"
                                                className="h-9"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="border-t border-zinc-200 pt-6">
                                <h4 className="text-sm font-medium text-zinc-700 mb-3">Share Form</h4>
                                <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200">
                                    <Label className="text-xs text-zinc-500 mb-2 block">Public Form URL</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value="https://app.example.com/f/abc123"
                                            readOnly
                                            className="h-8 text-xs bg-white"
                                        />
                                        <Button variant="outline" size="sm" className="h-8 px-3 flex-shrink-0">
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    // Helper function for preview mode
    function renderPreviewField(field: FormField) {
        const baseClasses = "bg-white border-zinc-200";

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

            default:
                return <Input placeholder={field.placeholder || `Enter ${field.label}...`} className={baseClasses} />;
        }
    }
}
