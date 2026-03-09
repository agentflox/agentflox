
import { Injectable } from '@nestjs/common';
import { prisma } from '@/lib/prisma';
import { metrics } from '@/monitoring/metrics';

export interface SafetyScore {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    score: number; // 0-100
    categories: Record<string, number>;
    details: string[];
}

@Injectable()
export class SafetyMonitoringService {
    /**
     * Monitor agent execution for safety drift
     */
    async monitorAgentBehavior(agentId: string, executionId: string, safetyScore: SafetyScore): Promise<void> {
        // Record metrics
        metrics.safetyScore.observe({ agent_id: agentId, risk_level: safetyScore.riskLevel }, safetyScore.score);

        // Check for high risk
        if (safetyScore.riskLevel === 'HIGH' || safetyScore.riskLevel === 'CRITICAL') {
            await this.handleHighRiskEvent(agentId, executionId, safetyScore);
        }
    }

    /**
     * Handle high-risk events (Auto-pause, Alert)
     */
    private async handleHighRiskEvent(agentId: string, executionId: string, score: SafetyScore): Promise<void> {
        console.warn(`[SafetyMonitor] High risk detected for agent ${agentId}:`, score);

        // 1. Log incident
        // In a real system, this might write to an Incident table
        await prisma.agentAuditLog.create({
            data: {
                agentId,
                action: 'SAFETY_VIOLATION',
                actorId: 'system',
                details: {
                    executionId,
                    score,
                    action: 'HIGH_RISK_DETECTED',
                },
                metadata: {
                    riskLevel: score.riskLevel,
                },
            },
        });

        // 2. Auto-pause agent if CRITICAL
        if (score.riskLevel === 'CRITICAL') {
            await prisma.aiAgent.update({
                where: { id: agentId },
                data: {
                    status: 'PAUSED', // Assuming 'PAUSED' is a valid status or similar
                    isActive: false,
                    metadata: {
                        pauseReason: 'Critical safety violation detected',
                        safetyIncidentId: executionId,
                    },
                },
            });
            console.warn(`[SafetyMonitor] Agent ${agentId} auto-paused due to critical safety violation.`);
        }

        // 3. Alerting (Stub)
        // await alertingService.notifyAdmin(...)
    }
}

export const safetyMonitoringService = new SafetyMonitoringService();
