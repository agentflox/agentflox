import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PaymentManager } from '@/services/billing/managers/payment.manager';

@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);

    async getPaymentById(paymentId: string) {
        try {
            return await PaymentManager.getPaymentById(paymentId);
        } catch (error) {
            this.logger.error(`Error getting payment by ID ${paymentId}:`, error);
            throw new HttpException('Payment not found', HttpStatus.NOT_FOUND);
        }
    }

    async getUserPayments(userId: string) {
        try {
            return await PaymentManager.getUserPayments(userId);
        } catch (error) {
            this.logger.error(`Error getting payments for user ${userId}:`, error);
            throw new HttpException('Failed to retrieve user payments', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async createPayment(data: { userId: string; amount: number; currency: string; billingPeriodStart: Date; billingPeriodEnd: Date; transactionId?: string }) {
        try {
            return await PaymentManager.createPayment(data);
        } catch (error) {
            this.logger.error('Error creating payment:', error);
            throw new HttpException('Failed to create payment record', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async getPaymentHistory(userId: string, page: number = 1, pageSize: number = 10) {
        try {
            return await PaymentManager.getPaymentHistory(userId, page, pageSize);
        } catch (error) {
            this.logger.error(`Error getting payment history for user ${userId}:`, error);
            throw new HttpException('Failed to retrieve payment history', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async refundPayment(paymentId: string, reason?: string) {
        try {
            return await PaymentManager.refundPayment(paymentId, reason);
        } catch (error) {
            this.logger.error(`Error refunding payment ${paymentId}:`, error);
            throw new HttpException('Refund processing failed', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async getPaymentStatistics(userName: string, startDate: Date, endDate: Date) {
        try {
            return await PaymentManager.getPaymentStatistics(userName, startDate, endDate);
        } catch (error) {
            this.logger.error(`Error getting payment statistics for user ${userName}:`, error);
            throw new HttpException('Failed to retrieve payment statistics', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
