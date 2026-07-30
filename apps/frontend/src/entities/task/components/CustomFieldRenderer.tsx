'use client';

import { useRouter, useParams } from 'next/navigation';
import { useTaskViewContext } from '@/features/dashboard/hooks/useTaskViewContext';
import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
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
} from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Calendar as CalendarIcon, Star, Users, UserPlus, Search, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { LocationSearchInput } from './LocationSearchInput';
import { MultiFileUpload } from "@/components/ui/files-upload";
import { DescriptionEditor } from '@/entities/shared/components/DescriptionEditor';

interface CustomFieldRendererProps {
    field: any;
    value: any;
    onChange: (value: any) => void;
    disabled?: boolean;
    hideLabel?: boolean;
    // Context props — pass whatever is available; the component resolves workspace members from these
    workspaceId?: string;
    spaceId?: string;
    projectId?: string;
    folderId?: string;
    teamId?: string;
    listId?: string;
    taskId?: string;
}

function SignatureField({ value, onChange, disabled }: { value: any; onChange: (v: any) => void; disabled?: boolean }) {
    const [open, setOpen] = React.useState(false);
    const [draft, setDraft] = React.useState(value || '');

    React.useEffect(() => {
        if (open) {
            setDraft(value || '');
        }
    }, [open, value]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "h-[38px] px-2 w-full justify-start font-normal bg-white hover:bg-zinc-50 border-0 shadow-none focus-visible:ring-0 overflow-hidden",
                        !value && "text-zinc-500"
                    )}
                    disabled={disabled}
                >
                    {value ? (
                        <span className="text-xl leading-none" style={{ fontFamily: 'cursive' }}>{value}</span>
                    ) : (
                        <span className="text-sm">Sign here...</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-2 shadow-md border-zinc-200 rounded-xl" align="start" onClick={(e) => e.stopPropagation()}>
                <div
                    className="w-full h-32 mb-2 rounded-md border border-zinc-200 relative overflow-hidden flex items-center justify-center bg-white"
                    style={{
                        backgroundImage: 'linear-gradient(#f4f4f5 1px, transparent 1px), linear-gradient(90deg, #f4f4f5 1px, transparent 1px)',
                        backgroundSize: '20px 20px',
                        backgroundPosition: 'center center'
                    }}
                >
                    <input
                        autoFocus
                        type="text"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        className="w-full h-full text-center bg-transparent outline-none text-3xl text-zinc-800"
                        style={{ fontFamily: 'cursive' }}
                    />
                </div>
                <div className="flex items-center justify-between">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDraft('')}
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 h-[38px] font-medium rounded-lg px-4"
                    >
                        Clear
                    </Button>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setOpen(false)}
                            className="h-[38px] bg-zinc-100 text-zinc-600 hover:bg-zinc-200 font-medium rounded-lg px-4"
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => {
                                onChange(draft);
                                setOpen(false);
                            }}
                            className="h-[38px] bg-zinc-900 text-white hover:bg-zinc-800 font-medium rounded-lg px-4"
                        >
                            Save
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

function DebouncedInput({ value, onChange, placeholder, disabled, type = 'text', min, max, step, className }: any) {
    const [draft, setDraft] = React.useState(value ?? '');
    React.useEffect(() => { setDraft(value ?? ''); }, [value]);

    return (
        <Input
            variant="ghost"
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
                const newValue = type === 'number' && draft !== '' ? Number(draft) : draft;
                if (newValue !== (value ?? '')) {
                    onChange(draft === '' && type === 'number' ? null : newValue);
                }
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.currentTarget.blur();
                }
            }}
            placeholder="—"
            disabled={disabled}
            className={cn("w-full rounded-sm border-0 p-0 shadow-none focus-visible:ring-0 text-xs bg-transparent focus:outline-none focus:ring-0 focus-visible:ring-0", className)}
            min={min}
            max={max}
            step={step}
        />
    );
}

