const fs = require('fs');
const path = 'c:/Users/datng/agentflox/apps/frontend/src/entities/customfields/components/CustomFieldSidebarPanel.tsx';
let code = fs.readFileSync(path, 'utf8');

// Add imports
code = code.replace(
  'import { ALL_FIELDS, type FieldTypeOption } from "../../task/constants/fieldTypes";',
  'import { ALL_FIELDS, type FieldTypeOption } from "../../task/constants/fieldTypes";\nimport { CustomFieldConfigForm, useCustomFieldConfigState } from "../../task/components/SharedCustomFieldConfig";\nimport { Info, ChevronUp } from "lucide-react";\nimport { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";\n\nconst PERMISSION_OPTIONS = [\n    { value: "workspace", label: "Workspace default", description: "Inherit permissions from your Workspace settings" },\n    { value: "anyone_edit", label: "Anyone can edit", description: "Can view and edit the field definition" },\n    { value: "anyone_set", label: "Anyone can set", description: "Can set field values on tasks, but not edit the field definition" },\n    { value: "anyone_view", label: "Anyone can view", description: "Read-only permissions to view the field on tasks" },\n    { value: "private", label: "Private", description: "Only you and invited members have access" },\n];\n\nfunction PermissionIcon({ value, className }: { value: string; className?: string }) {\n    if (value === "workspace") return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" /><path d="M12 8v4l3 3" /></svg>;\n    if (value === "anyone_edit") return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;\n    if (value === "anyone_set") return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93A10 10 0 0 0 2 12a10 10 0 0 0 17.07 7.07" /></svg>;\n    if (value === "anyone_view") return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;\n    return <Lock className={className} />;\n}'
);

// Add missing states
code = code.replace(
  'const [type, setType] = React.useState<string>("TEXT");\n    const [defaultValue, setDefaultValue] = React.useState("");',
  'const [type, setType] = React.useState<string>("TEXT");\n    const [defaultValue, setDefaultValue] = React.useState("");\n\n    const configState = useCustomFieldConfigState(fieldToEdit?.config);\n    const [showMore, setShowMore] = React.useState(false);\n    const [permission, setPermission] = React.useState("workspace");\n    const [permissionOpen, setPermissionOpen] = React.useState(false);'
);

// Replace selectedPermission definition later in component
code = code.replace(
  'const filteredAll = ALL_FIELDS.filter(',
  'const selectedPermission = PERMISSION_OPTIONS.find(o => o.value === permission) || PERMISSION_OPTIONS[0];\n\n    const filteredAll = ALL_FIELDS.filter('
);

// Replace handleSubmit
const handleSubmitRegex = /const handleSubmit = \(\e\: React\.FormEvent\) => \{[\s\S]*?\n    \};/g;
const newHandleSubmit = `const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error("Field name is required");
            return;
        }

        const config: Record<string, any> = configState.getConfig(type) || {};
        if (description.trim()) config.description = description.trim();
        if (permission !== 'workspace') config.permissionLevel = permission;

        if (mode === "create") {
            createField.mutate({
                workspaceId: createContext?.workspaceId ?? workspaceId,
                spaceId: createContext?.spaceId ?? undefined,
                projectId: createContext?.projectId ?? undefined,
                folderId: createContext?.folderId ?? undefined,
                listId: createContext?.listId ?? undefined,
                teamId: createContext?.teamId ?? undefined,
                name: name.trim(),
                type,
                applyTo: ["TASK"],
                defaultValue: defaultValue.trim() || undefined,
                config: Object.keys(config).length ? config : undefined,
                locationType: createContext?.locationType ?? "WORKSPACE",
                isRequired: isRequiredInTasks,
                isPinned,
                isVisibleToGuests,
                visibility: permission === 'private' ? 'PRIVATE' : permission === 'anyone_view' ? 'EVERYONE' : permission === 'anyone_edit' ? 'MEMBERS' : 'ADMINS',
            });
            return;
        }

        const f = fieldToEdit;
        const existingConfig = (f?.config ?? {}) as Record<string, any>;
        updateField.mutate({
            id: f.id,
            name: name.trim(),
            defaultValue: defaultValue.trim() || undefined,
            isRequired: isRequiredInTasks,
            isPinned,
            isVisibleToGuests,
            visibility: permission === 'private' ? 'PRIVATE' : permission === 'anyone_view' ? 'EVERYONE' : permission === 'anyone_edit' ? 'MEMBERS' : 'ADMINS',
            config: Object.keys(config).length ? config : undefined,
        });
    };`;

code = code.replace(handleSubmitRegex, newHandleSubmit);


