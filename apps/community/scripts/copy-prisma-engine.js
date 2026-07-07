// scripts/copy-prisma-engine.js
// Copies the Prisma engine binary into THIS app's own directories only.
// Each app runs its own copy of this script in parallel — writing to separate
// destinations prevents EBUSY/EPERM race conditions on Windows.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// appDir  = apps/community
// rootDir = monorepo root
const appDir = path.resolve(__dirname, "..");
const rootDir = path.resolve(__dirname, "..", "..", "..");

console.log("App dir:", appDir);

const engineFiles = [
  "libquery_engine-rhel-openssl-3.0.x.so.node",
  "libquery_engine-debian-openssl-3.0.x.so.node",
];

// Search for the engine in the shared database package output
const sourceDirs = [
  path.join(rootDir, "packages/database/src/generated/prisma_fixed"),
  path.join(rootDir, "packages/database/src/generated/prisma"),
  path.join(appDir, "node_modules/@agentflox/database/src/generated/prisma_fixed"),
  path.join(appDir, "node_modules/@agentflox/database/src/generated/prisma"),
  path.join(rootDir, "node_modules/.pnpm/node_modules/@agentflox/database/src/generated/prisma_fixed"),
  path.join(rootDir, "node_modules/.pnpm/node_modules/@agentflox/database/src/generated/prisma"),
];

// Only copy into THIS app's own directories — never touch another app's paths
const targetDirs = [
  path.join(appDir, "node_modules/.prisma/client"),
  path.join(appDir, "node_modules/@prisma/client"),
  path.join(appDir, ".next/server/chunks"),
  path.join(appDir, "src/generated/prisma_fixed"),
  path.join(appDir, "src/generated/prisma"),
];

let copied = false;

for (const dir of sourceDirs) {
  for (const engineFile of engineFiles) {
    const source = path.join(dir, engineFile);
    if (fs.existsSync(source)) {
      console.log(`✅ Found Prisma engine: ${source}`);

      for (const targetDir of targetDirs) {
        const target = path.join(targetDir, engineFile);
        try {
          fs.mkdirSync(targetDir, { recursive: true });
          fs.copyFileSync(source, target);
          console.log(`→ Copied to ${target}`);
        } catch (err) {
          // EBUSY/ENOENT on optional targets (e.g. .next/server/chunks before a build) is fine
          if (err.code !== "EBUSY" && err.code !== "ENOENT") throw err;
          console.warn(`⚠ Skipped ${target}: ${err.code}`);
        }
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