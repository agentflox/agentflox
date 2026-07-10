const fs = require('fs');

const file = 'src/features/dashboard/views/generic/BoardView/index.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

const getLine = (str) => lines.findIndex(l => l.startsWith(str));

const taskCardStart = getLine('function TaskCard({');
const dropSlotAfterStart = getLine('function DropSlotAfter({');
const boardColumnStart = getLine('function BoardColumn({');
const boardViewStart = getLine('export function BoardView({'); 

// Grab imports and types (up to line 600)
const importsAndTypes = lines.slice(0, taskCardStart - 1).join('\n');
const extraImports = `import React from 'react';\nimport { memo } from 'react';\n`;

// Fix BoardTaskCard.tsx
let taskCardContent = fs.readFileSync('src/features/dashboard/views/generic/BoardView/BoardTaskCard.tsx', 'utf8');
fs.writeFileSync('src/features/dashboard/views/generic/BoardView/BoardTaskCard.tsx', extraImports + importsAndTypes + '\n\n' + taskCardContent);

// Fix BoardColumn.tsx
// BoardColumn needs DropSlotAfter too, because it uses it. Wait, DropSlotAfter is in BoardColumn file because we sliced from dropSlotAfterStart!
let columnContent = fs.readFileSync('src/features/dashboard/views/generic/BoardView/BoardColumn.tsx', 'utf8');
// BoardColumn also uses TaskCard, so it needs to import it.
const columnImports = extraImports + importsAndTypes + '\nimport { BoardTaskCard as TaskCard } from "./BoardTaskCard";\n';
fs.writeFileSync('src/features/dashboard/views/generic/BoardView/BoardColumn.tsx', columnImports + '\n\n' + columnContent);

// Fix index.tsx
const indexImports = lines.slice(0, taskCardStart - 1).join('\n') + 
'\nimport { memo } from "react";\nimport { BoardTaskCard } from "./BoardTaskCard";\nimport { BoardColumn } from "./BoardColumn";\n';
const indexContent = lines.slice(boardViewStart).join('\n');
fs.writeFileSync('src/features/dashboard/views/generic/BoardView/index.tsx', indexImports + '\n\n' + indexContent);

console.log("Refactoring complete");
