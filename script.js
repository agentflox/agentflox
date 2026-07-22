const fs = require('fs');
const content = fs.readFileSync('apps/frontend/src/entities/task/components/TaskDetailModal.tsx', 'utf-8');
const lines = content.split('\n');
let divCount = 0;
for (let i = 2396; i < 3140; i++) {
  const line = lines[i];
  const opens = (line.match(/<div/g) || []).length;
  const closes = (line.match(/<\/div>/g) || []).length;
  divCount += opens - closes;
  if (opens !== closes) {
    console.log('Line ' + (i+1) + ': open ' + opens + ' close ' + closes + ' balance ' + divCount);
  }
}
console.log('Final balance:', divCount);
