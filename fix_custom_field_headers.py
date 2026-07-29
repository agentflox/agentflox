import glob
import re

files = glob.glob('apps/frontend/src/features/dashboard/views/generic/*.tsx')

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove the filter line regardless of exact spacing
    new_content = re.sub(
        r'\.filter\(\s*\([^)]*\)\s*=>\s*usedCustomFieldIds\.has\([^)]*\)\s*\)',
        '',
        content
    )
    
    if new_content != content:
        print(f"Fixed {filepath}")
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
