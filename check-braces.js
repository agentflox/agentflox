const fs = require('fs');
const content = fs.readFileSync('apps/frontend/src/entities/task/components/TaskDetailModal.tsx', 'utf-8');
const lines = content.split('\n');
let p = 0; let b = 0;
for (let i = 2396; i < 3140; i++) {
  const line = lines[i];
  for (let c of line) {
    if (c === '(') p++;
    if (c === ')') p--;
    if (c === '{') b++;
    if (c === '}') b--;
  }
}
console.log('Parens: ' + p + ', Braces: ' + b);

