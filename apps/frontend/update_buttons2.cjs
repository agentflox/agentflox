const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/app/\\(protected\\)/dashboard/**/page.tsx');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  const pageHeaderRegex = /(<PageHeader[\s\S]*?actions=\s*\{\s*)(<Button[^>]*>[\s\S]*?<\/Button>)/;
  const match = content.match(pageHeaderRegex);
  
  if (match) {
    const oldButton = match[2];
    
    if (file.includes('tasks/page.tsx') || oldButton.includes('group-hover:rotate-90')) {
      continue;
    }

    const onClickMatch = oldButton.match(/onClick=\{([^\}]+)\}/) || oldButton.match(/onClick=\s*([^\s>]+)/);
    const onClick = onClickMatch ? onClickMatch[0] : "";

    const textMatch = oldButton.match(/(?:>| )(Add|New|Create)\s+\w+/i);
    const textLabel = textMatch ? textMatch[0].replace(/>/g, '').trim() : "New item";

    const newButton = `<Button
								${onClick}
								className="group flex items-center gap-2 bg-zinc-900 hover:bg-zinc-700 text-white dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 px-4 py-2 h-9 rounded-md transition-all duration-300 shadow-sm hover:shadow-md active:scale-[0.98]"
							>
								<Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
								<span className="font-medium text-sm">${textLabel}</span>
							</Button>`;

    content = content.replace(pageHeaderRegex, `$1${newButton}`);
    
    fs.writeFileSync(file, content);
    console.log('Updated PageHeader button in', file);
  }
}
