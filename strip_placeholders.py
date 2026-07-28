import re

with open('apps/frontend/src/entities/task/components/CustomFieldRenderer.tsx', 'r') as f:
    content = f.read()

# Remove placeholder={...}
content = re.sub(r'\s*placeholder=\{[^}]+\}', '', content)
# Remove placeholder="..."
content = re.sub(r'\s*placeholder=\"[^\"]+\"', '', content)
# Remove placeholder=`...`
content = re.sub(r'\s*placeholder=`[^`]+`', '', content)

with open('apps/frontend/src/entities/task/components/CustomFieldRenderer.tsx', 'w') as f:
    f.write(content)
