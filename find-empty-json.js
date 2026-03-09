const fs = require('fs');
const path = require('path');

function findEmptyPackageJson(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (file === 'node_modules' || file === '.git' || file === '.next' || file === 'dist') continue;

        try {
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                findEmptyPackageJson(fullPath);
            } else if (file === 'package.json') {
                if (stat.size === 0) {
                    console.log(`FOUND EMPTY PACKAGE.JSON: ${fullPath}`);
                } else {
                    const content = fs.readFileSync(fullPath, 'utf8').trim();
                    if (!content) {
                        console.log(`FOUND EMPTY (TRIMMED) PACKAGE.JSON: ${fullPath}`);
                    }
                }
            }
        } catch (e) {
            // ignore
        }
    }
}

console.log('Searching for empty package.json files...');
findEmptyPackageJson(process.cwd());
console.log('Done searching.');
