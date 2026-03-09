import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PlanManager } from './managers/plan.manager';

@Injectable()
export class PlanService {
    private readonly logger = new Logger(PlanService.name);

    async createPlan(data: any) {
        try {
            return await PlanManager.createPlan(data);
        } catch (error) {
            this.logger.error('Error creating plan:', error);
            throw new HttpException('Failed to create plan', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async getPlan(planId: string) {
        try {
            return await PlanManager.getPlan(planId);
        } catch (error) {
            this.logger.error(`Error getting plan ${planId}:`, error);
            throw new HttpException('Plan not found', HttpStatus.NOT_FOUND);
        }
    }

    async updatePlan(planId: string, data: any) {
        try {
            return await PlanManager.updatePlan(planId, data);
        } catch (error) {
            this.logger.error(`Error updating plan ${planId}:`, error);
            throw new HttpException('Failed to update plan', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async getPlanByName(name: string) {
        try {
            return await PlanManager.getPlanByName(name);
        } catch (error) {
            this.logger.error(`Error getting plan by name ${name}:`, error);
            throw new HttpException('Plan not found', HttpStatus.NOT_FOUND);
        }
    }

    async deletePlan(planId: string) {
        try {
            return await PlanManager.deletePlan(planId);
        } catch (error) {
            this.logger.error(`Error deleting plan ${planId}:`, error);
            throw new HttpException('Failed to delete plan', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async getAllPlans() {
        try {
            return await PlanManager.getAllPlans();
        } catch (error) {
            this.logger.error('Error getting all plans:', error);
            throw new HttpException('Failed to retrieve plans', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
