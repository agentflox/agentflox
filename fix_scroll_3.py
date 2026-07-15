
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

    # match { array.length > N && ( <div ... > +{...} more ... </div> ) }
    content = re.sub(r"\{\w+\.length > \d+ && \([\s\S]*?</div>\s*\)\}", "", content)

    # We also need to fix </div> before </ScrollArea> if it was double-matched or skipped.
    # Actually wait, because the previous script failed to match the `more` block, it also failed to add `</ScrollArea>` to the lists!
    # Wait, did it add `</ScrollArea>`?
    # No, it did: `content = more_pattern.sub(r"\g<2>\n\t\t\t\t\t\t\t\t</ScrollArea>", content)`
    # Since `more_pattern` failed, `</ScrollArea>` was NEVER added for the lists in the `divide-y` sections!

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

for file in files:
    process_file(file)

