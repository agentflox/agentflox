
import re

files = [
    r"c:\Users\datng\agentflox\apps\frontend\src\features\dashboard\views\workspace\WorkspaceOverviewView.tsx",
    r"c:\Users\datng\agentflox\apps\frontend\src\features\dashboard\views\space\SpaceOverviewTab.tsx",
    r"c:\Users\datng\agentflox\apps\frontend\src\features\dashboard\views\project\ProjectOverviewTab.tsx",
    r"c:\Users\datng\agentflox\apps\frontend\src\features\dashboard\views\team\TeamOverviewTab.tsx"
]

def process_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    content = content.replace(r"className=\"max-h-[320px]\"", "className=\"max-h-[320px]\"")

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

for file in files:
    process_file(file)

