"use client";

import { X, Layout } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PageSettingsConfig {
    fontStyle: 'system' | 'serif' | 'mono';
    fontSize: 'small' | 'default' | 'large';
    pageWidth: 'default' | 'full';
    headerCoverImage: boolean;
    headerIconTitle: boolean;
    headerOwners: boolean;
    headerContributors: boolean;
    headerSubtitle: boolean;
    headerLastModified: boolean;
    sectionSubpages: boolean;
    sectionRelationships: boolean;
    sectionPageOutline: boolean;
    focusModeBlock: boolean;
    focusModePage: boolean;
    statsShow: boolean;
    toolbarDisplayStyle: 'sidebar' | 'modal';
    // live computed stats passed from parent
    wordCount?: number;
    charCount?: number;
    readingTime?: string;
}

export const defaultPageSettings: PageSettingsConfig = {
    fontStyle: 'system',
    fontSize: 'default',
    pageWidth: 'full',
    headerCoverImage: true,
    headerIconTitle: true,
    headerOwners: true,
    headerContributors: false,
    headerSubtitle: false,
    headerLastModified: true,
    sectionSubpages: false,
    sectionRelationships: false,
    sectionPageOutline: false,
    focusModeBlock: false,
    focusModePage: false,
    statsShow: false,
    toolbarDisplayStyle: 'sidebar'
};

interface PageSettingsPanelProps {
    settings: PageSettingsConfig;
    onChange: (settings: PageSettingsConfig) => void;
    onApplyToAll?: () => void;
    onClose?: () => void;
}

