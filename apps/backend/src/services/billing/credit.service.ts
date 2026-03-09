import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { CreditManager } from '@/services/billing/managers/credit.manager';
import { PurchaseInput, ExpiredPackageFilters } from '@/services/billing/types';
import { PaymentStatus } from '@agentflox/database/src/generated/prisma';

@Injectable()
export class CreditService {
    private readonly logger = new Logger(CreditService.name);

    async getPurchaseDetails(userName: string) {
        try {
            return await CreditManager.getPurchaseDetails(userName);
        } catch (error) {
            this.logger.error(`Error getting purchase details for user ${userName}:`, error);
            throw new HttpException('Failed to get purchase details', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async getAllStandardPackages() {
        try {
            return await CreditManager.getAllStandardPackages();
        } catch (error) {
            this.logger.error('Error getting all standard packages:', error);
            throw new HttpException('Failed to retrieve standard packages', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async purchase(userId: string, details: PurchaseInput) {
        try {
            return await CreditManager.purchase(userId, details);
        } catch (error) {
            this.logger.error(`Error processing purchase for user ${userId}:`, error);
            if (error instanceof HttpException) throw error;
            throw new HttpException('Purchase processing failed', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async getPackageById(id: string) {
        try {
            return await CreditManager.getPackageById(id);
        } catch (error) {
            this.logger.error(`Error getting package by ID ${id}:`, error);
            throw new HttpException('Package not found', HttpStatus.NOT_FOUND);
        }
    }

    async getPackageByName(packageName: string) {
        try {
            return await CreditManager.getPackageByName(packageName);
        } catch (error) {
            this.logger.error(`Error getting package by name ${packageName}:`, error);
            throw new HttpException('Package not found', HttpStatus.NOT_FOUND);
        }
    }

    async getActivePackages(userName: string) {
        try {
            return await CreditManager.getActivePackages(userName);
        } catch (error) {
            this.logger.error(`Error getting active packages for user ${userName}:`, error);
            throw new HttpException('Failed to retrieve active packages', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async getExpiredPackages(userName: string, filters: ExpiredPackageFilters = {}) {
        try {
            return await CreditManager.getExpiredPackages(userName, filters);
        } catch (error) {
            this.logger.error(`Error getting expired packages for user ${userName}:`, error);
            throw new HttpException('Failed to retrieve expired packages', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async updatePaymentStatus(intentId: string, status: PaymentStatus) {
        try {
            return await CreditManager.updatePaymentStatus(intentId, status);
        } catch (error) {
            this.logger.error(`Error updating payment status for intent ${intentId}:`, error);
            throw new HttpException('Failed to update payment status', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async getCreditHistory(userName: string) {
        try {
            return await CreditManager.getCreditHistory(userName);
        } catch (error) {
            this.logger.error(`Error getting credit history for user ${userName}:`, error);
            throw new HttpException('Failed to retrieve credit history', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async checkAndUpdatePackageStatus(userName: string) {
        try {
            return await CreditManager.checkAndUpdatePackageStatus(userName);
        } catch (error) {
            this.logger.error(`Error check/updating package status for user ${userName}:`, error);
            // Non-blocking error for background checks usually, but here we throw for API consistency
            throw new HttpException('Failed to update package status', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async getNextAvailablePackage(userName: string) {
        try {
            return await CreditManager.getNextAvailablePackage(userName);
        } catch (error) {
            this.logger.error(`Error getting next available package for user ${userName}:`, error);
            throw new HttpException('Failed to determine next available package', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async checkOrderExists(orderId: string) {
        try {
            return await CreditManager.checkOrderExists(orderId);
        } catch (error) {
            this.logger.error(`Error checking order existence ${orderId}:`, error);
            throw new HttpException('Failed to check order', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async updateOrderMetadata(orderId: string, metadata: Record<string, any>) {
        try {
            return await CreditManager.updateOrderMetadata(orderId, metadata);
        } catch (error) {
            this.logger.error(`Error updating order metadata ${orderId}:`, error);
            throw new HttpException('Failed to update order metadata', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
