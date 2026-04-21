import os

path = 'apps/frontend/src/features/dashboard/views/generic/FormView.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_btn = 'className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white hover:bg-black/80 flex items-center justify-center cursor-pointer transition-all active:scale-90"'
new_btn = 'className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-black/50 text-white hover:bg-black/70 flex items-center justify-center cursor-pointer transition-all active:scale-90"'

old_icon = '<X className="h-4 w-4" />'
new_icon = '<X className="h-3 w-3" />'

if old_btn in content:
    content = content.replace(old_btn, new_btn)
    content = content.replace(old_icon, new_icon)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Sized down")
else:
    print("Not found")
