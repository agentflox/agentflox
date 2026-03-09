const fs = require('fs');
const path = require('path');

const files = [
    'apps/backend/service-server/package.json',
    'apps/frontend/package.json',
    'apps/marketing/package.json',
    'package.json',
    'packages/config/package.json',
    'packages/database/package.json',
    'packages/database/src/generated/prisma/package.json',
    'packages/errors/package.json',
    'packages/logger/package.json',
    'packages/types/package.json'
];

files.forEach(file => {
    const fullPath = path.resolve(process.cwd(), file);
    try {
        const content = fs.readFileSync(fullPath, 'utf8');
        try {
            JSON.parse(content);
            console.log(`✅ ${file}: Valid JSON`);
        } catch (e) {
            console.error(`❌ ${file}: Invalid JSON - ${e.message}`);
        }
    } catch (e) {
        console.error(`❌ ${file}: File not found or unreadable`);
    }
});
