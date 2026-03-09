const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'packages/database/prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

const workforceModel = `
enum WorkforceMode {
  FLOW
  SWARM
}

enum WorkforceStatus {
  ACTIVE
  PAUSED
  DRAFT
  ARCHIVED
}

model Workforce {
  id          String   @id @default(cuid())
  name        String
  description String?
  mode        WorkforceMode
  status      WorkforceStatus @default(DRAFT)
  workspaceId String   @map("workspace_id")
  createdBy   String   @map("created_by")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  creator     User      @relation(fields: [createdBy], references: [id])

  @@index([workspaceId])
  @@index([createdBy])
  @@index([status])
  @@map("workforces")
}
`;

if (!schema.includes('model Workforce {')) {
    schema += workforceModel;
    schema = schema.replace('@@map("users")', 'workforces Workforce[]\n\n  @@map("users")');
    schema = schema.replace('@@map("workspaces")', 'workforces Workforce[]\n\n  @@map("workspaces")');
    fs.writeFileSync(schemaPath, schema);
    console.log("Updated schema.prisma successfully");
} else {
    console.log("schema.prisma already updated");
}
