const fs = require('fs');
const path = 'apps/frontend/src/features/dashboard/views/generic/FormView.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = 'align="end" sideOffset={16} className="w-[340px] p-4 rounded-2xl border border-zinc-200 shadow-2xl animate-in zoom-in-95 duration-200 z-[100]"';
const replacement = 'align="start" sideOffset={16} className="w-[340px] p-4 rounded-2xl border border-zinc-200 shadow-2xl animate-in zoom-in-95 duration-200 z-[100]"';

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(path, content);
    console.log('Fixed alignment');
} else {
    console.log('Target not found');
}