// Reusable segmented control
function SegmentedControl({ value, onChange, options }: {
    value: string;
    onChange: (v: string) => void;
    options: { label: string; value: string }[];
}) {
    return (
        <div className="flex gap-0.5 bg-zinc-100 p-0.5 rounded-lg">
            {options.map(opt => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    className={cn(
                        "flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 cursor-pointer select-none",
                        value === opt.value
                            ? "bg-white shadow-sm text-zinc-900 font-semibold"
                            : "text-zinc-500 hover:text-zinc-800 hover:bg-white/50 active:bg-white/80"
                    )}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

// Reusable card-style toggle for font/size pickers
function CardToggle({ active, onClick, preview, label }: {
    active: boolean;
    onClick: () => void;
    preview: React.ReactNode;
    label: string;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex-1 flex flex-col items-center justify-center py-3 px-2 rounded-xl border-2 transition-all duration-150 cursor-pointer select-none group",
                active
                    ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm shadow-blue-100"
                    : "bg-zinc-50 border-transparent text-zinc-600 hover:bg-white hover:border-zinc-200 hover:shadow-sm active:scale-95"
            )}
        >
            <span className={cn("text-base font-bold mb-0.5 transition-colors", active ? "text-blue-600" : "text-zinc-700 group-hover:text-zinc-900")}>{preview}</span>
            <span className={cn("text-[11px] font-medium transition-colors", active ? "text-blue-500" : "text-zinc-400 group-hover:text-zinc-600")}>{label}</span>
        </button>
    );
}

// Reusable section row with switch
function SettingRow({ icon, label, checked, onCheckedChange }: {
    icon: string;
    label: string;
    checked: boolean;
    onCheckedChange: (v: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between py-0.5 group">
            <div className="flex items-center gap-3 text-sm text-zinc-700">
                <span className="w-5 flex items-center justify-center text-[15px]">{icon}</span>
                <span>{label}</span>
            </div>
            <Switch checked={checked} onCheckedChange={onCheckedChange} />
        </div>
    );
}

function ClickableRow({ icon, label, active, onClick }: {
    icon: string;
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center justify-between py-0.5 group cursor-pointer"
        >
            <div className="flex items-center gap-3 text-sm text-zinc-700">
                <span className="w-5 flex items-center justify-center text-[15px]">{icon}</span>
                <span>{label}</span>
            </div>
            <span className={cn(
                "text-xs font-medium transition-colors",
                active ? "text-blue-600" : "text-zinc-400 group-hover:text-zinc-600"
            )}>
                {active ? 'On ›' : 'Off ›'}
            </span>
        </button>
    );
}

// Divider
function Divider() {
    return <div className="w-full h-px bg-zinc-100 my-1" />;
}

// Section label
function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="text-[12px] font-medium text-zinc-4f00 pb-1">{children}</div>
    );
}

export function PageSettingsModal({ settings, onChange, onApplyToAll, onClose }: PageSettingsPanelProps) {
    return (
        <div className="w-full flex flex-col bg-white overflow-hidden h-full">
            {/* Header */}
            <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between shrink-0">
                <h3 className="text-sm font-semibold text-zinc-900 tracking-tight">Page Styles</h3>
                {onClose && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer transition-colors"
                        onClick={onClose}
                    >
                        <X className="h-3.5 w-3.5" />
                    </Button>
                )}
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-5">

                    {/* Font Style */}
                    <div className="space-y-2.5">
                        <SectionLabel>Font style</SectionLabel>
                        <div className="flex gap-2">
                            <CardToggle active={settings.fontStyle === 'system'} onClick={() => onChange({ ...settings, fontStyle: 'system' })} preview="Aa" label="System" />
                            <CardToggle active={settings.fontStyle === 'serif'} onClick={() => onChange({ ...settings, fontStyle: 'serif' })} preview={<span className="font-serif">Ss</span>} label="Serif" />
                            <CardToggle active={settings.fontStyle === 'mono'} onClick={() => onChange({ ...settings, fontStyle: 'mono' })} preview={<span className="font-mono">00</span>} label="Mono" />
                        </div>
                    </div>

                    {/* Font Size */}
                    <div className="space-y-2.5">
                        <SectionLabel>Font size</SectionLabel>
                        <div className="flex gap-2">
                            <CardToggle active={settings.fontSize === 'small'} onClick={() => onChange({ ...settings, fontSize: 'small' })} preview={<span className="text-sm">Aa</span>} label="Small" />
                            <CardToggle active={settings.fontSize === 'default'} onClick={() => onChange({ ...settings, fontSize: 'default' })} preview={<span className="text-base">Aa</span>} label="Default" />
                            <CardToggle active={settings.fontSize === 'large'} onClick={() => onChange({ ...settings, fontSize: 'large' })} preview={<span className="text-lg">Aa</span>} label="Large" />
                        </div>
                    </div>

                    {/* Page Width */}
                    <div className="space-y-2.5">
                        <SectionLabel>Page width</SectionLabel>
                        <SegmentedControl
                            value={settings.pageWidth}
                            onChange={(v) => onChange({ ...settings, pageWidth: v as 'default' | 'full' })}
                            options={[{ label: 'Default', value: 'default' }, { label: 'Full width', value: 'full' }]}
                        />
                    </div>

                    {onApplyToAll && (
                        <button
                            onClick={onApplyToAll}
                            className="w-full text-center text-xs text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer focus:outline-none py-1 rounded-md hover:bg-zinc-50"
                        >
                            Apply typography to all pages
                        </button>
                    )}

                    <Divider />

                    {/* Header */}
                    <div className="space-y-2.5">
                        <SectionLabel>Header</SectionLabel>
                        <div className="space-y-2">
                            <SettingRow icon="🖼️" label="Cover image" checked={settings.headerCoverImage} onCheckedChange={(v) => onChange({ ...settings, headerCoverImage: v })} />
                            <SettingRow icon="😀" label="Page icon & title" checked={settings.headerIconTitle} onCheckedChange={(v) => onChange({ ...settings, headerIconTitle: v })} />
                            <SettingRow icon="👤" label="Owners" checked={settings.headerOwners} onCheckedChange={(v) => onChange({ ...settings, headerOwners: v })} />
                            <SettingRow icon="👥" label="Contributors" checked={settings.headerContributors} onCheckedChange={(v) => onChange({ ...settings, headerContributors: v })} />
                            <SettingRow icon="T" label="Subtitle" checked={settings.headerSubtitle} onCheckedChange={(v) => onChange({ ...settings, headerSubtitle: v })} />
                            <SettingRow icon="🕒" label="Last modified" checked={settings.headerLastModified} onCheckedChange={(v) => onChange({ ...settings, headerLastModified: v })} />
                        </div>
                    </div>

                    <Divider />

                    {/* Sections */}
                    <div className="space-y-2.5">
                        <SectionLabel>Sections</SectionLabel>
                        <div className="space-y-2">
                            <ClickableRow icon="📄" label="Subpages" active={settings.sectionSubpages} onClick={() => onChange({ ...settings, sectionSubpages: !settings.sectionSubpages })} />
                            <ClickableRow icon="🔗" label="Relationships" active={settings.sectionRelationships} onClick={() => onChange({ ...settings, sectionRelationships: !settings.sectionRelationships })} />
                            <SettingRow icon="≡" label="Page outline" checked={settings.sectionPageOutline} onCheckedChange={(v) => onChange({ ...settings, sectionPageOutline: v })} />

                            {/* Toolbar layout segmented */}
                            <div className="flex items-center justify-between py-0.5">
                                <div className="flex items-center gap-3 text-sm text-zinc-700">
                                    <span className="w-5 flex items-center justify-center text-[15px]">
                                        <Layout className="h-4 w-4" />
                                    </span>
                                    <span>Toolbar layout</span>
                                </div>
                                <SegmentedControl
                                    value={settings.toolbarDisplayStyle}
                                    onChange={(v) => onChange({ ...settings, toolbarDisplayStyle: v as 'sidebar' | 'modal' })}
                                    options={[{ label: 'Sidebar', value: 'sidebar' }, { label: 'Modal', value: 'modal' }]}
                                />
                            </div>
                        </div>
                    </div>

                    <Divider />

                    {/* Focus Mode */}
                    <div className="space-y-2.5">
                        <SectionLabel>Focus mode</SectionLabel>
                        <div className="space-y-2">
                            <SettingRow icon="☰" label="Block" checked={settings.focusModeBlock} onCheckedChange={(v) => onChange({ ...settings, focusModeBlock: v })} />
                            <SettingRow icon="📄" label="Page" checked={settings.focusModePage} onCheckedChange={(v) => onChange({ ...settings, focusModePage: v })} />
                        </div>
                    </div>

                    <Divider />

                    {/* Stats */}
                    <div className="space-y-2.5">
                        <SectionLabel>Stats</SectionLabel>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-500">Words</span>
                                <span className="font-semibold text-zinc-800 tabular-nums">{settings.wordCount ?? 0}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-500">Characters</span>
                                <span className="font-semibold text-zinc-800 tabular-nums">{settings.charCount ?? 0}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-500">Reading time</span>
                                <span className="font-semibold text-zinc-800">{settings.readingTime ?? '0s'}</span>
                            </div>
                            <div className="flex items-center justify-between pt-1">
                                <span className="text-sm text-zinc-700">Show stats on page</span>
                                <Switch checked={settings.statsShow} onCheckedChange={(v) => onChange({ ...settings, statsShow: v })} />
                            </div>
                        </div>
                    </div>

                </div>
            </ScrollArea>
        </div>
    );
}
