const fs = require('fs');

const file = 'src/features/dashboard/views/generic/BoardView/index.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

const getLine = (str) => lines.findIndex(l => l.startsWith(str));

const taskCardStart = getLine('function TaskCard({');
const dropSlotAfterStart = getLine('function DropSlotAfter({');
const boardColumnStart = getLine('function BoardColumn({');
const boardViewStart = getLine('export function BoardView({'); 

console.log("TaskCard:", taskCardStart);
console.log("DropSlot:", dropSlotAfterStart);
console.log("BoardColumn:", boardColumnStart);
console.log("BoardView:", boardViewStart);

// Create BoardTaskCard.tsx
const taskCardContent = lines.slice(taskCardStart - 1, dropSlotAfterStart - 1).join('\n');
// We need to export it
const fixedTaskCard = taskCardContent.replace('function TaskCard({', 'export const BoardTaskCard = React.memo(function TaskCard({');
fs.writeFileSync('src/features/dashboard/views/generic/BoardView/BoardTaskCard.tsx', fixedTaskCard);

// Create BoardColumn.tsx
const columnContent = lines.slice(dropSlotAfterStart - 1, boardViewStart - 2).join('\n');
const fixedColumn = columnContent.replace('function BoardColumn({', 'export const BoardColumn = React.memo(function BoardColumn({');
fs.writeFileSync('src/features/dashboard/views/generic/BoardView/BoardColumn.tsx', fixedColumn);
