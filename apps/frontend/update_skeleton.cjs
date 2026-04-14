const fs = require('fs');
const glob = require('glob');
const path = require('path');

const files = glob.sync('src/app/\\(protected\\)/dashboard/**/page.tsx');
let updatedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (content.includes('className="h-[400px] w-full rounded-md border flex items-center justify-center"')) {
    const regex = /<div className="h-\[400px\] w-full rounded-md border flex items-center justify-center">\s*<div className="h-full w-full animate-pulse bg-muted" \/>\s*<\/div>/g;
    
    if (regex.test(content)) {
      content = content.replace(regex, '<DataTableSkeleton columnCount={6} rowCount={10} />');
      
      // Ensure import exists
      if (!content.includes('DataTableSkeleton')) {
        const importStatement = "import { DataTableSkeleton } from \"@/components/ui/data-table-skeleton\";\n";
        const lastImportIndex = content.lastIndexOf('import ');
        if (lastImportIndex !== -1) {
          const endOfLine = content.indexOf('\n', lastImportIndex);
          content = content.slice(0, endOfLine + 1) + importStatement + content.slice(endOfLine + 1);
        }
      }
      
      fs.writeFileSync(file, content);
      updatedCount++;
      console.log('Updated ' + file);
    }
  }
}
console.log('Total updated: ' + updatedCount);
