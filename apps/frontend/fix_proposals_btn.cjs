const fs = require('fs');

const files = [
  'src/app/(protected)/dashboard/proposals/page.tsx',
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Match the specific button pattern with tabs
  const regex = /\t\t\t\t\t\t\t\t<Button\s*\n\s*onClick=\{[^}]+\}\s*\n\s*className="max-w-16 group relative overflow-hidden bg-gradient-to-br from-cyan-500[\s\S]*?<\/Button>/;
  
  const match = content.match(regex);
  if (match) {
    const onClickMatch = match[0].match(/onClick=\{([^}]+)\}/);
    const onClick = onClickMatch ? `onClick={${onClickMatch[1]}}` : '';
    
    const newButton = `\t\t\t\t\t\t\t\t<Button
\t\t\t\t\t\t\t\t\t${onClick}
\t\t\t\t\t\t\t\t\tclassName="group flex items-center gap-2 bg-zinc-900 hover:bg-zinc-700 text-white dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 px-4 py-2 h-9 rounded-md transition-all duration-300 shadow-sm hover:shadow-md active:scale-[0.98]"
\t\t\t\t\t\t\t\t>
\t\t\t\t\t\t\t\t\t<Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
\t\t\t\t\t\t\t\t\t<span className="font-medium text-sm">New Proposal</span>
\t\t\t\t\t\t\t\t</Button>`;
    
    content = content.replace(regex, newButton);
    fs.writeFileSync(file, content);
    console.log('Updated', file);
  } else {
    console.log('No match in', file);
    
    // Show around the button area
    const idx = content.indexOf('from-cyan-500');
    if (idx > 0) {
      console.log('Nearby content:', JSON.stringify(content.substring(idx - 200, idx + 400)));
    }
  }
}
