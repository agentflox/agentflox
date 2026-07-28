import re

with open('apps/frontend/src/entities/task/components/CustomFieldRenderer.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure all inputs have rounded-sm to match the cell ring
content = content.replace('"border-0 shadow-none', '"rounded-sm border-0 shadow-none')
content = content.replace("'border-0 shadow-none", "'rounded-sm border-0 shadow-none")

with open('apps/frontend/src/entities/task/components/CustomFieldRenderer.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
