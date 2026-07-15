
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

    # The file currently has `<ScrollArea className="max-h-[320px]">` before `<div className="divide-y divide-slate-50">`
    # but misses the closing `</ScrollArea>` after the `</div>` that closes `divide-y divide-slate-50`.
    # And we just removed the `+X more` blocks using `fix_scroll_3.py`.
    
    # We can find each `<ScrollArea className="max-h-[320px]">` and add `</ScrollArea>` at the right place.
    # Actually, a simpler way: find `<div className="divide-y divide-slate-50">`, it should end with `</div>` right before `)}` or `</div>` for the container.
    # Let us just format it with prettier. Wait, prettier won"t fix missing closing tags.

    # Let"s fix it by regex:
    # `</div>\s*)\}` -> `</div>\n\t\t\t\t\t\t\t\t</ScrollArea>\n\t\t\t\t\t\t\t)}`
    # BUT we only want to do this for the sections that have `<ScrollArea...`
    # A safer way: find `className="divide-y divide-slate-50">` and its matching closing tag.
    
    content = re.sub(
        r"(<div className=\"divide-y divide-slate-50\">[\s\S]*?</div>)\s*\)\}",
        r"\g<1>\n\t\t\t\t\t\t\t\t</ScrollArea>\n\t\t\t\t\t\t\t)}",
        content
    )

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

for file in files:
    process_file(file)

