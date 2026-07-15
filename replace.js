const fs = require('fs');
const files = [
  'apps/frontend/src/features/dashboard/views/generic/ListView.tsx',
  'apps/frontend/src/features/dashboard/views/generic/TableView.tsx'
];
files.forEach(f => {
  let text = fs.readFileSync(f, 'utf8');
  text = text.replace(
    /<div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-zinc-300 z-10" onMouseDown=\{\(e\) => startResize\(e, ([^)]+)\)\} onClick=\{\(e\) => e\.stopPropagation\(\)\} \/>/g,
    '<div className="absolute -right-1.5 top-0 bottom-0 w-3 cursor-col-resize z-20 group/resizer flex justify-center" onMouseDown={(e) => startResize(e, $1)} onClick={(e) => e.stopPropagation()}><div className="w-[2px] h-full bg-transparent group-hover/resizer:bg-zinc-300 transition-colors" /></div>'
  );
  fs.writeFileSync(f, text);
});
console.log('done');
