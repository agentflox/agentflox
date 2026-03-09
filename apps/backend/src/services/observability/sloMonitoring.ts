import { Histogram, Summary, register } from 'prom-client';
import { redis } from '@/lib/redis';
import { executeRedisOperation } from '@/lib/circuitBreaker';

/**
 * SLO (Service Level Objective) Monitoring
 * Tracks and enforces SLOs for production reliability
 */

export interface SLOConfig {
    name: string;
    description: string;
    target: number; // Target percentage (e.g., 99.9 for 99.9%)
    window: number; // Time window in seconds
    metric: 'latency' | 'availability' | 'errorRate';
    threshold?: number; // For latency metrics (in ms)
}

export interface SLOStatus {
    name: string;
    current: number;
    target: number;
    budget: number; // Error budget remaining (%)
    status: 'healthy' | 'warning' | 'critical';
    breaches: number; // Number of recent breaches
}

class SLOMonitoring {
    private slos: Map<string, SLOConfig> = new Map();
    private histograms: Map<string, Histogram> = new Map();
    private summaries: Map<string, Summary> = new Map();

    /**
     * Register an SLO
     */
    registerSLO(config: SLOConfig) {
        this.slos.set(config.name, config);

        // Create appropriate Prometheus metric
        if (config.metric === 'latency') {
            const histogram = new Histogram({
                name: `slo_${config.name}_latency_seconds`,
                help: config.description,
                labelNames: ['status'],
                buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10],
            });
            this.histograms.set(config.name, histogram);
        } else {
            const summary = new Summary({
                name: `slo_${config.name}_${config.metric}`,
                help: config.description,
                labelNames: ['status'],
                percentiles: [0.5, 0.95, 0.99],
                maxAgeSeconds: config.window,
                ageBuckets: 5,
            });
            this.summaries.set(config.name, summary);
        }