// Replace form HTML
const formRegex = /<form id="custom-field-sidebar-form" onSubmit=\{handleSubmit\}>[\s\S]*?<\/form>/;
const newForm = `<form id="custom-field-sidebar-form" onSubmit={handleSubmit} className="flex flex-col h-full">
                        <div className="p-6 space-y-4">
                            {/* Field name */}
                            <div className="space-y-2">
                                <Label htmlFor="field-name" className="block !text-xs !font-medium !text-zinc-600">
                                    Field name <span className="text-red-500 ml-0.5">*</span>
                                </Label>
                                <Input
                                    id="field-name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter name..."
                                    className="w-full h-9 bg-white border-zinc-200/80 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all !text-xs"
                                />
                            </div>

                            <CustomFieldConfigForm type={type} state={configState} setType={isTypeLocked ? undefined : setType} />
                        </div>

                        {/* More settings toggle */}
                        <div className="border-t border-zinc-100">
                            <button
                                type="button"
                                onClick={() => setShowMore(!showMore)}
                                className="w-full flex items-center justify-between px-6 py-4 text-[13px] font-semibold text-zinc-800 hover:bg-zinc-50 transition-colors cursor-pointer"
                            >
                                More settings and permissions
                                {showMore ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
                            </button>
                        </div>

                        {showMore && (
                            <div className="px-6 pb-6 pt-1 space-y-6">
                                {/* Description */}
                                <div className="space-y-2">
                                    <Label className="block !text-xs !font-medium !text-zinc-600">Description</Label>
                                    <Textarea
                                        className="min-h-[70px] text-[13px] rounded-lg resize-y border-zinc-200 focus-visible:ring-1 focus-visible:ring-zinc-300 placeholder:text-zinc-400"
                                        placeholder="Tell other users how to use this field"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                    />
                                    <p className="text-[11px] text-zinc-400">View descriptions when hovering over fields in tasks or views</p>
                                </div>

                                {/* Permissions */}
                                <div className="space-y-2">
                                    <Label className="block !text-xs !font-medium !text-zinc-600">Permissions</Label>
                                    <div className="flex gap-2">
                                        <Popover open={permissionOpen} onOpenChange={setPermissionOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    type="button"
                                                    className="w-full justify-between h-9 rounded-lg text-[13px] font-normal border-zinc-200 text-zinc-800 hover:bg-zinc-50"
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <PermissionIcon value={selectedPermission.value} className="h-4 w-4 text-zinc-400 shrink-0" />
                                                        <span className="font-normal">{selectedPermission.label}</span>
                                                    </span>
                                                    <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[280px] p-1 shadow-lg border-zinc-200 rounded-xl" align="start">
                                                {PERMISSION_OPTIONS.map((opt) => (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => { setPermission(opt.value); setPermissionOpen(false); }}
                                                        className={cn(
                                                            "w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left cursor-pointer hover:bg-zinc-50 transition-colors",
                                                            permission === opt.value && "bg-indigo-50"
                                                        )}
                                                    >
                                                        <div className="mt-0.5 shrink-0 text-zinc-400">
                                                            <PermissionIcon value={opt.value} className="h-4 w-4" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className={cn("text-[13px] font-medium", permission === opt.value ? "text-indigo-700" : "text-zinc-900")}>
                                                                {opt.label}
                                                            </div>
                                                            <div className="text-[11.5px] text-zinc-500 mt-0.5 leading-snug">{opt.description}</div>
                                                        </div>
                                                        {permission === opt.value && (
                                                            <Check className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                                                        )}
                                                    </button>
                                                ))}
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>

                                {/* Extra field settings */}
                                <div className="space-y-4 pt-2">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-0.5 flex-1 pr-4">
                                            <Label className="text-[13px] font-medium text-zinc-900">Required in tasks</Label>
                                            <p className="text-[11px] text-zinc-500 leading-snug">Require a value when tasks are created</p>
                                        </div>
                                        <Switch
                                            checked={isRequiredInTasks}
                                            onCheckedChange={setIsRequiredInTasks}
                                            className="data-[state=checked]:bg-indigo-600 mt-1"
                                        />
                                    </div>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-0.5 flex-1 pr-4">
                                            <Label className="text-[13px] font-medium text-zinc-900">Pinned</Label>
                                            <p className="text-[11px] text-zinc-500 leading-snug">Always show in task view, even when empty</p>
                                        </div>
                                        <Switch
                                            checked={isPinned}
                                            onCheckedChange={setIsPinned}
                                            className="data-[state=checked]:bg-indigo-600 mt-1"
                                        />
                                    </div>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-0.5 flex-1 pr-4">
                                            <Label className="text-[13px] font-medium text-zinc-900">Visible to guests</Label>
                                            <p className="text-[11px] text-zinc-500 leading-snug">Allow guests to see this field</p>
                                        </div>
                                        <Switch
                                            checked={isVisibleToGuests}
                                            onCheckedChange={setIsVisibleToGuests}
                                            className="data-[state=checked]:bg-indigo-600 mt-1"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Location / Field belongs to */}
                        <div className="border-t border-zinc-100 flex-1">
                            <div className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <Label className="block !text-[12px] !font-medium !text-zinc-600">
                                        Field belongs to <span className="text-red-500 ml-0.5">*</span>
                                    </Label>
                                    <div className="flex items-center gap-6">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <div className="h-4 w-4 rounded-full border-[4.5px] border-indigo-600 flex items-center justify-center shrink-0 shadow-sm"></div>
                                            <span className="text-[13px] text-zinc-800 group-hover:text-zinc-900">Location</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer group opacity-50">
                                            <div className="h-4 w-4 rounded-full border border-zinc-300 flex items-center justify-center shrink-0 shadow-sm"></div>
                                            <span className="text-[13px] text-zinc-500">Task type</span>
                                        </label>
                                    </div>
                                </div>

                                <p className="text-[13px] text-zinc-600 leading-relaxed">
                                    <span className="font-semibold text-zinc-900">{name || 'This field'}</span> will exist on all tasks at locations below, regardless of task type:
                                </p>

                                <div className="space-y-2">
                                    <Popover open={destinationPickerOpen && editingLocationIndex === null} onOpenChange={(o) => {
                                        if (!o) setEditingLocationIndex(null);
                                        setDestinationPickerOpen(o);
                                    }}>
                                        <PopoverTrigger asChild>
                                            <Button type="button" variant="outline" className="w-full justify-between h-9 px-3 text-[13px] font-normal border-zinc-200 text-zinc-800 hover:bg-zinc-50 shadow-sm">
                                                <span className="flex items-center gap-2">
                                                    <Check className="h-4 w-4 text-zinc-400" />
                                                    Add location
                                                </span>
                                                <ChevronDown className="h-4 w-4 text-zinc-400" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[300px] p-0 shadow-2xl border-zinc-200 z-[110] overflow-hidden" align="start">
                                            <LocationPickerContent
                                                onSelect={(loc: any) => {
                                                    setFieldLocations(prev => [...prev.filter(l => l.id !== loc.id), loc]);
                                                    setDestinationPickerOpen(false);
                                                }}
                                                workspaces={workspaces}
                                                spaces={spaces}
                                                projects={projects}
                                                search={locSearch}
                                                onSearch={setLocSearch}
                                            />
                                        </PopoverContent>
                                    </Popover>

                                    {fieldLocations.length > 0 && (
                                        <div className="space-y-1.5 mt-2">
                                            {fieldLocations.map((loc, idx) => {
                                                const resolved = resolveLocation(loc, workspaces, spaces, projects, folders, lists);
                                                const LocIcon = resolved.icon;
                                                return (
                                                    <div key={idx} className="group flex items-center justify-between p-2 rounded-lg border border-zinc-100 bg-zinc-50/50 hover:bg-white hover:border-violet-200 transition-all">
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn("h-7 w-7 rounded-md flex items-center justify-center bg-white border border-zinc-100 shadow-sm", resolved.iconColor)}>
                                                                <LocIcon className="h-3.5 w-3.5" />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[13px] font-medium text-zinc-900">{resolved.name}</span>
                                                                <span className="text-[11px] text-zinc-400 capitalize">{resolved.type.toLowerCase()}</span>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 rounded-md hover:bg-red-50 hover:text-red-600 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={() => setFieldLocations(prev => prev.filter((_, i) => i !== idx))}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="sticky bottom-0 left-0 right-0 p-4 border-t border-zinc-100 bg-white flex items-center justify-between z-10">
                            {mode === "edit" ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 rounded-md bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 transition-colors"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            ) : <div></div>}
                            
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={requestClose}
                                    className="h-9 px-4 border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 shadow-sm transition-all font-medium text-[13px]"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={savePending || !name.trim()}
                                    className="h-9 px-4 bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm transition-all font-medium border border-transparent text-[13px]"
                                >
                                    {savePending ? 'Saving...' : 'Save'}
                                </Button>
                            </div>
                        </div>
                    </form>`;
code = code.replace(formRegex, newForm);

fs.writeFileSync(path, code);
