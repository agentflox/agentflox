const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'apps', 'backend', 'src', 'inngest', 'functions');

fs.readdirSync(directoryPath).forEach(file => {
    if (file.endsWith('.ts')) {
        const filePath = path.join(directoryPath, file);
        let content = fs.readFileSync(filePath, 'utf8');

        // This regex looks for:
        // },
        // { event: 'something' },
        // async ({
        // and replaces it with:
        //   triggers: [{ event: 'something' }],
        // },
        // async ({
        
        // Let's use a simpler and more robust regex for the typical Inngest v3 pattern
        const updatedContent = content.replace(
            /\},\s*\{\s*(event|cron):\s*([^}]+)\s*\},\s*(async\s*\(\{|async\s*function\s*\(\{|function\s*\(\{)/g,
            `  triggers: [{ $1: $2 }],\n  },\n  $3`
        );

        if (content !== updatedContent) {
            fs.writeFileSync(filePath, updatedContent);
            console.log(`Updated ${file}`);
        }
    }
});
