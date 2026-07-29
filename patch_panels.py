import re

files_to_patch = [
    {
        "path": "apps/frontend/src/entities/task/components/TaskRelationshipsSection.tsx",
        "search": """        // Custom fields fallback
        const cfValue = getCustomFieldValue(t, colId);
        if (cfValue !== undefined) {
            const formattedValue = formatCustomFieldValue(cfValue, null);
            return (
                <button type="button" className="w-full h-full min-h-[32px] flex items-center justify-start px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 focus-visible:ring-indigo-500 data-[state=open]:ring-indigo-500 transition-shadow cursor-pointer text-left text-xs text-zinc-700" onClick={(e) => e.stopPropagation()}>
                    {formattedValue}
                </button>
            );
        }""",
        "replace": """        // Custom fields fallback
        const cfv = (t.customFieldValues || []).find((v: any) => v.customFieldId === colId);
        const cfValue = cfv ? cfv.value : getCustomFieldValue(t, colId);
        const customField = cfv?.customField;
        if (cfValue !== undefined || customField) {
            const formattedValue = formatCustomFieldValue(cfValue, customField);
            return (
                <div className="w-full h-full min-h-[38px] flex items-center px-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 focus-within:ring-indigo-500 transition-shadow" onClick={(e) => e.stopPropagation()}>
                    {customField && updateCustomField ? (
                        <CustomFieldRenderer
                            field={customField}
                            value={cfValue}
                            onChange={(newValue) => {
                                updateCustomField.mutate({
                                    taskId: t.id,
                                    customFieldId: colId,
                                    value: newValue
                                });
                            }}
                            hideLabel={true}
                            workspaceId={workspaceId}
                            spaceId={t.spaceId}
                            projectId={t.projectId}
                            teamId={t.teamId}
                            listId={t.listId}
                        />
                    ) : (
                        <button type="button" className="w-full h-full flex items-center justify-start px-1 py-1 outline-none cursor-pointer text-left text-xs text-zinc-700" title={formattedValue}>
                            {formattedValue}
                        </button>
                    )}
                </div>
            );
        }"""
    },
    {
        "path": "apps/frontend/src/entities/task/components/RelatedPanelContent.tsx",
        "search": """        // Custom fields fallback
        const cfValue = getCustomFieldValue(t, colId);
        if (cfValue !== undefined) {
            const formattedValue = formatCustomFieldValue(cfValue, null);
            return (
                <button type="button" className="w-full h-full min-h-[32px] flex items-center justify-start px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 focus-visible:ring-indigo-500 data-[state=open]:ring-indigo-500 transition-shadow cursor-pointer text-left text-xs text-zinc-700" onClick={(e) => e.stopPropagation()}>
                    {formattedValue}
                </button>
            );
        }""",
        "replace": """        // Custom fields fallback
        const cfv = (t.customFieldValues || []).find((v: any) => v.customFieldId === colId);
        const cfValue = cfv ? cfv.value : getCustomFieldValue(t, colId);
        const customField = cfv?.customField;
        if (cfValue !== undefined || customField) {
            const formattedValue = formatCustomFieldValue(cfValue, customField);
            return (
                <div className="w-full h-full min-h-[38px] flex items-center px-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 focus-within:ring-indigo-500 transition-shadow" onClick={(e) => e.stopPropagation()}>
                    {customField && updateCustomField ? (
                        <CustomFieldRenderer
                            field={customField}
                            value={cfValue}
                            onChange={(newValue) => {
                                updateCustomField.mutate({
                                    taskId: t.id,
                                    customFieldId: colId,
                                    value: newValue
                                });
                            }}
                            hideLabel={true}
                            workspaceId={workspaceId}
                            spaceId={t.spaceId}
                            projectId={t.projectId}
                            teamId={t.teamId}
                            listId={t.listId}
                        />
                    ) : (
                        <button type="button" className="w-full h-full flex items-center justify-start px-1 py-1 outline-none cursor-pointer text-left text-xs text-zinc-700" title={formattedValue}>
                            {formattedValue}
                        </button>
                    )}
                </div>
            );
        }"""
    },
    {
        "path": "apps/frontend/src/entities/task/components/SubtasksTable.tsx",
        "search": """                                    // Custom fields
                                    const cfEntry = SUBTASK_FIELD_CONFIG.find(f => (f as any).id === colId && (f as any).isCustom);
                                    if (cfEntry) {
                                        const customField = (cfEntry as any).customField;
                                        const value = getCustomFieldValue(subtask as any, colId);
                                        const formattedValue = formatCustomFieldValue(value, customField);
                                        return (
                                            <TableCell key={colId} className="p-0.5 overflow-hidden" style={{ width: colWidths[colId] ?? 120, minWidth: 80 }}>
                                                <button type="button" className="w-full h-full min-h-[38px] flex items-center justify-start px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 focus-visible:ring-indigo-500 data-[state=open]:ring-indigo-500 transition-shadow cursor-pointer text-left text-xs text-zinc-700" onClick={(e) => { e.stopPropagation(); }} title={`Edit ${(cfEntry as any).label}`}>{formattedValue}</button>
                                            </TableCell>
                                        );
                                    }""",
        "replace": """                                    // Custom fields
                                    const cfEntry = SUBTASK_FIELD_CONFIG.find(f => (f as any).id === colId && (f as any).isCustom);
                                    if (cfEntry) {
                                        const customField = (cfEntry as any).customField;
                                        const value = getCustomFieldValue(subtask as any, colId);
                                        const formattedValue = formatCustomFieldValue(value, customField);
                                        return (
                                            <TableCell key={colId} className="p-0.5 overflow-hidden align-middle" style={{ width: colWidths[colId] ?? 120, minWidth: 80 }}>
                                                <div className="w-full h-full min-h-[38px] flex items-center px-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 focus-within:ring-indigo-500 transition-shadow" onClick={(e) => e.stopPropagation()}>
                                                    {customField && updateCustomField ? (
                                                        <CustomFieldRenderer
                                                            field={customField}
                                                            value={value}
                                                            onChange={(newValue) => {
                                                                updateCustomField.mutate({
                                                                    taskId: subtask.id,
                                                                    customFieldId: customField.id,
                                                                    value: newValue
                                                                });
                                                            }}
                                                            hideLabel={true}
                                                            workspaceId={workspaceId}
                                                            spaceId={(subtask as any).spaceId}
                                                            projectId={(subtask as any).projectId}
                                                            teamId={(subtask as any).teamId}
                                                            listId={(subtask as any).listId}
                                                        />
                                                    ) : (
                                                        <button type="button" className="w-full h-full flex items-center justify-start px-1 py-1 outline-none cursor-pointer text-left text-xs text-zinc-700" title={formattedValue}>
                                                            {formattedValue}
                                                        </button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        );
                                    }"""
    }
]

