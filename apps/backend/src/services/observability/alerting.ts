import axios from 'axios';
import { sloMonitoring, SLOStatus } from './sloMonitoring';
import { metrics } from '@/monitoring/metrics';

/**
 * Real-Time Alerting Service
 * Automated incident detection and notification
 */

export interface AlertConfig {
    name: string;
    severity: 'critical' | 'warning' | 'info';
    condition: () => Promise<boolean>;
    message: string;
    channels: AlertChannel[];
    cooldown: number; // Seconds before re-alerting
}

export type AlertChannel = 'slack' | 'pagerduty' | 'email' | 'webhook';

export interface Alert {
    id: string;
    name: string;
    severity: 'critical' | 'warning' | 'info';
    message: string;
    timestamp: Date;
    resolved: boolean;
    resolvedAt?: Date;
}

class RealTimeAlertingService {
    private alerts: Map<string, AlertConfig> = new Map();
    private activeAlerts: Map<string, Alert> = new Map();
    private lastAlertTime: Map<string, number> = new Map();

    /**
     * Register an alert
     */
    registerAlert(config: AlertConfig) {
        this.alerts.set(config.name, config);
        console.log(`🚨 Alert registered: ${config.name} (${config.severity})`);
    }

    /**
     * Check all alerts and trigger if conditions met
     */
    async checkAlerts(): Promise<void> {
        for (const [name, config] of this.alerts.entries()) {
            try {
                const shouldAlert = await config.condition();

                if (shouldAlert) {
                    await this.triggerAlert(name);
                } else {
                    // Resolve alert if it was active
                    if (this.activeAlerts.has(name)) {
                        await this.resolveAlert(name);
                    }
                }
            } catch (error) {
                console.error(`Error checking alert ${name}:`, error);
            }
        }
    }

    /**
     * Trigger an alert
     */
    private async triggerAlert(name: string): Promise<void> {
        const config = this.alerts.get(name);
        if (!config) return;

        // Check cooldown
        const lastAlert = this.lastAlertTime.get(name) || 0;
        const now = Date.now();
        if (now - lastAlert < config.cooldown * 1000) {
            return; // Still in cooldown
        }

        // Check if already active
        if (this.activeAlerts.has(name)) {
            return; // Alert already active
        }

        const alert: Alert = {
            id: `${name}-${now}`,
            name,
            severity: config.severity,
            message: config.message,
            timestamp: new Date(),
            resolved: false,
        };

        this.activeAlerts.set(name, alert);
        this.lastAlertTime.set(name, now);

        // Send to configured channels
        await Promise.all(
            config.channels.map(channel => this.sendAlert(channel, alert))
        );

        console.error(`🚨 ALERT TRIGGERED: ${name} - ${config.message}`);
    }

    /**
     * Resolve an alert
     */
    private async resolveAlert(name: string): Promise<void> {
        const alert = this.activeAlerts.get(name);
        if (!alert) return;

        alert.resolved = true;
        alert.resolvedAt = new Date();

        this.activeAlerts.delete(name);

        console.log(`✅ Alert resolved: ${name}`);
    }

    /**
     * Send alert to a channel
     */
    private async sendAlert(channel: AlertChannel, alert: Alert): Promise<void> {
        try {
            switch (channel) {
                case 'slack':
                    await this.sendSlackAlert(alert);
                    break;
                case 'pagerduty':
                    await this.sendPagerDutyAlert(alert);
                    break;
                case 'email':
                    await this.sendEmailAlert(alert);
                    break;
                case 'webhook':
                    await this.sendWebhookAlert(alert);
                    break;
            }
        } catch (error) {
            console.error(`Failed to send alert to ${channel}:`, error);
        }
    }

    /**
     * Send Slack alert
     */
    private async sendSlackAlert(alert: Alert): Promise<void> {
        const webhookUrl = process.env.SLACK_WEBHOOK_URL;
        if (!webhookUrl) return;

        const color = alert.severity === 'critical' ? 'danger' : alert.severity === 'warning' ? 'warning' : 'good';

        await axios.post(webhookUrl, {
            attachments: [
                {
                    color,
                    title: `🚨 ${alert.severity.toUpperCase()}: ${alert.name}`,
                    text: alert.message,
                    fields: [
                        {
                            title: 'Severity',
                            value: alert.severity,
                            short: true,
                        },
                        {
                            title: 'Time',
                            value: alert.timestamp.toISOString(),
                            short: true,
                        },
                    ],
                    footer: 'Agentflox Socket Monitoring',
                    ts: Math.floor(alert.timestamp.getTime() / 1000),
                },
            ],
        });
    }

