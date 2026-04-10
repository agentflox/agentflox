import fs from 'fs';
import path from 'path';

const dir = './apps/frontend/src/features/dashboard/views/generic/';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  let updated = false;

  // Single-line pattern:
  const singleLineRegex = /const taskListInput = useMemo\(\(\) => \(\{ spaceId, projectId, teamId, listId, includeRelations: true, page: 1, pageSize: 500 \}\), \[spaceId, projectId, teamId, listId\]\);/g;
  if (singleLineRegex.test(content)) {
    content = content.replace(singleLineRegex, `const taskListInput = useMemo(() => ({\n        spaceId: spaceId && !projectId && !listId ? spaceId : undefined,\n        projectId: projectId && !listId ? projectId : undefined,\n        teamId,\n        listId,\n        includeRelations: true,\n        page: 1,\n        pageSize: 500,\n    }), [spaceId, projectId, teamId, listId]);`);
    updated = true;
  }

  if (updated) {
    fs.writeFileSync(filePath, content, 'utf8');
    // console.log('Updated ' + file);
  }
}
