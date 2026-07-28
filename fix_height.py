import re

with open('apps/frontend/src/entities/task/components/CustomFieldRenderer.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace h-full min-h-[38px] with h-[38px]
content = re.sub(r'h-full min-h-\[38px\]', 'h-[38px]', content)

# Also fix TEXT_AREA min-h-[38px] h-auto to h-[38px]
content = re.sub(r'min-h-\[38px\]\s+w-full\s+justify-start\s+items-start\s+text-left\s+font-normal\s+text-sm\s+border-0\s+shadow-none\s+focus-visible:ring-0\s+whitespace-normal\s+h-auto',
                 'h-[38px] w-full justify-start items-center text-left font-normal text-sm border-0 shadow-none focus-visible:ring-0 whitespace-nowrap overflow-hidden', content)

with open('apps/frontend/src/entities/task/components/CustomFieldRenderer.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