for patch in files_to_patch:
    with open(patch["path"], "r", encoding="utf-8") as f:
        content = f.read()
    
    # Check if we need to add imports and mutations
    
    # 1. Add import CustomFieldRenderer
    if "import { CustomFieldRenderer }" not in content:
        content = re.sub(
            r'(import [^\n]+;)',
            r'\1\nimport { CustomFieldRenderer } from "@/entities/task/components/CustomFieldRenderer";',
            content, count=1
        )
        
    # 2. Add updateCustomField mutation if it's missing and we have trpc
    if "updateCustomField" not in content and "trpc.useUtils" in content:
        content = re.sub(
            r'(const utils = trpc\.useUtils\(\);)',
            r'\1\n    const updateCustomField = trpc.task.customFields.update.useMutation({\n        onSuccess: () => { void utils.task.list.invalidate(); },\n    });',
            content, count=1
        )
    elif "updateCustomField" not in content and "const deleteTask =" in content: # For SubtasksTable
        content = re.sub(
            r'(const deleteTask = trpc.task.delete.useMutation)',
            r'const updateCustomField = trpc.task.customFields.update.useMutation({\n        onSuccess: () => { void utils.task.list.invalidate(); },\n    });\n    \1',
            content, count=1
        )
        
    content = content.replace(patch["search"], patch["replace"])
    
    with open(patch["path"], "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Patched {patch['path']}")
