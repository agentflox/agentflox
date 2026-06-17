import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.resolve(__dirname, "prisma/schema.prisma");

const content = fs.readFileSync(schemaPath, "utf-8");
const lines = content.split("\n");

let found = false;
for (let i = 0; i < lines.length; i++) {
  const trimmed = lines[i].trim();
  if (trimmed.startsWith("model AgentTool ") || trimmed === "model AgentTool {") {
    console.log(`Found 'model AgentTool' on line ${i + 1}:`);
    for (let j = i; j < Math.min(lines.length, i + 50); j++) {
      console.log(`${j + 1}: ${lines[j]}`);
      if (lines[j].includes("}")) {
         break;
      }
    }
    found = true;
    break;
  }
}

if (!found) {
  console.log("Could not find model AgentTool");
}