        console.log(`📊 SLO registered: ${config.name} (target: ${config.target}%)`);
    }

    /**
     * Record a measurement for an SLO
     */
    async recordMeasurement(
        sloName: string,
        value: number,
        success: boolean = true
    ): Promise<void> {
        const slo = this.slos.get(sloName);
        if (!slo) {
            console.warn(`SLO not found: ${sloName}`);
            return;
        }

        // Record to Prometheus
        const histogram = this.histograms.get(sloName);
        const summary = this.summaries.get(sloName);

        if (histogram) {
            histogram.observe({ status: success ? 'success' : 'failure' }, value / 1000);
        } else if (summary) {
            summary.observe({ status: success ? 'success' : 'failure' }, value);
        }

        // Track in Redis for real-time SLO calculation
        const key = `slo:${sloName}:${this.getCurrentMinute()}`;

        await executeRedisOperation(
            () => redis.hincrby(key, 'total', 1),
            null
        );

        if (success) {
            await executeRedisOperation(
                () => redis.hincrby(key, 'success', 1),
                null
            );
        }

        if (slo.metric === 'latency' && slo.threshold) {
            if (value <= slo.threshold) {
                await executeRedisOperation(
                    () => redis.hincrby(key, 'within_slo', 1),
                    null
                );
            }
        }

        await executeRedisOperation(
            () => redis.expire(key, slo.window * 2), // Keep data for 2x window
            null
        );
    }

    /**
     * Get current SLO status
     */
    async getSLOStatus(sloName: string): Promise<SLOStatus | null> {
        const slo = this.slos.get(sloName);
        if (!slo) return null;

        const minutes = this.getMinutesInWindow(slo.window);
        let totalCount = 0;
        let successCount = 0;
        let withinSLO = 0;

        // Aggregate from minute buckets
        for (const minute of minutes) {
            const key = `slo:${sloName}:${minute}`;
            const data = await executeRedisOperation(
                () => redis.hgetall(key),
                {}
            );

            if (data?.total) {
                totalCount += parseInt(data.total, 10);
                successCount += parseInt(data.success || '0', 10);
                withinSLO += parseInt(data.within_slo || '0', 10);
            }
        }

        if (totalCount === 0) {
            return {
                name: sloName,
                current: 100,
                target: slo.target,
                budget: 100,
                status: 'healthy',
                breaches: 0,
            };
        }

        // Calculate current performance
        let current: number;
        if (slo.metric === 'latency') {
            current = (withinSLO / totalCount) * 100;
        } else if (slo.metric === 'availability') {
            current = (successCount / totalCount) * 100;
        } else {
            // Error rate
            current = 100 - ((totalCount - successCount) / totalCount) * 100;
        }

        // Calculate error budget
        const budget = ((current - slo.target) / (100 - slo.target)) * 100;

        // Determine status
        let status: 'healthy' | 'warning' | 'critical';
        if (current >= slo.target) {
            status = 'healthy';
        } else if (current >= slo.target * 0.95) {
            status = 'warning';
        } else {
            status = 'critical';
        }

        // Count recent breaches
        const breaches = await this.countRecentBreaches(sloName, 60); // Last hour

        return {
            name: sloName,
            current: parseFloat(current.toFixed(3)),
            target: slo.target,
            budget: parseFloat(budget.toFixed(3)),
            status,
            breaches,
        };
    }

    /**
     * Get all SLO statuses
     */
    async getAllSLOStatuses(): Promise<SLOStatus[]> {
        const statuses: SLOStatus[] = [];

        for (const sloName of this.slos.keys()) {
            const status = await this.getSLOStatus(sloName);
            if (status) {
                statuses.push(status);
            }
        }

        return statuses;
    }

    /**
     * Check if SLO is being met
     */
    async checkSLOCompliance(sloName: string): Promise<boolean> {
        const status = await this.getSLOStatus(sloName);
        return status ? status.current >= status.target : true;
    }

    /**
     * Count recent SLO breaches
     */
    private async countRecentBreaches(sloName: string, minutes: number): Promise<number> {
        const key = `slo:${sloName}:breaches`;
        const now = Date.now();
        const cutoff = now - (minutes * 60 * 1000);

        // Use sorted set to track breaches with timestamps
        const count = await executeRedisOperation(
            () => redis.zcount(key, cutoff, now),
            0
        );

        return count ?? 0;
    }

    /**
     * Record an SLO breach
     */
    async recordBreach(sloName: string, reason?: string): Promise<void> {
        const key = `slo:${sloName}:breaches`;
        const now = Date.now();

        await executeRedisOperation(
            () => redis.zadd(key, now, `${now}:${reason || 'unknown'}`),
            null
        );

        // Keep only last 24 hours of breaches
        const cutoff = now - (24 * 3600 * 1000);
        await executeRedisOperation(
            () => redis.zremrangebyscore(key, 0, cutoff),
            null
        );

        console.warn(`⚠️ SLO breach recorded: ${sloName} - ${reason}`);
    }

    /**
     * Helper: Get current minute bucket
     */
    private getCurrentMinute(): string {
        const now = new Date();
        now.setSeconds(0, 0);
        return now.toISOString();
    }

    /**
     * Helper: Get all minutes in SLO window
     */
    private getMinutesInWindow(windowSeconds: number): string[] {
        const minutes: string[] = [];
        const now = new Date();
        now.setSeconds(0, 0);

        const windowMinutes = Math.ceil(windowSeconds / 60);

        for (let i = 0; i < windowMinutes; i++) {
            const minute = new Date(now.getTime() - (i * 60 * 1000));
            minutes.push(minute.toISOString());
        }

        return minutes;
    }
}

// Singleton instance
export const sloMonitoring = new SLOMonitoring();

// Register default SLOs
export function registerDefaultSLOs() {
    // Message delivery latency
    sloMonitoring.registerSLO({
        name: 'message_delivery_latency',
        description: 'Message delivery latency p99',
        target: 99,
        window: 3600, // 1 hour
        metric: 'latency',
        threshold: 100, // 100ms
    });

    // Socket connection availability
    sloMonitoring.registerSLO({
        name: 'socket_availability',
        description: 'Socket connection success rate',
        target: 99.9,
        window: 3600,
        metric: 'availability',
    });

    // API error rate
    sloMonitoring.registerSLO({
        name: 'api_error_rate',
        description: 'API request error rate',
        target: 99.5,
        window: 3600,
        metric: 'errorRate',
    });

    // Presence broadcast latency
    sloMonitoring.registerSLO({
        name: 'presence_broadcast_latency',
        description: 'Presence broadcast latency p95',
        target: 95,
        window: 1800, // 30 minutes
        metric: 'latency',
        threshold: 500, // 500ms
    });

    console.log('📊 Default SLOs registered');
}
