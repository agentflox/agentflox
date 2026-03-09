const fs = require('fs');
const os = require('os');
// Use the absolute path provided in context
const path = 'c:/Users/datng/agentflox/apps/frontend/src/features/dashboard/views/generic/BoardView.tsx';

try {
    let content = fs.readFileSync(path, 'utf8');
    // Handle both CRLF and LF
    let lines = content.split(/\r?\n/);

    console.log(`Total lines: ${lines.length}`);

    // Check line 5025 (index 5024)
    const line5025 = lines[5024];
    console.log(`Line 5025 content: "${line5025}"`);

    // Check if it looks like the garbage we identified
    if (line5025 && line5025.includes('id: "status"')) {
        console.log("Found garbage block start. Proceeding to fix.");

        // Remove lines 5025 to 5102 (indices 5024 to 5101)
        // Keep lines 1-5024 (indices 0-5023)
        // Keep lines 5103 onwards (indices 5102 onwards)

        const before = lines.slice(0, 5024);
        const after = lines.slice(5102);

        const newContent = [...before, ...after].join(os.EOL);

        fs.writeFileSync(path, newContent);
        console.log("File successfully updated.");
    } else {
        console.log("Line 5025 did not match expected garbage pattern. Aborting.");
        // Output surrounding lines for debugging
        for (let i = 5020; i < 5030; i++) {
            console.log(`${i + 1}: ${lines[i]}`);
        }
    }
} catch (e) {
    console.error("Error:", e);
}