    /**
     * Send PagerDuty alert
     */
    private async sendPagerDutyAlert(alert: Alert): Promise<void> {
        const apiKey = process.env.PAGERDUTY_API_KEY;
        const serviceId = process.env.PAGERDUTY_SERVICE_ID;
        if (!apiKey || !serviceId) return;

        await axios.post(
            'https://api.pagerduty.com/incidents',
            {
                incident: {
                    type: 'incident',
                    title: `${alert.severity.toUpperCase()}: ${alert.name}`,
                    service: {
                        id: serviceId,
                        type: 'service_reference',
                    },
                    urgency: alert.severity === 'critical' ? 'high' : 'low',
                    body: {
                        type: 'incident_body',
                        details: alert.message,
                    },
                },
            },
            {
                headers: {
                    'Authorization': `Token token=${apiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.pagerduty+json;version=2',
                },
            }
        );
    }

    /**
     * Send email alert
     */
    private async sendEmailAlert(alert: Alert): Promise<void> {
        // TODO: Integrate with your email service (SendGrid, AWS SES, etc.)
        console.log(`📧 Email alert: ${alert.name} - ${alert.message}`);
    }

    /**
     * Send webhook alert
     */
    private async sendWebhookAlert(alert: Alert): Promise<void> {
        const webhookUrl = process.env.ALERT_WEBHOOK_URL;
        if (!webhookUrl) return;

        await axios.post(webhookUrl, {
            alert: {
                id: alert.id,
                name: alert.name,
                severity: alert.severity,
                message: alert.message,
                timestamp: alert.timestamp.toISOString(),
            },
        });
    }

    /**
     * Get active alerts
     */
    getActiveAlerts(): Alert[] {
        return Array.from(this.activeAlerts.values());
    }
}

// Singleton instance
export const alerting = new RealTimeAlertingService();

/**
 * Register default alerts
 */
export function registerDefaultAlerts() {
    // High error rate
    alerting.registerAlert({
        name: 'high_error_rate',
        severity: 'critical',
        condition: async () => {
            const register = (await import('prom-client')).register;
            const errorMetric = await register.getSingleMetric('messages_processed_total');
            // TODO: Calculate error rate from metrics
            return false; // Placeholder
        },
        message: 'Error rate exceeded 5% threshold',
        channels: ['slack', 'pagerduty'],
        cooldown: 300, // 5 minutes
    });

    // SLO breach
    alerting.registerAlert({
        name: 'slo_breach_message_latency',
        severity: 'warning',
        condition: async () => {
            const status = await sloMonitoring.getSLOStatus('message_delivery_latency');
            return status ? status.current < status.target : false;
        },
        message: 'Message delivery latency SLO breached',
        channels: ['slack'],
        cooldown: 600, // 10 minutes
    });

    // Circuit breaker open
    alerting.registerAlert({
        name: 'circuit_breaker_open',
        severity: 'critical',
        condition: async () => {
            const register = (await import('prom-client')).register;
            const cbMetric = await register.getSingleMetric('circuit_breaker_state');
            // Check if any circuit breaker is open
            // TODO: Query Prometheus metric
            return false; // Placeholder
        },
        message: 'Circuit breaker opened - service degraded',
        channels: ['slack', 'pagerduty'],
        cooldown: 180, // 3 minutes
    });

    // High connection count
    alerting.registerAlert({
        name: 'high_connection_count',
        severity: 'warning',
        condition: async () => {
            const register = (await import('prom-client')).register;
            const connectionMetric = await register.getSingleMetric('socket_connections_total');
            // Check if connections > 40k (80% of capacity)
            // TODO: Get current value from metric
            return false; // Placeholder
        }, message: 'Socket connections exceeded 80% capacity',
        channels: ['slack'],
        cooldown: 600, // 10 minutes
    });

    // Message queue backlog
    alerting.registerAlert({
        name: 'message_queue_backlog',
        severity: 'warning',
        condition: async () => {
            // TODO: Check BullMQ queue depth
            return false; // Placeholder
        },
        message: 'Message delivery queue has >1000 pending jobs',
        channels: ['slack'],
        cooldown: 300,
    });

    console.log('🚨 Default alerts registered');
}

/**
 * Start alert monitoring loop
 */
export function startAlertMonitoring(intervalSeconds: number = 60) {
    setInterval(async () => {
        await alerting.checkAlerts();
    }, intervalSeconds * 1000);

    console.log(`🚨 Alert monitoring started (check interval: ${intervalSeconds}s)`);
}
