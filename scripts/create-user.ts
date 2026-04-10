import { PrismaClient } from "../packages/database/src/generated/prisma";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

// Simple .env loader
const envPath = path.resolve(__dirname, "../apps/backend/.env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  lines.forEach((line) => {
    const parts = line.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join("=").trim().replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  });
}

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("Password123!", 10);
  await prisma.user.upsert({
    where: { email: "admin@agentflox.com" },
    update: { password: hash },
    create: {
      email: "admin@agentflox.com",
      password: hash,
      name: "Admin User",
    },
  });
  console.log("User created/updated: admin@agentflox.com / Password123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
