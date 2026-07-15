
import re
import sys

files = [
    r"c:\Users\datng\agentflox\apps\frontend\src\features\dashboard\views\space\SpaceOverviewTab.tsx",
    r"c:\Users\datng\agentflox\apps\frontend\src\features\dashboard\views\project\ProjectOverviewTab.tsx",
    r"c:\Users\datng\agentflox\apps\frontend\src\features\dashboard\views\team\TeamOverviewTab.tsx"
]

def process_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    if "import { ScrollArea }" not in content:
        content = content.replace("import { Badge } from \"@/components/ui/badge\";", "import { Badge } from \"@/components/ui/badge\";\nimport { ScrollArea } from \"@/components/ui/scroll-area\";")

    pattern = re.compile(
        r"(<div className=\"divide-y divide-slate-50\">)\s*\{(\w+)\.slice\([^)]+\)\.map",
        re.MULTILINE
    )
    content = pattern.sub(r"<ScrollArea className=\"max-h-[320px]\">\n\t\t\t\t\t\t\t\t\t\g<1>\n\t\t\t\t\t\t\t\t\t\t{\g<2>.map", content)

    more_pattern = re.compile(
        r"\{(\w+)\.length > \d+ && \(\s*<div[^>]*>.*?\+\1\.length - \d+.*?\s*</div>\s*\)\}\s*(</div>)",
        re.DOTALL
    )
    content = more_pattern.sub(r"\g<2>\n\t\t\t\t\t\t\t\t</ScrollArea>", content)

    # For Members section
    if "max-h-[320px]" not in content.split("<!-- Members -->")[-1] and "Members" in content:
        parts = content.split("Members", 1)
        if len(parts) > 1:
            part1, part2 = parts
            part2 = part2.replace(
                "<div className=\"px-5 py-4 flex flex-wrap gap-2\">",
                "<ScrollArea className=\"max-h-[320px]\">\n\t\t\t\t\t\t\t<div className=\"px-5 py-4 flex flex-wrap gap-2\">"
            )
            part2 = part2.replace(
                "							</div>\n						)}",
                "							</div>\n\t\t\t\t\t\t\t</ScrollArea>\n						)}"
            )
            content = part1 + "Members" + part2

    # A different members replace for some files that have slightly different indentation
    content = content.replace(
        "							<div className=\"px-5 py-4 flex flex-wrap gap-2\">",
        "							<ScrollArea className=\"max-h-[320px]\">\n\t\t\t\t\t\t\t\t<div className=\"px-5 py-4 flex flex-wrap gap-2\">"
    ).replace(
        "								</div>\n						)}",
        "								</div>\n\t\t\t\t\t\t\t</ScrollArea>\n						)}"
    ).replace(
        "								</div>\n							)}",
        "								</div>\n\t\t\t\t\t\t\t</ScrollArea>\n							)}"
    )

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

for file in files:
    process_file(file)

