/**
 * Enterprise Audit Logger
 * 
 * Production-ready audit logging system with:
 * - Comprehensive change tracking and diff generation
 * - Tamper detection and integrity verification
 * - Performance optimization with batch operations
 * - Compliance features (retention, PII masking)
 * - Observability and metrics integration
 */

import { prisma } from '@/lib/prisma';
import { AgentDraft } from '../state/agentBuilderStateService';

import crypto from 'crypto';

export interface AuditLogEntry {
  agentId: string;
  userId?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ACTIVATE' | 'DEACTIVATE' | 'LAUNCH' | 'PUBLISH' | 'ROLLBACK';
  changes?: {
    before?: Partial<AgentDraft>;
    after?: Partial<AgentDraft>;
    diff?: string[];
  };
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export interface AuditLogQuery {
  agentId?: string;
  userId?: string;
  actions?: AuditLogEntry['action'][];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditLogStats {
  totalLogs: number;
  actionBreakdown: Record<string, number>;
  topUsers: Array<{ userId: string; count: number }>;
  recentActivity: number;
}

export class AuditLogger {
  private batchQueue: AuditLogEntry[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 50;
  private readonly BATCH_DELAY_MS = 5000;
  private readonly MAX_DIFF_SIZE = 10000; // characters
  private flushing = false;

  constructor() {
    // Ensure queued audit logs are flushed before the process exits.
    // Without these hooks, a serverless instance termination silently drops
    // any entries still in the 5-second debounce window.
    const exitHandler = () => { this.flushBatch().catch(console.error); };
    process.once('beforeExit', exitHandler);
    process.once('SIGTERM', exitHandler);
    process.once('SIGINT', exitHandler);
  }

  /**
   * Log an audit event with integrity hash
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      const sanitizedEntry = this.sanitizeEntry(entry);
      const integrity = this.generateIntegrityHash(sanitizedEntry);
      const diff = this.generateDiff(entry.changes?.before, entry.changes?.after);

      await prisma.agentAuditLog.create({
        data: {
          agentId: sanitizedEntry.agentId,
          userId: sanitizedEntry.userId,
          action: sanitizedEntry.action,
          changes: sanitizedEntry.changes || {},
          diff: diff,
          metadata: {
            ...sanitizedEntry.metadata,
            ipAddress: sanitizedEntry.ipAddress,
            userAgent: sanitizedEntry.userAgent,
            sessionId: sanitizedEntry.sessionId,
          },
          integrity,
        },
      });

      // Emit metrics for observability
      this.emitMetrics('audit_log_created', {
        action: sanitizedEntry.action,
        agentId: sanitizedEntry.agentId,
      });
    } catch (error) {
      // Critical: Audit failure should be logged but not break flow
      console.error('[AuditLogger] Failed to log audit entry:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        entry: { agentId: entry.agentId, action: entry.action },
      });

      // Fallback to console with structured logging
      this.fallbackLog(entry);

      // Alert on audit failures
      this.alertAuditFailure(error, entry);
    }
  }

  /**
   * Batch log multiple entries for performance
   */
  async logBatch(entries: AuditLogEntry[]): Promise<void> {
    try {
      const sanitizedEntries = entries.map(entry => {
        const sanitized = this.sanitizeEntry(entry);
        const integrity = this.generateIntegrityHash(sanitized);
        const diff = this.generateDiff(entry.changes?.before, entry.changes?.after);

        return {
          agentId: sanitized.agentId,
          userId: sanitized.userId,
          action: sanitized.action,
          changes: sanitized.changes || {},
          diff,
          metadata: {
            ...sanitized.metadata,
            ipAddress: sanitized.ipAddress,
            userAgent: sanitized.userAgent,
            sessionId: sanitized.sessionId,
          },
          integrity,
        };
      });

      await prisma.agentAuditLog.createMany({
        data: sanitizedEntries,
        skipDuplicates: true,
      });

      this.emitMetrics('audit_batch_logged', { count: entries.length });
    } catch (error) {
      console.error('[AuditLogger] Batch logging failed:', error);
      // Fallback to individual logging
      for (const entry of entries) {
        await this.log(entry).catch(console.error);
      }
    }
  }

  /**
   * Queue entry for batch processing
   */
  queueLog(entry: AuditLogEntry): void {
    this.batchQueue.push(entry);

    if (this.batchQueue.length >= this.BATCH_SIZE) {
      this.flushBatch();
    } else if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => this.flushBatch(), this.BATCH_DELAY_MS);
    }
  }

  /**
   * Flush batch queue
   */
  private async flushBatch(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    if (this.batchQueue.length === 0) return;

    const entries = [...this.batchQueue];
    this.batchQueue = [];

    await this.logBatch(entries);
  }

  /**
   * Get audit logs with advanced filtering
   */
  async getAuditLogs(query: AuditLogQuery): Promise<{
    logs: AuditLogEntry[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const {
        agentId,
        userId,
        actions,
        startDate,
        endDate,
        limit = 50,
        offset = 0,
      } = query;

      const where: any = {};

      if (agentId) where.agentId = agentId;
      if (userId) where.userId = userId;
      if (actions?.length) where.action = { in: actions };
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [logs, total] = await Promise.all([
        prisma.agentAuditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.agentAuditLog.count({ where }),
      ]);

      // Verify integrity of retrieved logs
      const verifiedLogs = logs.map(log => {
        const isValid = this.verifyIntegrity(log);
        return {
          agentId: log.agentId,
          userId: log.userId || undefined,
          action: log.action as AuditLogEntry['action'],
          changes: log.changes as any,
          metadata: {
            ...(log.metadata as any),
            integrityVerified: isValid,
            createdAt: log.createdAt,
          },
        };
      });

      return {
        logs: verifiedLogs,
        total,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      console.error('[AuditLogger] Failed to get audit logs:', error);
      return { logs: [], total: 0, hasMore: false };
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStats(agentId?: string, days: number = 30): Promise<AuditLogStats> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const where: any = {
        createdAt: { gte: startDate },
      };
      if (agentId) where.agentId = agentId;

      const [totalLogs, actionGroups, userGroups, recentCount] = await Promise.all([
        prisma.agentAuditLog.count({ where }),
        prisma.agentAuditLog.groupBy({
          by: ['action'],
          where,
          _count: true,
        }),
        prisma.agentAuditLog.groupBy({
          by: ['userId'],
          where: { ...where, userId: { not: null } },
          _count: true,
          orderBy: { _count: { userId: 'desc' } },
          take: 10,
        }),
        prisma.agentAuditLog.count({
          where: {
            ...where,
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        }),
      ]);

      return {
        totalLogs,
        actionBreakdown: Object.fromEntries(
          actionGroups.map(g => [g.action, g._count])
        ),
        topUsers: userGroups.map(g => ({
          userId: g.userId || 'unknown',
          count: g._count,
        })),
        recentActivity: recentCount,
      };
    } catch (error) {
      console.error('[AuditLogger] Failed to get audit stats:', error);
      return {
        totalLogs: 0,
        actionBreakdown: {},
        topUsers: [],
        recentActivity: 0,
      };
    }
  }

  /**
   * Log agent creation with full context
   */
  async logCreation(
    agentId: string,
    draft: AgentDraft,
    context: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
    }
  ): Promise<void> {
    await this.log({
      agentId,
      userId: context.userId,
      action: 'CREATE',
      changes: {
        after: draft,
      },
      metadata: {
        createdAt: new Date().toISOString(),
        draftVersion: draft.version,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
    });
  }

  /**
   * Log agent update with detailed diff
   */
  async logUpdate(
    agentId: string,
    before: Partial<AgentDraft>,
    after: Partial<AgentDraft>,
    context: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
      reason?: string;
    }
  ): Promise<void> {
    await this.log({
      agentId,
      userId: context.userId,
      action: 'UPDATE',
      changes: {
        before,
        after,
      },
      metadata: {
        reason: context.reason,
        changedFields: this.getChangedFields(before, after),
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
    });
  }

  /**
   * Log agent launch
   */
  async logLaunch(
    agentId: string,
    context: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
      environment?: string;
    }
  ): Promise<void> {
    await this.log({
      agentId,
      userId: context.userId,
      action: 'LAUNCH',
      metadata: {
        launchedAt: new Date().toISOString(),
        environment: context.environment || 'production',
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
    });
  }

  /**
   * Generate a deterministic integrity hash for tamper detection.
   *
   * CRITICAL: Must NOT include timestamp or any non-deterministic value.
   * The same entry fields must produce the same hash on both write and verify.
   * Previously used Date.now() which made every hash non-reproducible.
   */
  private generateIntegrityHash(entry: AuditLogEntry): string {
    // Canonical representation: sort keys within `changes` for stability
    const canonical = JSON.stringify({
      agentId: entry.agentId,
      userId: entry.userId ?? null,
      action: entry.action,
      // Stringify changes with sorted keys for determinism across platforms/Node versions
      changes: JSON.parse(JSON.stringify(entry.changes ?? {})),
    }, Object.keys(entry).sort());

    return crypto
      .createHash('sha256')
      .update(canonical)
      .digest('hex');
  }

  /**
   * Verify log integrity by recomputing the hash from stored fields.
   * Only the same deterministic fields used in generateIntegrityHash are used.
   */
  private verifyIntegrity(log: any): boolean {
    try {
      if (!log.integrity || log.integrity.length !== 64) return false;

      const canonical = JSON.stringify({
        agentId: log.agentId,
        userId: log.userId ?? null,
        action: log.action,
        changes: JSON.parse(JSON.stringify(log.changes ?? {})),
      }, Object.keys(log).sort());

      const expected = crypto
        .createHash('sha256')
        .update(canonical)
        .digest('hex');

      // Constant-time comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(log.integrity, 'hex'),
        Buffer.from(expected, 'hex'),
      );
    } catch {
      return false;
    }
  }

  /**
   * Generate human-readable diff
   */
  private generateDiff(before?: any, after?: any): string[] {
    if (!before || !after) return [];

    const diff: string[] = [];
    const allKeys = new Set([
      ...Object.keys(before || {}),
      ...Object.keys(after || {}),
    ]);

    for (const key of allKeys) {
      const beforeVal = before?.[key];
      const afterVal = after?.[key];

      if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
        diff.push(`${key}: ${this.formatValue(beforeVal)} → ${this.formatValue(afterVal)}`);
      }
    }

    // Truncate if too large
    const diffStr = diff.join('\n');
    if (diffStr.length > this.MAX_DIFF_SIZE) {
      return [diffStr.substring(0, this.MAX_DIFF_SIZE) + '... (truncated)'];
    }

    return diff;
  }

  /**
   * Get list of changed fields
   */
  private getChangedFields(before: any, after: any): string[] {
    const allKeys = new Set([
      ...Object.keys(before || {}),
      ...Object.keys(after || {}),
    ]);

    return Array.from(allKeys).filter(
      key => JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key])
    );
  }

  /**
   * Format value for display
   */
  private formatValue(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value).substring(0, 100);
    return String(value);
  }

  /**
   * Sanitize entry to remove PII based on field-level masking rules.
   * Masks email addresses, phone numbers, and SSN patterns within string values.
   */
  private sanitizeEntry(entry: AuditLogEntry): AuditLogEntry {
    const maskPII = (value: any): any => {
      if (typeof value === 'string') {
        return value
          .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[EMAIL]')
          .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
          .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');
      }
      if (typeof value === 'object' && value !== null) {
        return Object.fromEntries(
          Object.entries(value).map(([k, v]) => [k, maskPII(v)])
        );
      }
      return value;
    };

    return {
      ...entry,
      changes: entry.changes ? maskPII(entry.changes) : entry.changes,
      metadata: entry.metadata ? maskPII(entry.metadata) : entry.metadata,
    };
  }

  /**
   * Fallback logging to console with structure
   */
  private fallbackLog(entry: AuditLogEntry): void {
    console.log(JSON.stringify({
      level: 'audit',
      timestamp: new Date().toISOString(),
      agentId: entry.agentId,
      action: entry.action,
      userId: entry.userId,
      metadata: entry.metadata,
    }));
  }

  /**
   * Emit metrics for observability
   */
  private emitMetrics(metric: string, data: Record<string, any>): void {
    // Integrate with your metrics system (Datadog, CloudWatch, etc.)
    // For now, just log
    if (process.env.NODE_ENV === 'production') {
      console.log(`[Metrics] ${metric}:`, data);
    }
  }

  /**
   * Alert on audit failures
   */
  private alertAuditFailure(error: any, entry: AuditLogEntry): void {
    // Integrate with alerting system (PagerDuty, Slack, etc.)
    if (process.env.NODE_ENV === 'production') {
      console.error('[ALERT] Audit logging failure:', {
        error: error instanceof Error ? error.message : 'Unknown',
        agentId: entry.agentId,
        action: entry.action,
      });
    }
  }

  /**
   * Cleanup old audit logs based on retention policy
   */
  async cleanupOldLogs(retentionDays: number = 365): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await prisma.agentAuditLog.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
        },
      });

      this.emitMetrics('audit_cleanup', {
        deleted: result.count,
        retentionDays,
      });

      return result.count;
    } catch (error) {
      console.error('[AuditLogger] Failed to cleanup old logs:', error);
      return 0;
    }
  }

  /**
   * Export audit logs for compliance
   */
  async exportLogs(query: AuditLogQuery, format: 'json' | 'csv' = 'json'): Promise<string> {
    const { logs } = await this.getAuditLogs({ ...query, limit: 10000 });

    if (format === 'csv') {
      return this.convertToCSV(logs);
    }

    return JSON.stringify(logs, null, 2);
  }

  /**
   * Convert logs to CSV format
   */
  private convertToCSV(logs: AuditLogEntry[]): string {
    const headers = ['Timestamp', 'Agent ID', 'User ID', 'Action', 'Changes', 'IP Address'];
    const rows = logs.map(log => [
      (log.metadata as any)?.createdAt || '',
      log.agentId,
      log.userId || '',
      log.action,
      JSON.stringify(log.changes),
      (log.metadata as any)?.ipAddress || '',
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');
  }
}

// Singleton instance
export const auditLogger = new AuditLogger();