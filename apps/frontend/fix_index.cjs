const fs = require('fs');

const file = 'src/features/dashboard/views/generic/BoardView/index.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

// The boardView function starts after the misplaced imports
// We need to:
// 1. Keep lines 1-103 (the original imports section, without the duplicate types)
// 2. Skip lines 104-603 (all the duplicated type defs and helpers)
// 3. Add sub-component imports after line 103
// 4. Keep line 604 onwards (the actual BoardView function)

// Find the actual BoardView function start
const boardViewFuncLine = lines.findIndex(l => l.startsWith('export function BoardView({'));
console.log('BoardView function starts at line:', boardViewFuncLine + 1); // 1-indexed

// Find where the types section starts (after the listViewConstants import)
const typesStartLine = lines.findIndex(l => l.startsWith('// Types'));
console.log('Types section starts at line:', typesStartLine + 1);

// Find the misplaced imports block (after hasSubtasks)
const hasSubtasksLine = lines.findIndex(l => l.includes('const hasSubtasks ='));
console.log('hasSubtasks at line:', hasSubtasksLine + 1);

// Build the new file:
// header (lines 0..typesStartLine-1) = imports only
const header = lines.slice(0, typesStartLine).join('\n');

// sub-component imports to add
const subImports = `import { BoardTaskCard } from "./BoardTaskCard";
import { BoardColumn } from "./BoardColumn";
`;

// But we also need the shared types that BoardView itself uses:
// - FilterState, FilterGroup, BoardSettings, BoardViewSavedConfig, etc.
// These are defined in lines typesStartLine..boardViewFuncLine-1
// BUT they're already duplicated in sub-files, so we need to keep them in index.tsx too
// since BoardView uses them.
// Actually let's just keep the types but remove the inline component code.

// The types/helpers the BoardView function needs are in lines typesStartLine..hasSubtasksLine
const typesBlock = lines.slice(typesStartLine, hasSubtasksLine + 1).join('\n');

// Skip the 3 misplaced import lines after hasSubtasks (lines hasSubtasksLine+1 to boardViewFuncLine-1)
// Then get the actual BoardView function
const boardViewFunc = lines.slice(boardViewFuncLine).join('\n');

const newContent = header + '\n' + subImports + '\n' + typesBlock + '\n\n' + boardViewFunc;

fs.writeFileSync(file, newContent);
console.log('Done! New file has', newContent.split('\n').length, 'lines');
