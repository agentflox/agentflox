const fs = require('fs');

const file = 'c:/Users/datng/agentflox/apps/frontend/src/entities/documents/components/DocumentCreationModal.tsx';
let content = fs.readFileSync(file, 'utf8');

const newUiLogic = fs.readFileSync('c:/Users/datng/agentflox/scratch/doc_ui.tsx', 'utf8');

const uiRegex = /<div className="overflow-y-auto flex-1 py-1 max-h-\[320px\] px-1">[\s\S]*?(?=<\/PopoverContent>)/;
if (content.match(uiRegex)) {
  content = content.replace(uiRegex, newUiLogic + '\n\t\t\t\t\t\t\t\t\t');
}

// Ensure ListIcon import
if (!content.includes('ListIcon }')) {
  content = content.replace(/import \{ FolderIcon \} from "@\/entities\/folders\/components\/FolderIcon";/, 'import { FolderIcon } from "@/entities/folders/components/FolderIcon";\nimport { ListIcon } from "lucide-react";');
}

fs.writeFileSync(file, content);
console.log('Patched ' + file);
