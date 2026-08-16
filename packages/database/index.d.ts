import type { PrismaClient as PrismaClientType } from './src/generated/prisma/index.js';

export {
  PrismaClient,
  Prisma,
  $Enums,
  IntegrationProvider,
  Visibility,
  WorkspaceRole,
  SpaceRole,
  ViewType,
  PermissionLevel,
  ConversationType,
  MessageRole,
  NotificationType,
  PostType,
  PostTopic,
  PaymentGateway,
  PaymentMethod,
  PaymentStatus,
  PurchaseStatus,
  BillingType,
  StatusType,
  TemplateEntityType,
  ModelName,
  PlanType,
  BillingPeriod,
} from './src/generated/prisma/index.js';

/** Type-only re-export — erased at runtime (safe for Turbopack). */
export type * from './src/generated/prisma/index.js';

export declare const prisma: PrismaClientType;
