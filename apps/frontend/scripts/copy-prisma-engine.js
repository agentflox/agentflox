// scripts/copy-prisma-engine.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Go up three levels from apps/frontend/scripts to reach monorepo root
const rootDir = path.resolve(__dirname, "..", "..", "..");

console.log("Monorepo root:", rootDir);

// These are the Prisma engine filenames to look for
const engineFiles = [
  "libquery_engine-rhel-openssl-3.0.x.so.node",
  "libquery_engine-debian-openssl-3.0.x.so.node"
];

// The source directories we'll search in (new unified Prisma output: src/generated/prisma)
const sourceDirs = [
  // Generated client output
  path.join(rootDir, "packages/database/src/generated/prisma"),
  path.join(rootDir, "apps/frontend/node_modules/@agentflox/database/src/generated/prisma"),
  path.join(rootDir, "node_modules/.pnpm/node_modules/@agentflox/database/src/generated/prisma"),

  // Prisma package locations
  path.join(rootDir, "packages/database/node_modules/prisma"),
  path.join(rootDir, "apps/frontend/node_modules/@agentflox/database/node_modules/prisma"),
  path.join(rootDir, "apps/frontend/node_modules/prisma"),
  path.join(rootDir, "node_modules/.pnpm/prisma@6.17.0_typescript@5.9.3/node_modules/prisma"),
  path.join(rootDir, "node_modules/.pnpm/node_modules/@agentflox/database/node_modules/prisma"),
  path.join(rootDir, "node_modules/.pnpm/node_modules/prisma"),
];

// Where we want to copy it to (based on Vercel's search paths and unified client output)
const targetDirs = [
  // Standard Prisma client locations
  path.join(rootDir, "apps/frontend/node_modules/.prisma/client"),
  path.join(rootDir, "apps/frontend/node_modules/@prisma/client"),
  path.join(rootDir, "apps/frontend/.next/server/chunks"),

  // Our generated client outputs
  path.join(rootDir, "apps/frontend/src/generated/prisma"),
  path.join(rootDir, "packages/database/src/generated/prisma"),
  path.join(rootDir, "packages/database/src/.prisma/client"),
];

let copied = false;

for (const dir of sourceDirs) {
  for (const engineFile of engineFiles) {
    const source = path.join(dir, engineFile);
    if (fs.existsSync(source)) {
      console.log(`✅ Found Prisma engine: ${source}`);

      for (const targetDir of targetDirs) {
        const target = path.join(targetDir, engineFile);
        fs.mkdirSync(targetDir, { recursive: true });
        fs.copyFileSync(source, target);
        console.log(`→ Copied to ${target}`);
      }

      copied = true;
      break;
    }
  }
  if (copied) break;
}

if (!copied) {
  console.error("❌ Prisma engine file not found in any known directory!");
  console.error("Checked:\n" + sourceDirs.join("\n"));
  process.exit(1);
}