function DebouncedTextarea({ value, onChange, placeholder, disabled, className }: any) {
    const [draft, setDraft] = React.useState(value ?? '');
    React.useEffect(() => { setDraft(value ?? ''); }, [value]);

    return (
        <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => { if (draft !== (value ?? '')) onChange(draft); }}
            disabled={disabled}
            placeholder="—"
            className={cn("w-full rounded-sm border-0 p-0 shadow-none focus-visible:ring-0 text-xs bg-transparent focus:outline-none focus:ring-0 focus-visible:ring-0", className)}
        />
    );
}

export function CustomFieldRenderer({
    field,
    value,
    onChange,
    disabled = false,
    hideLabel = false,
    workspaceId: workspaceIdProp,
    spaceId,
    projectId,
    folderId,
    teamId,
    listId,
    taskId,
}: CustomFieldRendererProps) {
    const router = useRouter();
    const params = useParams();

    // Prefer explicit props, fall back to route params for convenience
    const resolvedSpaceId = spaceId || (params?.spaceId as string);
    const resolvedProjectId = projectId || (params?.projectId as string);
    const resolvedTeamId = teamId || (params?.teamId as string);
    // For list/folder context we pass listId; useTaskViewContext resolves the chain up to workspaceId
    const resolvedListId = listId || (params?.listId as string);
    const resolvedWorkspaceIdProp = workspaceIdProp || (params?.workspaceId as string);

    const {
        resolvedWorkspaceId,
        space,
        workspaceMembers: workspaceMembersFromWorkspace,
        projectParticipants,
        teamParticipants,
        currentUser
    } = useTaskViewContext({
        workspaceId: resolvedWorkspaceIdProp,
        spaceId: resolvedSpaceId,
        projectId: resolvedProjectId,
        listId: resolvedListId,
        teamId: resolvedTeamId,
    });

    // Build a unified member list scoped to the most specific context available:
    //  project > team > space (own members) > workspace
    const workspaceMembersData = React.useMemo(() => {
        // Project context — use project participants
        if (resolvedProjectId && projectParticipants?.users?.length) {
            return projectParticipants.users.map((u: any) => ({ user: u }));
        }
        // Team context — use team members
        if (resolvedTeamId && teamParticipants?.users?.length) {
            return teamParticipants.users.map((u: any) => ({ user: u }));
        }
        // Space context — spaces can have their own member list distinct from the workspace
        if (resolvedSpaceId && (space as any)?.members?.length) {
            return (space as any).members.map((m: any) => ({ user: m.user }));
        }
        // Workspace / list / folder fallback
        return workspaceMembersFromWorkspace;
    }, [resolvedProjectId, projectParticipants, resolvedTeamId, teamParticipants, resolvedSpaceId, space, workspaceMembersFromWorkspace]);

    const workspaceId = resolvedWorkspaceId || (field as any).workspaceId;

    const effectiveType = (field.config as { fieldType?: string } | null)?.fieldType ?? field.type;
    const renderField = () => {
        switch (effectiveType) {
            case 'TEXT':
                return (
                    <DebouncedInput
                        value={value}
                        onChange={onChange}
                        placeholder={field.config?.placeholder || `Enter ${field.name.toLowerCase()}...`}
                        disabled={disabled}
                        className="h-[38px] text-sm"
                    />
                );

            case 'NUMBER':
                return (
                    <DebouncedInput
                        type="number"
                        value={value}
                        onChange={onChange}
                        placeholder={field.config?.placeholder || '0'}
                        disabled={disabled}
                        className="h-[38px] text-sm"
                        min={field.config?.min}
                        max={field.config?.max}
                    />
                );

            /* DROPDOWN merged into CUSTOM_DROPDOWN below */

            case 'DATE':
                return (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "h-[38px] w-full justify-start text-left font-normal text-sm border-0 shadow-none focus-visible:ring-0",
                                    !value && "text-muted-foreground"
                                )}
                                disabled={disabled}
                            >
                                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                {value ? format(new Date(value), 'PPP') : <span>-</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={value ? new Date(value) : undefined}
                                onSelect={(date) => onChange(date?.toISOString())}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                );

            case 'CHECKBOX':
                return (
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            checked={value || false}
                            onCheckedChange={onChange}
                            disabled={disabled}
                        />
                        <label className="text-sm text-zinc-600">
                            {field.config?.label || 'Enabled'}
                        </label>
                    </div>
                );

            case 'URL':
                return (
                    <DebouncedInput
                        type="url"
                        value={value}
                        onChange={onChange}
                        placeholder="https://example.com"
                        disabled={disabled}
                        className="h-[38px] text-sm"
                    />
                );

            case 'EMAIL':
                return (
                    <DebouncedInput
                        type="email"
                        value={value}
                        onChange={onChange}
                        placeholder="email@example.com"
                        disabled={disabled}
                        className="h-[38px] text-sm"
                    />
                );

            case 'PHONE':
                return (
                    <DebouncedInput
                        type="tel"
                        value={value}
                        onChange={onChange}
                        placeholder="+1 (555) 000-0000"
                        disabled={disabled}
                        className="h-[38px] text-sm"
                    />
                );

            case 'TEXT_AREA':
            case 'LONG_TEXT': {
                const placeholder = field.config?.placeholder || `Enter ${field.name.toLowerCase()}...`;
                const plainText = typeof value === 'string' ? value.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim() : '';
                return (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "h-[38px] w-full justify-start items-center text-left font-normal text-sm border-0 shadow-none focus-visible:ring-0 whitespace-nowrap overflow-hidden py-2 px-3",
                                    !value && "text-zinc-400"
                                )}
                                disabled={disabled}
                            >
                                {value ? (
                                    <span className="line-clamp-1 w-full text-zinc-800">{plainText || 'View content'}</span>
                                ) : (
                                    "-"
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[500px] p-0 shadow-xl border-zinc-200" align="start">
                            <DescriptionEditor
                                content={value || ''}
                                onChange={onChange}
                                editable={!disabled}
                                minHeight={150}
                                maxHeight={400}
                                spaceId={resolvedSpaceId}
                                workspaceId={workspaceId}
                                projectId={resolvedProjectId}
                            />
                        </PopoverContent>
                    </Popover>
                );
            }

            case 'SUMMARY':
            case 'PROGRESS_UPDATES':
            case 'TRANSLATION':
                return (
                    <DebouncedTextarea
                        value={value}
                        onChange={onChange}
                        placeholder={field.config?.placeholder || `Enter ${field.name.toLowerCase()}...`}
                        disabled={disabled}
                        className="min-h-[38px] h-[38px] text-sm resize-y"
                    />
                );

            case 'CUSTOM_TEXT':
                return (
                    <DebouncedInput
                        value={value}
                        onChange={onChange}
                        placeholder={field.config?.placeholder || `Enter ${field.name.toLowerCase()}...`}
                        disabled={disabled}
                        className="h-[38px] text-sm"
                    />
                );

            case 'DROPDOWN':
            case 'CUSTOM_DROPDOWN':
            case 'CATEGORIZE':
            case 'LABELS':
            case 'TSHIRT_SIZE': {
                const isTShirt = field.type === 'TSHIRT_SIZE';
                const dropdownOptions = field.config?.options?.length
                    ? field.config.options
                    : isTShirt
                        ? [
                            { id: 'xs', name: 'XS', color: '#e5e7eb' },
                            { id: 's', name: 'S', color: '#e5e7eb' },
                            { id: 'm', name: 'M', color: '#e5e7eb' },
                            { id: 'l', name: 'L', color: '#e5e7eb' },
                            { id: 'xl', name: 'XL', color: '#e5e7eb' }
                        ]
                        : [];

                return (
                    <Select
                        value={value || ''}
                        onValueChange={onChange}
                        disabled={disabled}
                    >
                        <SelectTrigger className="rounded-sm h-[38px] text-sm border-0 shadow-none focus:ring-0 focus:ring-offset-0">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {dropdownOptions.map((option: any) => {
                                const optName = option.name || option.label || option.value;
                                const optValue = option.value || option.name || option.label;
                                return (
                                    <SelectItem key={option.id || optValue} value={optValue}>
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: option.color || '#e5e7eb' }} />
                                            <span className="truncate">{optName}</span>
                                        </div>
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                );
            }

            case 'MONEY': {
                const currencyCode = field.config?.currency || 'USD';
                const symbol = (0).toLocaleString('en-US', { style: 'currency', currency: currencyCode, minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/[\d.,]/g, '').trim() || '$';
                return (
                    <div className="relative flex items-center">
                        <span className="absolute left-3 text-sm text-muted-foreground">{symbol}</span>
                        <DebouncedInput
                            type="number"
                            value={value}
                            onChange={onChange}
                            placeholder="0.00"
                            disabled={disabled}
                            className="h-[38px] text-sm pl-7"
                            min={field.config?.min}
                            max={field.config?.max}
                            step={0.01}
                        />
                    </div>
                );
            }

            case 'FORMULA':
                return (
                    <DebouncedInput
                        value={value}
                        onChange={onChange}
                        placeholder={field.config?.placeholder || '= expression'}
                        disabled={disabled ?? field.config?.readOnly}
                        className="h-[38px] text-sm font-mono"
                    />
                );

            case 'FILES':
                return (
                    <div className={cn("space-y-2", disabled && "pointer-events-none opacity-50")}>
                        <MultiFileUpload
                            bucket="tasks"
                            pathPrefix={taskId ? `tasks/${taskId}/fields/${field?.id || 'unknown'}` : `task_fields/${field?.id || 'unknown'}`}
                            initialFiles={Array.isArray(value) ? value : []}
                            onFilesChange={onChange}
                        />
                    </div>
                );

            case 'RELATIONSHIP':
                return (
                    <DebouncedInput
                        value={typeof value === 'string' ? value : value?.label ?? ''}
                        onChange={onChange}
                        placeholder={field.config?.placeholder || 'Link or ID...'}
                        disabled={disabled}
                        className="h-[38px] text-sm"
                    />
                );

            case 'PEOPLE': {
                const peopleList = Array.isArray(value) ? value : (typeof value === 'string' && value ? [{ name: value, id: value }] : []);
                const hasPeople = peopleList.length > 0;

                const settings = field.config?.peopleSettings || {};
                const isMulti = settings.multipleSelect !== false;
                const useEntireWorkspace = settings.entireWorkspace === true;

                const sourceMembers = useEntireWorkspace ? workspaceMembersFromWorkspace : workspaceMembersData;

                const workspaceUsers = (sourceMembers || []).map((m: any) => ({
                    id: m.user.id,
                    name: m.user.name || m.user.email || 'Unknown',
                    initials: (m.user.name || m.user.email || 'U').substring(0, 2).toUpperCase(),
                    image: m.user.image,
                }));

                return (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="h-[38px] px-2 flex items-center justify-start min-w-[70px] bg-white hover:bg-zinc-50 border-0 shadow-none focus-visible:ring-0"
                                disabled={disabled}
                            >
                                {!hasPeople ? (
                                    <UserPlus className="h-4 w-4 text-zinc-400" />
                                ) : (
                                    <div className="flex items-center gap-1">
                                        {peopleList.map((p: any, i: number) => {
                                            const name = p?.name || (typeof p === 'string' ? p : '');
                                            const match = workspaceUsers.find((u: any) => u.id === p?.id || u.name === name);
                                            const initials = match ? match.initials : (name.substring(0, 2).toUpperCase() || 'U');
                                            return (
                                                <Avatar key={i} className="h-5 w-5">
                                                    <AvatarFallback className="bg-slate-600 text-white text-[9px] font-medium">
                                                        {initials}
                                                    </AvatarFallback>
                                                </Avatar>
                                            );
                                        })}
                                    </div>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-2 shadow-md border-zinc-200" align="start" onClick={(e) => e.stopPropagation()}>
                            <div className="mb-2">
                                <div className="flex items-center gap-2 px-3 h-9 bg-white border border-zinc-200 rounded-md focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all overflow-hidden cursor-text">
                                    <Search className="h-4 w-4 text-zinc-400 shrink-0" />
                                    <Input
                                        variant="ghost"
                                        className="flex-1 h-full border-0 p-0 shadow-none focus-visible:ring-0 text-sm bg-transparent placeholder:text-zinc-400 focus:outline-none focus:ring-0 focus-visible:ring-0"
                                        placeholder="Search or enter email..."
                                    />
                                </div>
                            </div>
                            <div className="space-y-0.5">
                                {workspaceUsers.map((user: any) => {
                                    const isSelected = peopleList.some((p: any) => p?.id === user.id || p?.name === user.name || p === user.name);

                                    return (
                                        <div
                                            key={user.id}
                                            className={cn("flex items-center justify-between rounded-sm px-2 py-1.5 cursor-pointer text-zinc-700 group", isSelected ? "bg-zinc-100" : "hover:bg-zinc-100")}
                                            onClick={() => {
                                                if (isSelected) {
                                                    onChange(peopleList.filter((p: any) => p?.id !== user.id && p?.name !== user.name && p !== user.name));
                                                } else {
                                                    if (isMulti) {
                                                        onChange([...peopleList, { id: user.id, name: user.name }]);
                                                    } else {
                                                        onChange([{ id: user.id, name: user.name }]);
                                                    }
                                                }
                                            }}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="relative">
                                                    <Avatar className="h-7 w-7 ring-2 ring-white">
                                                        <AvatarFallback className="bg-slate-600 text-white text-[10px] font-semibold">{user.initials}</AvatarFallback>
                                                    </Avatar>
                                                    {isSelected && (
                                                        <TooltipProvider delayDuration={200}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            onChange(peopleList.filter((p: any) => p?.id !== user.id && p?.name !== user.name && p !== user.name));
                                                                        }}
                                                                        className="absolute -bottom-1 -right-1 bg-red-500 text-white hover:bg-red-600 rounded-full h-4 w-4 flex items-center justify-center transition-all cursor-pointer border-[2px] border-white shadow-sm opacity-0 group-hover:opacity-100"
                                                                    >
                                                                        <X className="h-3 w-3 scale-70 text-white" strokeWidth={3} />
                                                                    </button>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="bg-zinc-900 text-white text-[10px] font-medium px-2 py-1 border-0 rounded-md shadow-md z-50" side="top" sideOffset={4}>
                                                                    Remove person
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                </div>
                                                <span className="text-sm font-medium">{user.name}</span>
                                            </div>
                                            {isSelected && (
                                                <div
                                                    className="rounded border border-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-500 bg-white shadow-sm hover:bg-zinc-50"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        router.push(`/dashboard/profiles/${user.id}`);
                                                    }}
                                                >
                                                    Profile
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </PopoverContent>
                    </Popover>
                );
            }

            case 'PROGRESS_AUTO': {
                const startValue = field.config?.startValue ?? 0;
                const endValue = field.config?.endValue ?? 100;
                const range = endValue - startValue;
                const rawVal = typeof value === 'number' ? value : startValue;
                const percent = range === 0 ? 0 : Math.round(((rawVal - startValue) / range) * 100);
                return (
                    <div className="flex items-center gap-2">
                        <Progress value={percent} className="flex-1 h-2" />
                        <span className="text-xs text-muted-foreground tabular-nums">{percent}%</span>
                    </div>
                );
            }

            case 'PROGRESS_MANUAL': {
                const startValue = field.config?.startValue ?? 0;
                const endValue = field.config?.endValue ?? 100;
                const progressVal = typeof value === 'number' ? value : startValue;
                const range = endValue - startValue;
                const percent = range === 0 ? 0 : Math.round(((progressVal - startValue) / range) * 100);
                return (
                    <div className="flex items-center gap-2">
                        <Slider
                            value={[progressVal]}
                            onValueChange={([v]) => onChange(v)}
                            min={startValue}
                            max={endValue}
                            disabled={disabled}
                            className="w-full"
                        />
                        <span className="text-xs text-muted-foreground tabular-nums w-8">{percent}%</span>
                    </div>
                );
            }

            case 'SENTIMENT': {
                const sentimentOptions = field.config?.options || [
                    { value: 'positive', label: 'Positive' },
                    { value: 'neutral', label: 'Neutral' },
                    { value: 'negative', label: 'Negative' },
                ];
                return (
                    <Select value={value || ''} onValueChange={onChange} disabled={disabled}>
                        <SelectTrigger className="rounded-sm h-[38px] text-sm border-0 shadow-none focus:ring-0 focus:ring-offset-0">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {sentimentOptions.map((option: { value: string; label: string }) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );
            }

            case 'TASKS':
                return (
                    <Textarea
                        value={Array.isArray(value) ? value.map((t: { title?: string }) => t?.title ?? '').join('\n') : value || ''}
                        onChange={(e) => onChange(e.target.value.split('\n').filter(Boolean).map((title) => ({ title })))}
                        disabled={disabled}
                        className="rounded-sm min-h-[38px] h-[38px] text-sm resize-y border-0 shadow-none focus-visible:ring-0"
                    />
                );

            case 'LOCATION':
                return (
                    <LocationSearchInput
                        value={value}
                        onSelect={(loc) => onChange(JSON.stringify(loc))}
                        placeholder="Address or place..."
                        disabled={disabled}
                    />
                );

            case 'RATING': {
                const maxStars = field.config?.ratingScale ?? field.config?.max ?? 5;
                const rating = typeof value === 'number' ? Math.min(maxStars, Math.max(0, value)) : 0;
                const emoji = field.config?.emojiType || '⭐';
                const useStarIcon = emoji === '⭐' || emoji === 'Star' || emoji === 'star';

                return (
                    <div className="flex items-center gap-0.5">
                        {Array.from({ length: maxStars }, (_, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => (disabled ? undefined : onChange(i + 1))}
                                disabled={disabled}
                                className="p-0.5 rounded focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                {useStarIcon ? (
                                    <Star
                                        className={cn('h-5 w-5', i < rating ? 'fill-amber-400 text-amber-500' : 'text-zinc-300')}
                                    />
                                ) : (
                                    <span className={cn('text-lg leading-none', i < rating ? 'opacity-100' : 'opacity-30')} style={{ filter: i < rating ? 'none' : 'grayscale(100%)' }}>
                                        {emoji}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                );
            }

            case 'VOTING': {
                const votedUserIds = Array.isArray(value) ? value.map(v => typeof v === 'string' ? v : (v?.id || '')) : [];
                const voteCount = votedUserIds.length;
                const hasVoted = currentUser ? votedUserIds.includes(currentUser.id) : false;
                const emoji = field.config?.emojiType || '👍';
                const hideVotedUsers = field.config?.hideVotedUsers ?? false;

                const handleToggleVote = (e?: React.MouseEvent) => {
                    e?.stopPropagation();
                    e?.preventDefault();
                    if (!currentUser) return;
                    if (hasVoted) {
                        onChange(votedUserIds.filter(id => id !== currentUser.id));
                    } else {
                        onChange([...votedUserIds, currentUser.id]);
                    }
                };

                const votedMembers = votedUserIds.map(id => {
                    const member = workspaceMembersData?.find(m => m.user.id === id);
                    if (member) {
                        return {
                            id: member.user.id,
                            name: member.user.name || member.user.email || 'Unknown',
                            initials: (member.user.name || member.user.email || 'U').substring(0, 2).toUpperCase(),
                            image: member.user.image
                        };
                    }
                    if (currentUser && id === currentUser.id) {
                        return {
                            id: currentUser.id,
                            name: currentUser.name || currentUser.email || 'Me',
                            initials: (currentUser.name || currentUser.email || 'M').substring(0, 2).toUpperCase(),
                            image: currentUser.image
                        };
                    }
                    return { id, name: 'Unknown', initials: '?' };
                });

                return (
                    <div className="flex items-center gap-1">
                        <Button
                            variant={hasVoted ? "secondary" : "outline"}
                            className={cn("h-[38px] px-2 flex items-center justify-center min-w-[50px] border-0 shadow-none focus-visible:ring-0 transition-colors", hasVoted ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100" : "bg-white hover:bg-zinc-50")}
                            disabled={disabled}
                            onClick={handleToggleVote}
                        >
                            <span className="text-base leading-none">{emoji}</span>
                            <span className="text-sm font-medium ml-1.5">{voteCount}</span>
                        </Button>

                        {!hideVotedUsers && (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="h-[38px] w-8 p-0 flex items-center justify-center bg-white hover:bg-zinc-50 border-0 shadow-none focus-visible:ring-0 text-zinc-500"
                                        disabled={disabled}
                                    >
                                        <Users className="h-3.5 w-3.5" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-56 p-2 shadow-md border-zinc-200" align="start" onClick={(e) => e.stopPropagation()}>
                                    <div className="mb-2 px-2 text-xs font-medium text-zinc-500">
                                        {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
                                    </div>
                                    <div className="space-y-0.5">
                                        {votedMembers.map((user) => (
                                            <div
                                                key={user.id}
                                                className="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-zinc-100 cursor-default text-zinc-700"
                                            >
                                                <Avatar className="h-6 w-6">
                                                    {user.image && <AvatarImage src={user.image} />}
                                                    <AvatarFallback className="bg-zinc-500 text-white text-[10px]">{user.initials}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm">{user.id === currentUser?.id ? 'Me' : user.name}</span>
                                            </div>
                                        ))}
                                        {voteCount === 0 && (
                                            <div className="text-xs text-zinc-400 px-2 py-1">No votes yet.</div>
                                        )}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        )}
                    </div>
                );
            }

            case 'SIGNATURE':
                return (
                    <SignatureField
                        value={value}
                        onChange={onChange}
                        disabled={disabled}
                    />
                );

            case 'BUTTON': {
                const btnName = field.config?.buttonName || field.name || 'Run';
                const btnColor = field.config?.buttonColor || '#52525b';
                const btnEmoji = field.config?.buttonEmoji || '';

                return (
                    <Button
                        type="button"
                        size="sm"
                        className="h-[38px] text-sm hover:opacity-90"
                        style={{ backgroundColor: btnColor, color: '#fff', borderColor: btnColor }}
                        disabled={disabled}
                        onClick={() => onChange?.(undefined)}
                    >
                        {btnEmoji && <span className="mr-2">{btnEmoji}</span>}
                        {btnName}
                    </Button>
                );
            }

            case 'ACTION_ITEMS':
                return (
                    <Textarea
                        value={Array.isArray(value) ? value.map((a: { text?: string }) => a?.text ?? '').join('\n') : value || ''}
                        onChange={(e) => onChange(e.target.value.split('\n').filter(Boolean).map((text) => ({ text })))}
                        disabled={disabled}
                        className="rounded-sm min-h-[38px] h-[38px] text-sm resize-y border-0 shadow-none focus-visible:ring-0"
                    />
                );

            default:
                return (
                    <Input
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={disabled}
                        className="h-[38px] text-sm border-0 shadow-none focus-visible:ring-0"
                    />
                );
        }
    };

    return (
        <div className="space-y-1.5">
            {!hideLabel && (
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    {field.name}
                    {field.isRequired && <span className="text-red-500">*</span>}
                </label>
            )}
            {renderField()}
        </div>
    );
}
