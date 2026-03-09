/**
 * Health Checker
 * 
 * Monitors system health including:
 * - AI service availability and latency
 * - Error rates
 * - Circuit breaker states
 * - Database connectivity
 * - Redis connectivity
 */

import { openai } from '@/lib/openai';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { CircuitBreaker } from '@/utils/circuitBreaker';
import { fetchModel } from '@/utils/ai/fetchModel';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    aiService: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      latency?: number;
      error?: string;
    };
    database: {
      status: 'healthy' | 'unhealthy';
      error?: string;
    };
    redis: {
      status: 'healthy' | 'unhealthy';
      error?: string;
    };
    circuitBreaker: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
      failureCount: number;
    };
  };
  timestamp: string;
}

export class HealthChecker {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Register a circuit breaker for monitoring
   */
  registerCircuitBreaker(name: string, breaker: CircuitBreaker): void {
    this.circuitBreakers.set(name, breaker);
  }

  /**
   * Perform comprehensive health check
   */
  async checkHealth(): Promise<HealthStatus> {
    const checks: HealthStatus['checks'] = {
      aiService: await this.checkAIService(),
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      circuitBreaker: this.checkCircuitBreakers(),
    };

    // Determine overall status
    const hasUnhealthy = Object.values(checks).some(
      check => check.status === 'unhealthy'
    );
    const hasDegraded = Object.values(checks).some(
      check => check.status === 'degraded'
    );

    const status: HealthStatus['status'] = hasUnhealthy
      ? 'unhealthy'
      : hasDegraded
      ? 'degraded'
      : 'healthy';

    return {
      status,
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Check AI service health
   */
  private async checkAIService(): Promise<HealthStatus['checks']['aiService']> {
    try {
      const model = await fetchModel();
      const startTime = Date.now();
      const response = await openai.chat.completions.create({
        model: model.name,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 5,
      });
      const latency = Date.now() - startTime;

      if (!response.choices[0]?.message?.content) {
        return {
          status: 'degraded',
          latency,
          error: 'AI service returned empty response',
        };
      }

      return {
        status: latency > 5000 ? 'degraded' : 'healthy',
        latency,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check database health
   */
  private async checkDatabase(): Promise<HealthStatus['checks']['database']> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy' };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check Redis health
   */
  private async checkRedis(): Promise<HealthStatus['checks']['redis']> {
    try {
      await redis.ping();
      return { status: 'healthy' };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check circuit breaker states
   */
  private checkCircuitBreakers(): HealthStatus['checks']['circuitBreaker'] {
    let hasOpen = false;
    let hasHalfOpen = false;
    let totalFailures = 0;

    for (const breaker of this.circuitBreakers.values()) {
      const state = breaker.getState();
      const failures = breaker.getFailureCount();

      if (state === 'OPEN') {
        hasOpen = true;
      } else if (state === 'HALF_OPEN') {
        hasHalfOpen = true;
      }

      totalFailures += failures;
    }

    const status: HealthStatus['checks']['circuitBreaker']['status'] = hasOpen
      ? 'unhealthy'
      : hasHalfOpen
      ? 'degraded'
      : 'healthy';

    // Get state from first circuit breaker (or default to CLOSED)
    const firstBreaker = Array.from(this.circuitBreakers.values())[0];
    const state = firstBreaker?.getState() || 'CLOSED';

    return {
      status,
      state,
      failureCount: totalFailures,
    };
  }
}

