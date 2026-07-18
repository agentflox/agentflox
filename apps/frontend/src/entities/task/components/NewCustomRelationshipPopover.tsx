'use client';

import * as React from 'react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, ChevronDown, ChevronUp, Lock, Info, Network } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

interface NewCustomRelationshipPopoverProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    trigger?: React.ReactNode;
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
}

export function NewCustomRelationshipPopover({
    open,
    onOpenChange,
    trigger,
    side = 'bottom',
    align = 'start'
}: NewCustomRelationshipPopoverProps) {
    const [name, setName] = React.useState('');
    const [relatedTo, setRelatedTo] = React.useState('specific');
    const [relatedList, setRelatedList] = React.useState('');
    const [showMore, setShowMore] = React.useState(false);

    return (
        <Popover modal={true} open={open} onOpenChange={onOpenChange}>
            {trigger && <PopoverTrigger asChild>{trigger}</PopoverTrigger>}
            <PopoverContent
                className="w-[320px] p-0 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl flex flex-col max-h-[min(560px,var(--radix-popover-content-available-height))]"
                align={align}
                side={side}
                sideOffset={4}
                collisionPadding={16}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 shrink-0">
                    <div className="flex items-center gap-1.5 text-[14px] text-zinc-400 cursor-pointer hover:text-zinc-600 transition-colors">
                        <span>Relationship</span>
                        <ChevronDown className="h-3.5 w-3.5" />
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-zinc-100 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200" onClick={() => onOpenChange(false)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-4 space-y-5">
                        <div className="space-y-1.5">
                            <Label className="!text-xs !font-medium !text-zinc-600 !mb-2">
                                Relationship name<span className="text-red-500 ml-0.5">*</span>
                            </Label>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-[10px] border border-red-400 focus-within:ring-[3px] focus-within:ring-red-500/20 transition-all">
                                <span className="text-zinc-500 shrink-0 flex items-center justify-center">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Z" /><path d="M15 11a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Z" /><path d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2c2.148 0 4.138.677 5.76 1.838" /><path d="M16 2v4" /><path d="M14 4h4" /><path d="M8 16c1.5 1 4.5 1 6 0" /></svg>
                                </span>
                                <input
                                    className="w-full bg-transparent border-none outline-none text-[14px] text-zinc-900 placeholder:text-zinc-400 h-5"
                                    placeholder="Enter name..."
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="!text-xs !font-medium !text-zinc-600 !mb-2">Related to</Label>
                            <RadioGroup value={relatedTo} onValueChange={setRelatedTo} className="gap-1">
                                <div className="flex items-center space-x-3">
                                    <RadioGroupItem value="any" id="any" className="h-4 w-4 text-indigo-500 border-zinc-300" />
                                    <Label htmlFor="any" className={cn("!text-[14px] !font-normal cursor-pointer", relatedTo === 'any' ? "text-zinc-900" : "text-zinc-500")}>any task in your Workspace</Label>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <RadioGroupItem value="specific" id="specific" className="h-4 w-4 text-indigo-500 border-zinc-300" />
                                    <Label htmlFor="specific" className={cn("!text-[14px] !font-normal cursor-pointer", relatedTo === 'specific' ? "text-zinc-900" : "text-zinc-500")}>tasks from a specific List</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {relatedTo === 'specific' && (
                            <div className="space-y-1.5">
                                <Label className="!text-xs !font-medium !text-zinc-600 !mb-2">
                                    Related List<span className="text-red-500 ml-0.5">*</span>
                                </Label>
                                <Select value={relatedList} onValueChange={setRelatedList}>
                                    <SelectTrigger className="w-full h-8 text-[14px] rounded-lg border-zinc-200 text-zinc-500 focus:ring-1 focus:ring-zinc-300">
                                        <SelectValue placeholder="Select List..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="list1" className="text-zinc-500 [&_.font-medium]:font-normal">Marketing List</SelectItem>
                                        <SelectItem value="list2" className="text-zinc-500 [&_.font-medium]:font-normal">Engineering List</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-1">
                            <Label className="!text-[13px] !font-normal !text-zinc-600">Create rollup fields from related List</Label>
                            <Switch />
                        </div>
                    </div>

                    <div className="border-t border-zinc-100">
                        <button
                            type="button"
                            onClick={() => setShowMore(!showMore)}
                            className="w-full flex items-center justify-between px-4 py-3.5 text-[14px] font-semibold text-zinc-800 hover:bg-zinc-50 transition-colors cursor-pointer"
                        >
                            More settings and permissions
                            {showMore ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
                        </button>
                    </div>

                    {showMore && (
                        <div className="p-4 pt-0 space-y-6">
                            <div className="space-y-1.5">
                                <Label className="!text-xs !font-medium !text-zinc-600 !mb-2">Description</Label>
                                <Textarea
                                    className="min-h-[70px] text-[13px] rounded-lg resize-y border-zinc-200 focus-visible:ring-1 focus-visible:ring-zinc-300 placeholder:text-zinc-400"
                                    placeholder="Tell other users how to use this field"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="!text-xs !font-medium !text-zinc-600 !mb-2">Permissions</Label>
                                <div className="flex gap-2">
                                    <Select defaultValue="workspace">
                                        <SelectTrigger className="w-full h-9 rounded-lg text-[13px] border-zinc-200 text-zinc-800">
                                            <SelectValue placeholder="Workspace default" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="workspace" className="[&_.font-medium]:font-normal">Workspace default</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button variant="outline" size="icon" className="h-9 w-10 rounded-lg shrink-0 border-zinc-200 text-zinc-400 hover:text-zinc-600">
                                        <Lock className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center">
                                    <Label className="!text-xs !font-medium !text-zinc-600">Exceptions</Label>
                                    <Info className="h-3.5 w-3.5 text-zinc-400 ml-1 mb-1" />
                                </div>

                                <div className="flex items-center justify-between space-y-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="h-6 w-6 rounded bg-zinc-900 text-white flex items-center justify-center text-[11px] font-bold">
                                            D
                                        </div>
                                        <span className="text-[13px] text-zinc-700">Dat nguyen <span className="text-zinc-400">(Creator)</span></span>
                                    </div>
                                    <div className="flex items-center text-[12px] text-zinc-400 hover:text-zinc-600 cursor-pointer font-medium">
                                        Can edit <ChevronDown className="h-3.5 w-3.5 ml-1" />
                                    </div>
                                </div>

                                <Button variant="secondary" className="w-full h-8 text-[13px] font-medium rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-500">
                                    Add exception
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <Label className="!text-xs !font-medium !text-zinc-600 !mb-2">Display settings</Label>
                                <div className="flex items-center justify-between">
                                    <Label className="!text-[13px] !font-normal !text-zinc-600">Required in tasks</Label>
                                    <Switch />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="!text-[13px] !font-normal !text-zinc-600">Visible to Guests and Limited Members</Label>
                                    <Switch defaultChecked className="data-[state=checked]:bg-indigo-500" />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="!text-[13px] !font-normal !text-zinc-600">Belongs to</Label>
                                <p className="text-[14px] text-zinc-500 leading-relaxed mb-3">
                                    Field will exist on all tasks at locations below
                                </p>
                                <div className="flex items-center gap-2 pt-1 text-[14px] text-zinc-800">
                                    <Network className="h-4 w-4 text-zinc-400" />
                                    Project 1
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-6 pb-2">
                                <Button variant="outline" className="h-9 px-4 rounded-lg text-[13px] font-semibold border-zinc-200 text-zinc-600 hover:bg-zinc-50">
                                    Cancel
                                </Button>
                                <Button className="h-9 px-4 rounded-lg text-[13px] font-semibold bg-indigo-500 hover:bg-indigo-600 text-white border-0">
                                    Create
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
