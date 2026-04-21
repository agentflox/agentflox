path = 'apps/frontend/src/features/dashboard/views/generic/FormView.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_btn = 'className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-black/50 text-white hover:bg-black/70 flex items-center justify-center cursor-pointer transition-all active:scale-90"'
new_btn = 'className="absolute top-2 right-2 left-auto h-5 w-5 rounded-full bg-black/50 text-white hover:bg-black/70 flex items-center justify-center cursor-pointer transition-all active:scale-90"'

old_align = 'align="start" sideOffset={16} className="w-[340px]'
new_align = 'align="end" sideOffset={16} className="w-[340px]'

if old_btn in content or old_align in content:
    content = content.replace(old_btn, new_btn)
    content = content.replace(old_align, new_align)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Repositioned")
else:
    print("Not found")
