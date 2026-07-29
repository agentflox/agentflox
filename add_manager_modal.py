import re

def add_modal_to_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add import if missing
    if 'import { CustomFieldsManagerModal }' not in content:
        content = content.replace('import { FieldsPanelSlideout } from "@/features/dashboard/components/shared/FieldsPanelSlideout";',
                                'import { CustomFieldsManagerModal } from "@/entities/customfields/components/CustomFieldsManagerModal";\nimport { FieldsPanelSlideout } from "@/features/dashboard/components/shared/FieldsPanelSlideout";')

    # Add state if missing
    if 'const [managerModalOpen, setManagerModalOpen]' not in content:
        content = content.replace('const [fieldsPanelOpen, setFieldsPanelOpen] = useState(false);',
                                'const [fieldsPanelOpen, setFieldsPanelOpen] = useState(false);\n    const [managerModalOpen, setManagerModalOpen] = useState(false);')

    # Fix FieldsPanelSlideout's onOpenManagerModal
    if 'onOpenManagerModal={() => setManagerModalOpen(true)}' not in content:
        content = re.sub(
            r'onOpenManagerModal=\{\(\) => \{\s*setFieldsPanelOpen\(false\);\s*setCreateFieldModalOpen\(true\);\s*\}\}',
            'onOpenManagerModal={() => setManagerModalOpen(true)}',
            content
        )
        content = re.sub(
            r'onOpenManagerModal=\{\(\) => setCreateFieldModalOpen\(true\)\}',
            'onOpenManagerModal={() => setManagerModalOpen(true)}',
            content
        )

    # Add CustomFieldsManagerModal component if missing
    if '<CustomFieldsManagerModal' not in content:
        modal_code = """
            <CustomFieldsManagerModal
                open={managerModalOpen}
                onOpenChange={setManagerModalOpen}
                workspaceId={workspaceId ?? ""}
                initialLocation={
                    listId ? `list:${listId}` :
                        folderId ? `folder:${folderId}` :
                            projectId ? `project:${projectId}` :
                                spaceId ? `space:${spaceId}` :
                                    "all" as any
                }
            />"""
        # Insert after FieldsPanelSlideout
        content = re.sub(r'(<FieldsPanelSlideout[\s\S]*?/>)', r'\1' + modal_code, content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

add_modal_to_file('apps/frontend/src/features/dashboard/views/generic/TableView.tsx')
add_modal_to_file('apps/frontend/src/features/dashboard/views/generic/GanttView.tsx')
