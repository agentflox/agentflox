# ===================================================================
# Multi-Stage Dockerfile for Agentflox Backend
# Optimized for minimal production images (<200MB)
# ===================================================================

# ===== Base image =====
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# ===== Dependencies layer =====
FROM base AS deps
WORKDIR /app

# Copy package files for all workspaces
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/
COPY packages/logger/package.json ./packages/logger/
COPY packages/config/package.json ./packages/config/
COPY packages/errors/package.json ./packages/errors/
COPY apps/backend/package.json ./apps/backend/

# Install dependencies
RUN pnpm install --frozen-lockfile --ignore-scripts

# ===== Build layer =====
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/packages/logger/node_modules ./packages/logger/node_modules
COPY --from=deps /app/packages/config/node_modules ./packages/config/node_modules
COPY --from=deps /app/packages/errors/node_modules ./packages/errors/node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules

# Copy source files
COPY packages/database ./packages/database
COPY packages/types ./packages/types
COPY packages/logger ./packages/logger
COPY packages/config ./packages/config
COPY packages/errors ./packages/errors
COPY apps/backend/ ./apps/backend/

# Generate Prisma client
RUN cd packages/database && pnpm run db:generate

# Build shared packages
RUN cd packages/types && pnpm run build
RUN cd packages/logger && pnpm run build
RUN cd packages/config && pnpm run build
RUN cd packages/errors && pnpm run build

# Build service
RUN cd apps/backend/ && pnpm run build

# ===== Production dependencies layer =====
FROM base AS prod-deps
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/
COPY packages/logger/package.json ./packages/logger/
COPY packages/config/package.json ./packages/config/
COPY packages/errors/package.json ./packages/errors/
COPY apps/backend/package.json ./apps/backend/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --ignore-scripts --prod

# ===== Runtime layer (API) =====
FROM node:20-alpine AS api

# Security: Run as non-root user
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 serviceio

WORKDIR /app

# Copy production dependencies
COPY --from=prod-deps --chown=serviceio:nodejs /app/node_modules ./node_modules
COPY --from=prod-deps --chown=serviceio:nodejs /app/packages/database/node_modules ./packages/database/node_modules

# Copy built artifacts
COPY --from=builder --chown=serviceio:nodejs /app/packages/database/src/generated ./packages/database/src/generated
COPY --from=builder --chown=serviceio:nodejs /app/packages/types/dist ./packages/types/dist
COPY --from=builder --chown=serviceio:nodejs /app/packages/logger/dist ./packages/logger/dist
COPY --from=builder --chown=serviceio:nodejs /app/packages/config/dist ./packages/config/dist
COPY --from=builder --chown=serviceio:nodejs /app/packages/errors/dist ./packages/errors/dist
COPY --from=builder --chown=serviceio:nodejs /app/apps/backend/dist ./apps/backend/dist

# Copy package.json files for module resolution
COPY --from=builder --chown=serviceio:nodejs /app/package.json ./
COPY --from=builder --chown=serviceio:nodejs /app/packages/database/package.json ./packages/database/
COPY --from=builder --chown=serviceio:nodejs /app/packages/types/package.json ./packages/types/
COPY --from=builder --chown=serviceio:nodejs /app/packages/logger/package.json ./packages/logger/
COPY --from=builder --chown=serviceio:nodejs /app/packages/config/package.json ./packages/config/
COPY --from=builder --chown=serviceio:nodejs /app/packages/errors/package.json ./packages/errors/
COPY --from=builder --chown=serviceio:nodejs /app/apps/backend/package.json ./apps/backend/
        
WORKDIR /app/apps/backend/

USER serviceio

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health/live || exit 1

EXPOSE 3001
ENV NODE_ENV=production PORT=3001

# Run API server
CMD ["node", "dist/main.api.js"]

# ===== Runtime layer (Worker) =====
FROM node:20-alpine AS worker

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 serviceio

WORKDIR /app

# Copy production dependencies
COPY --from=prod-deps --chown=serviceio:nodejs /app/node_modules ./node_modules
COPY --from=prod-deps --chown=serviceio:nodejs /app/packages/database/node_modules ./packages/database/node_modules

# Copy built artifacts
COPY --from=builder --chown=serviceio:nodejs /app/packages/database/src/generated ./packages/database/src/generated
COPY --from=builder --chown=serviceio:nodejs /app/packages/types/dist ./packages/types/dist
COPY --from=builder --chown=serviceio:nodejs /app/packages/logger/dist ./packages/logger/dist
COPY --from=builder --chown=serviceio:nodejs /app/packages/config/dist ./packages/config/dist
COPY --from=builder --chown=serviceio:nodejs /app/packages/errors/dist ./packages/errors/dist
COPY --from=builder --chown=serviceio:nodejs /app/apps/backend/dist ./apps/backend/dist

# Copy package.json files
COPY --from=builder --chown=serviceio:nodejs /app/package.json ./
COPY --from=builder --chown=serviceio:nodejs /app/packages/database/package.json ./packages/database/
COPY --from=builder --chown=serviceio:nodejs /app/packages/types/package.json ./packages/types/
COPY --from=builder --chown=serviceio:nodejs /app/packages/logger/package.json ./packages/logger/
COPY --from=builder --chown=serviceio:nodejs /app/packages/config/package.json ./packages/config/
COPY --from=builder --chown=serviceio:nodejs /app/packages/errors/package.json ./packages/errors/
COPY --from=builder --chown=serviceio:nodejs /app/apps/backend/package.json ./apps/backend/

WORKDIR /app/apps/backend

USER serviceio

# Worker health check (if WORKER_HEALTH_PORT is set)
ENV NODE_ENV=production

CMD ["node", "dist/main.worker.js"]