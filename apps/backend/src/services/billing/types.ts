import { DateTime } from 'luxon';
import { PaymentGateway, PaymentMethod, PaymentStatus, PurchaseStatus, BillingType } from '@agentflox/database';

export enum PAYMENT_METHOD {
  CREDIT_CARD = "CREDIT_CARD",
  DEBIT_CARD = "DEBIT_CARD",
  BANK_TRANSFER = "BANK_TRANSFER",
  E_WALLET = "E_WALLET",
  CRYPTO = "CRYPTO",
  CASH = "CASH",
  OTHER = "OTHER"
}

export enum PAYMENT_GATEWAY {
  PAYPAL = "PAYPAL",
  STRIPE = "STRIPE",
  BRAINTREE = "BRAINTREE",
  ADYEN = "ADYEN",
  RAZORPAY = "RAZORPAY",
  SQUARE = "SQUARE",
  AUTHORIZE_NET = "AUTHORIZE_NET",
  OTHER = "OTHER"
}

export type SubscribeInput = {
  userId: string;
  planId: string;
  status: string;
  subId: string;
  payment: {
    paymentId?: string;
    paymentMethod: PaymentMethod;
    paymentGateway: PaymentGateway;
    paymentAmount?: number | string | null;
    paymentCurrency?: string | null;
    paymentTime?: string | Date | null;
    nextPaymentTime?: string | Date | null;
    paymentStatus?: string | null;
  };
  intentId?: string;
  chargeId?: string;
  refundId?: string;
  errorMessage?: string;
  currentCycleStart?: DateTime;
  currentCycleEnd?: DateTime;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
};

export interface RenewInput {
  planId: string;
  payment: {
    paymentId?: string | null;
    paymentMethod: PaymentMethod;
    paymentGateway: PaymentGateway;
    paymentAmount: string | number;
    paymentCurrency: string;
    paymentTime: string;
    paymentStatus: PaymentStatus;
  };
  currentCycleStart: string;
  currentCycleEnd?: string;
  metadata: Record<string, any>;
}

export interface PurchaseInput {
  packageId: string;
  orderId: string;
  status: string;
  payment: {
    paymentId: string;
    paymentMethod: PAYMENT_METHOD;
    paymentGateway: PAYMENT_GATEWAY;
    paymentAmount: string | number | null;
    paymentCurrency: string | null;
    paymentTime: string | null;
    paymentStatus: string | null;
  };
  metadata?: Record<string, any>;
}

export interface PurchaseDetails {
  totalActivePackages: number;
  packages: Array<{
    purchaseId: string;
    status: PurchaseStatus;
    package: {
      id: string;
      name: string;
      description?: string;
      creditAmount: number;
      price: number;
      currency: string;
      bonusCredits: number;
    };
    usage: {
      creditsUsed: number;
      remainingCredits: number;
      projectsUsed: number;
      remainingProjects: number;
      teamsUsed: number;
      remainingTeams: number;
      proposalsUsed: number;
      remainingProposals: number;
      requestsUsed: number;
      remainingRequests: number;
    };
    payment: {
      id: string;
      status: PaymentStatus;
      amount: number;
      adjustedAmount?: number;
      currency: string;
      billingType: BillingType;
      createdAt: Date;
    } | null;
    billingAdjustments: {
      promotions: Array<{
        code: string;
        value: number;
        description?: string;
        unit: string;
      }>;
      discounts: Array<{
        code: string;
        value: number;
        description?: string;
        unit: string;
      }>;
    };
    purchasedAt: Date;
    expiresAt?: Date;
  }>;
  totalCreditsAvailable: number;
}

export interface ExpiredPackageFilters {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  packageIds?: string[];
  creditPackageIds?: string[];
  minCreditsUsed?: number;
  maxCreditsUsed?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}