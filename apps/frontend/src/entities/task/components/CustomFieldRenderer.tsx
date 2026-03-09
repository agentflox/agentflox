'use client';

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
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Calendar as CalendarIcon, Star } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { LocationSearchInput } from './LocationSearchInput';

interface CustomFieldRendererProps {
    field: any;
    value: any;
    onChange: (value: any) => void;
    disabled?: boolean;
    hideLabel?: boolean;
}

export function CustomFieldRenderer({
    field,
    value,
    onChange,
    disabled = false,
    hideLabel = false,
}: CustomFieldRendererProps) {
    const effectiveType = (field.config as { fieldType?: string } | null)?.fieldType ?? field.type;
    const renderField = () => {
        switch (effectiveType) {
            case 'TEXT':
                return (
                    <Input
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={field.config?.placeholder || `Enter ${field.name.toLowerCase()}...`}
                        disabled={disabled}
                        className="h-8 text-sm"
                    />
                );

            case 'NUMBER':
                return (
                    <Input
                        type="number"
                        value={value || ''}
                        onChange={(e) => onChange(Number(e.target.value))}
                        placeholder={field.config?.placeholder || '0'}
                        disabled={disabled}
                        className="h-8 text-sm"
                        min={field.config?.min}
                        max={field.config?.max}
                    />
                );

            case 'DROPDOWN':
                const options = field.config?.options || [];
                return (
                    <Select
                        value={value || ''}
                        onValueChange={onChange}
                        disabled={disabled}
                    >
                        <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder={`Select ${field.name.toLowerCase()}...`} />
                        </SelectTrigger>
                        <SelectContent>
                            {options.map((option: any) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );

            case 'DATE':
                return (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "h-8 w-full justify-start text-left font-normal text-sm",
                                    !value && "text-muted-foreground"
                                )}
                                disabled={disabled}
                            >
                                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                {value ? format(new Date(value), 'PPP') : <span>Pick a date</span>}
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
                    <Input
                        type="url"
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="https://example.com"
                        disabled={disabled}
                        className="h-8 text-sm"
                    />
                );

            case 'EMAIL':
                return (
                    <Input
                        type="email"
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="email@example.com"
                        disabled={disabled}
                        className="h-8 text-sm"
                    />
                );

            case 'PHONE':
                return (
                    <Input
                        type="tel"
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        disabled={disabled}
                        className="h-8 text-sm"
                    />
                );

            case 'TEXT_AREA':
            case 'LONG_TEXT':
                return (
                    <Textarea
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={field.config?.placeholder || `Enter ${field.name.toLowerCase()}...`}
                        disabled={disabled}
                        className="min-h-[80px] text-sm resize-y"
                    />
                );

            case 'SUMMARY':
            case 'PROGRESS_UPDATES':
            case 'TRANSLATION':
                return (
                    <Textarea
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={field.config?.placeholder || `Enter ${field.name.toLowerCase()}...`}
                        disabled={disabled}
                        className="min-h-[80px] text-sm resize-y"
                    />
                );

            case 'CUSTOM_TEXT':
                return (
                    <Input
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={field.config?.placeholder || `Enter ${field.name.toLowerCase()}...`}
                        disabled={disabled}
                        className="h-8 text-sm"
                    />
                );

            case 'CUSTOM_DROPDOWN':
            case 'CATEGORIZE':
            case 'TSHIRT_SIZE': {
                const dropdownOptions = field.config?.options?.length
                    ? field.config.options
                    : field.type === 'TSHIRT_SIZE'
                        ? [{ value: 'XS', label: 'XS' }, { value: 'S', label: 'S' }, { value: 'M', label: 'M' }, { value: 'L', label: 'L' }, { value: 'XL', label: 'XL' }]
                        : [];
                return (
                    <Select
                        value={value || ''}
                        onValueChange={onChange}
                        disabled={disabled}
                    >
                        <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder={`Select ${field.name.toLowerCase()}...`} />
                        </SelectTrigger>
                        <SelectContent>
                            {dropdownOptions.map((option: { value: string; label: string }) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );
            }

            case 'LABELS': {
                const labelOptions = field.config?.options || [];
                return (
                    <Select
                        value={value || ''}
                        onValueChange={onChange}
                        disabled={disabled}
                    >
                        <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select labels..." />
                        </SelectTrigger>
                        <SelectContent>
                            {labelOptions.map((option: { value: string; label: string }) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );
            }

            case 'MONEY':
                return (
                    <div className="relative flex items-center">
                        <span className="absolute left-3 text-sm text-muted-foreground">$</span>
                        <Input
                            type="number"
                            value={value ?? ''}
                            onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
                            placeholder="0.00"
                            disabled={disabled}
                            className="h-8 text-sm pl-7"
                            min={field.config?.min}
                            max={field.config?.max}
                            step={0.01}
                        />
                    </div>
                );

            case 'FORMULA':
                return (
                    <Input
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={field.config?.placeholder || '= expression'}
                        disabled={disabled ?? field.config?.readOnly}
                        className="h-8 text-sm font-mono"
                    />
                );

            case 'FILES':
                return (
                    <div className="space-y-2">
                        <input
                            type="file"
                            multiple
                            onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                const next = files.length ? files.map((f) => ({ name: f.name })) : (value ?? []);
                                onChange(next);
                                e.target.value = '';
                            }}
                            disabled={disabled}
                            className="text-sm file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:text-primary-foreground"
                        />
                        {Array.isArray(value) && value.length > 0 && (
                            <ul className="text-xs text-muted-foreground space-y-0.5">
                                {value.map((f: { name?: string; url?: string }, i: number) => (
                                    <li key={i}>{f.name ?? f.url ?? 'File'}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                );

            case 'RELATIONSHIP':
                return (
                    <Input
                        value={typeof value === 'string' ? value : value?.label ?? ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={field.config?.placeholder || 'Link or ID...'}
                        disabled={disabled}
                        className="h-8 text-sm"
                    />
                );

            case 'PEOPLE':
                return (
                    <Input
                        value={typeof value === 'string' ? value : Array.isArray(value) ? value.map((p: { name?: string }) => p?.name).filter(Boolean).join(', ') : ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="Names or emails..."
                        disabled={disabled}
                        className="h-8 text-sm"
                    />
                );

            case 'PROGRESS_AUTO':
                return (
                    <div className="flex items-center gap-2">
                        <Progress value={typeof value === 'number' ? value : 0} className="flex-1 h-2" />
                        <span className="text-xs text-muted-foreground tabular-nums">{typeof value === 'number' ? value : 0}%</span>
                    </div>
                );

            case 'PROGRESS_MANUAL':
                const progressVal = typeof value === 'number' ? value : 0;
                return (
                    <div className="flex items-center gap-2">
                        <Slider
                            value={[progressVal]}
                            onValueChange={([v]) => onChange(v)}
                            min={0}
                            max={100}
                            disabled={disabled}
                            className="w-full"
                        />
                        <span className="text-xs text-muted-foreground tabular-nums w-8">{progressVal}%</span>
                    </div>
                );

            case 'SENTIMENT': {
                const sentimentOptions = field.config?.options || [
                    { value: 'positive', label: 'Positive' },
                    { value: 'neutral', label: 'Neutral' },
                    { value: 'negative', label: 'Negative' },
                ];
                return (
                    <Select value={value || ''} onValueChange={onChange} disabled={disabled}>
                        <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select sentiment..." />
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
                        placeholder="One task per line..."
                        disabled={disabled}
                        className="min-h-[60px] text-sm resize-y"
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
                const maxStars = field.config?.max ?? 5;
                const rating = typeof value === 'number' ? Math.min(maxStars, Math.max(0, value)) : 0;
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
                                <Star
                                    className={cn('h-5 w-5', i < rating ? 'fill-amber-400 text-amber-500' : 'text-zinc-300')}
                                />
                            </button>
                        ))}
                    </div>
                );
            }

            case 'VOTING':
                return (
                    <Input
                        type="number"
                        value={value ?? ''}
                        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
                        placeholder="Votes"
                        disabled={disabled}
                        className="h-8 text-sm"
                    />
                );

            case 'SIGNATURE':
                return (
                    <Input
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="Sign or paste signature URL..."
                        disabled={disabled}
                        className="h-8 text-sm"
                    />
                );

            case 'BUTTON':
                return (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-sm"
                        disabled={disabled}
                        onClick={() => onChange?.(undefined)}
                    >
                        {field.config?.label || field.name || 'Run'}
                    </Button>
                );

            case 'ACTION_ITEMS':
                return (
                    <Textarea
                        value={Array.isArray(value) ? value.map((a: { text?: string }) => a?.text ?? '').join('\n') : value || ''}
                        onChange={(e) => onChange(e.target.value.split('\n').filter(Boolean).map((text) => ({ text })))}
                        placeholder="One action per line..."
                        disabled={disabled}
                        className="min-h-[60px] text-sm resize-y"
                    />
                );

            default:
                return (
                    <Input
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={disabled}
                        className="h-8 text-sm"
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
