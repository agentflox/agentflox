import { Injectable } from '@nestjs/common';
import { prisma } from '@/lib/prisma';

export interface Alert {
    id?: string;
    agentId: string;
    name: string;
    condition: string;
    threshold: number;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    isActive: boolean;
    actions: AlertAction[];
}

export interface AlertAction {
    type: 'EMAIL' | 'SLACK' | 'PAGERDUTY' | 'WEBHOOK';
    target: string; // email address, slack channel, etc.
    payload?: Record<string, any>;
}

/**
 * Alerting Service
 * Configures and triggers alerts based on agent metrics
 */
@Injectable()
export class AlertingService {
    /**
     * Configure standard alerts for an agent
     */
    async configureStandardAlerts(agentId: string, userId: string): Promise<Alert[]> {
        const alerts: Alert[] = [
            {
                agentId,
                name: 'High Error Rate',
                condition: 'error_rate > 5%',
                threshold: 0.05,
                severity: 'HIGH',
                isActive: true,
                actions: [
                    { type: 'EMAIL', target: 'team@company.com' },
                    { type: 'SLACK', target: '#agent-alerts' },
                ],
            },
            {
                agentId,
                name: 'Response Time Degradation',
                condition: 'p95_response_time > 5s',
                threshold: 5000,
                severity: 'MEDIUM',
                isActive: true,
                actions: [
                    { type: 'SLACK', target: '#agent-alerts' },
                ],
            },
            {
                agentId,
                name: 'Token Budget Exceeded',
                condition: 'daily_token_usage > budget',
                threshold: 10000, // Default, should be customized
                severity: 'LOW',
                isActive: true,
                actions: [
                    { type: 'EMAIL', target: 'billing@company.com' },
                ],
            },
        ];

        // Store alerts (would need AlertConfig table)
        // For now, just return the configuration
        return alerts;
    }

    /**
     * Trigger an alert
     */
    async triggerAlert(
        alert: Alert,
        currentValue: number,
        context: Record<string, any>
    ): Promise<void> {
        console.warn(`[Alert] ${alert.severity}: ${alert.name} triggered for agent ${alert.agentId}`, {
            currentValue,
            threshold: alert.threshold,
            context,
        });

        // Execute alert actions
        for (const action of alert.actions) {
            await this.executeAlertAction(action, alert, currentValue, context);
        }

        // Log alert to database
        await this.logAlert(alert, currentValue, context);
    }

    /**
     * Execute alert action
     */
    private async executeAlertAction(
        action: AlertAction,
        alert: Alert,
        currentValue: number,
        context: Record<string, any>
    ): Promise<void> {
        const message = this.formatAlertMessage(alert, currentValue, context);

        switch (action.type) {
            case 'EMAIL':
                // Stub: would integrate with email service
                console.log(`[Alert Email] To: ${action.target}, Message: ${message}`);
                break;

            case 'SLACK':
                // Stub: would integrate with Slack API
                console.log(`[Alert Slack] Channel: ${action.target}, Message: ${message}`);
                break;

            case 'PAGERDUTY':
                // Stub: would integrate with PagerDuty API
                console.log(`[Alert PagerDuty] Service: ${action.target}, Message: ${message}`);
                break;

            case 'WEBHOOK':
                // Stub: would POST to webhook URL
                console.log(`[Alert Webhook] URL: ${action.target}, Payload:`, {
                    alert: alert.name,
                    severity: alert.severity,
                    currentValue,
                    context,
                });
                break;
        }
    }

    /**
     * Format alert message
     */
    private formatAlertMessage(
        alert: Alert,
        currentValue: number,
        context: Record<string, any>
    ): string {
        return `🚨 **${alert.severity}**: ${alert.name}\n\n` +
            `Agent ID: ${alert.agentId}\n` +
            `Condition: ${alert.condition}\n` +
            `Current Value: ${currentValue}\n` +
            `Threshold: ${alert.threshold}\n` +
            `Context: ${JSON.stringify(context, null, 2)}`;
    }

    /**
     * Log alert to database
     */
    private async logAlert(
        alert: Alert,
        currentValue: number,
        context: Record<string, any>
    ): Promise<void> {
        // Log to audit log
        await prisma.agentAuditLog.create({
            data: {
                agentId: alert.agentId,
                action: 'ALERT_TRIGGERED',
                actorId: 'system',
                details: {
                    alertName: alert.name,
                    severity: alert.severity,
                    condition: alert.condition,
                    currentValue,
                    threshold: alert.threshold,
                    context,
                },
            },
        });
    }

    /**
     * Check error rate and trigger alert if needed
     */
    async checkErrorRate(agentId: string): Promise<void> {
        const last5Minutes = new Date(Date.now() - 5 * 60 * 1000);

        const executions = await prisma.agentExecution.findMany({
            where: {
                agentId,
                startedAt: { gte: last5Minutes },
            },
        });

        if (executions.length === 0) return;

        const failures = executions.filter((e) => e.status === 'FAILED').length;
        const errorRate = failures / executions.length;

        const alerts = await this.configureStandardAlerts(agentId, 'system');
        const errorRateAlert = alerts.find((a) => a.name === 'High Error Rate');

        if (errorRateAlert && errorRate > errorRateAlert.threshold) {
            await this.triggerAlert(errorRateAlert, errorRate, {
                totalExecutions: executions.length,
                failures,
                period: '5m',
            });
        }
    }
}

export const alertingService = new AlertingService();
