import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@/lib/prisma';

@Injectable()
export class ProjectSchedulerService {
    private logger = new Logger(ProjectSchedulerService.name);

    async autoSchedule(projectId: string, userId: string) {
        // 1. Fetch overdue tasks
        const overdueTasks = await prisma.task.findMany({
            where: {
                projectId,
                status: {
                    name: { notIn: ['DONE', 'COMPLETED', 'CANCELED'] }
                },
                dueDate: { lt: new Date() }
            },
            orderBy: { priority: 'desc' } // HIGH priority first
        });

        if (overdueTasks.length === 0) {
            return { message: 'No overdue tasks found. Schedule is healthy.' };
        }

        const updates = [];
        const now = new Date();

        // 2. Simple Heuristic Shift
        for (const task of overdueTasks) {
            // High priority -> Due in 2 days
            // Medium -> 5 days
            // Low -> 7 days
            let daysToAdd = 7;
            if (task.priority === 'HIGH' || task.priority === 'URGENT') daysToAdd = 2;
            else if (task.priority === 'NORMAL') daysToAdd = 5;

            const newDate = new Date();
            newDate.setDate(now.getDate() + daysToAdd);

            const update = prisma.task.update({
                where: { id: task.id },
                data: { dueDate: newDate }
            });
            updates.push(update);
        }

        await prisma.$transaction(updates);

        // 3. Log Activity
        await prisma.activityLog.create({
            data: {
                projectId,
                userId,
                action: 'PLAN_HEALED',
                category: 'PROJECT',
                title: 'Project Plan Auto-Healed',
                description: `Automatically rescheduled ${overdueTasks.length} overdue tasks`,
                entityType: 'PROJECT',
                entityId: projectId,
                metadata: { rescheduledCount: overdueTasks.length }
            }
        });

        return {
            message: `Rescheduled ${overdueTasks.length} overdue tasks.`,
            rescheduledTasks: overdueTasks.map(t => t.id)
        };
    }
}

export const projectSchedulerService = new ProjectSchedulerService();
