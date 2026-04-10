const fs = require('fs');
const path = require('path');

const dir = './apps/frontend/src/features/dashboard/views/generic/';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  let updated = false;

  // Single-line pattern:
  const singleLineRegex = /const taskListInput = useMemo\(\(\) => \(\{ spaceId, projectId, teamId, listId, includeRelations: true, page: 1, pageSize: 500 \}\), \[spaceId, projectId, teamId, listId\]\);/g;
  if (singleLineRegex.test(content)) {
    content = content.replace(singleLineRegex, `const taskListInput = useMemo(() => ({
        spaceId: spaceId && !projectId && !listId ? spaceId : undefined,
        projectId: projectId && !listId ? projectId : undefined,
        teamId,
        listId,
        includeRelations: true,
        page: 1,
        pageSize: 500,
    }), [spaceId, projectId, teamId, listId]);`);
    updated = true;
  }

  // Board view pattern might be different:
  const multiLineRegex = /const taskListInput = useMemo\(\(\) => \(\{\s*\.\.\.\(spaceId \? \{ spaceId \} : \{\}\),\s*\.\.\.\(projectId \? \{ projectId \} : \{\}\),\s*\.\.\.\(teamId \? \{ teamId \} : \{\}\),\s*\.\.\.\(listId \? \{ listId \} : \{\}\),\s*includeRelations: true(?: as const)?,\s*page: 1,\s*pageSize: 500(?:,\s*)?\}\), \[spaceId, projectId, teamId, listId\]\);/g;
  if (multiLineRegex.test(content)) {
    content = content.replace(multiLineRegex, `const taskListInput = useMemo(() => ({
        spaceId: spaceId && !projectId && !listId ? spaceId : undefined,
        projectId: projectId && !listId ? projectId : undefined,
        teamId,
        listId,
        includeRelations: true,
        page: 1,
        pageSize: 500,
    }), [spaceId, projectId, teamId, listId]);`);
    updated = true;
  }

  if (updated) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + file);
  }
}
