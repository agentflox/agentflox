import { 
  Prisma, 
  PrismaClient, 
  Usage, 
  PaymentStatus, 
  BillingType, 
  BillingEventType, 
  Promotion,
  Discount,
  PurchaseStatus, 
  CreditPurchase, 
  Payment, 
  NotificationType,
  CreditPackage
} from '@agentflox/database';
import { DateTime } from 'luxon';
import { prisma } from '@/lib/prisma';
import { PurchaseDetails, ExpiredPackageFilters, PurchaseInput } from '../types';

export class CreditManager {
  private static readonly TRANSACTION_TIMEOUT = 50000;
  private static readonly MAX_WAIT = 5000;

  static readonly Errors = {
    USER_NOT_FOUND: 'User not found',
    PACKAGE_NOT_FOUND: 'Credit package not found',
    PURCHASE_NOT_FOUND: 'Credit purchase not found',
    TRANSACTION_FAILED: 'Transaction failed',
    PAYMENT_FAILED: 'Payment processing failed',
    MISSING_PARAMETERS: 'Missing required parameters',
    NO_EMAIL_PROVIDED: 'No email provided for purchase notification',
  } as const;

  private static readonly packageInclude = {
    feature: true,
    promotions: {
      include: {
        promotion: true, 
      },
    },
    discounts: {
      include: {
        discount: true, 
      },
    },
    purchases: {
      include: {
        user: true,
        payment: true,
        billingEvents: true,
        usage: true
      }
    }
  };

  private static readonly purchaseInclude = {
    user: true,
    payment: true,
    billingEvents: {
      include: {
        promotion: true,
        discount: true
      }
    },
    package: {
      include: {
        feature: true
      }
    },
    usage: true
  };

  private static readonly paymentInclude = {
    creditPurchase: true,
    subscription: true
  };

  private static async executeTransaction<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
    errorMessage: string
  ): Promise<T> {
    try {
      return await prisma.$transaction(operation, {
        timeout: this.TRANSACTION_TIMEOUT,
        maxWait: this.MAX_WAIT,
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });
    } catch (error) {
      console.error(`${errorMessage}:`, error);
      throw new Error(`${errorMessage}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static getPaymentStatus(status: string): PaymentStatus {
    switch (status) {
      case 'COMPLETED':
      case 'PAID':
      case 'ACTIVE':
        return PaymentStatus.SUCCEEDED;
      case 'PENDING':
        return PaymentStatus.PENDING;
      case 'FAILED':
      case 'DENIED':
        return PaymentStatus.FAILED;
      case 'CANCELLED':
        return PaymentStatus.CANCELED;
      case 'REFUNDED':
        return PaymentStatus.REFUNDED;
      case 'EXPIRED':
        return PaymentStatus.EXPIRED;
      default:
        throw new Error(`Unknown gateway status: ${status}`);
    }
  }

  private static getPurchaseStatus(status: string): PurchaseStatus {
    switch (status) {
      case 'COMPLETED':
      case 'PAID':
      case 'ACTIVE':
        return PurchaseStatus.ACTIVE;
      case 'PENDING':
      case 'FAILED':
      case 'DENIED':
      case 'CANCELLED':
      case 'REFUNDED':
      case 'EXPIRED':
        return PurchaseStatus.CANCELLED;
      default:
        throw new Error(`Unknown gateway status: ${status}`);
    }
  }

  /**
   * Get purchase details for a user
   */
  static async getPurchaseDetails(userName: string): Promise<PurchaseDetails | null> {
    try {
      const activePackages = await this.getActivePackages(userName) as any[];
      if (!activePackages.length) return null;

      const packageDetails = await Promise.all(
        activePackages.map(async (purchase: any) => {
          const usageDetails = this.getPackageUsageDetails(purchase.usage || null);
          return {
            purchaseId: purchase.id,
            status: purchase.status,
            package: {
              id: purchase.package?.id,
              name: purchase.package?.name,
              description: purchase.package?.description,
              creditAmount: purchase.creditAmount,
              price: purchase.price,
              currency: purchase.currency,
              bonusCredits: purchase.bonusCredits
            },
            billingAdjustments: {
              promotions: [],
              discounts: []
            },
            usage: usageDetails,
            payment: purchase.payment ? {
              id: purchase.payment.id,
              status: purchase.payment.status,
              amount: purchase.payment.amount,
              adjustedAmount: purchase.payment.adjustedAmount,
              currency: purchase.payment.currency,
              billingType: purchase.payment.billingType,
              createdAt: purchase.payment.createdAt
            } : null,
            purchasedAt: purchase.purchasedAt,
            expiresAt: purchase.expiresAt || undefined
          };
        })
      );

      return {
        totalActivePackages: packageDetails?.length ?? 0,
        packages: packageDetails,
        totalCreditsAvailable: packageDetails.reduce((sum, pkg) => 
          sum + pkg.usage.remainingCredits, 0),
      };
    } catch (error) {
      console.error('Error getting purchase details:', error);
      throw new Error(`Failed to get purchase details: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all standard packages
   */
  static async getAllStandardPackages(): Promise<CreditPackage[]> {
    return await prisma.creditPackage.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        sortOrder: 'asc'
      },
      include: {
        feature: true,
        promotions: {
          include: {
            promotion: true
          }
        },
        discounts: {
          include: {
            discount: true
          }
        }
      }
    });
  }

  /**
   * Purchase credits with promotions and discounts
   */
  static async purchase(
    userId: string,
    details: PurchaseInput
  ): Promise<{ creditPurchase: CreditPurchase; payment: Payment }> {
    try {
      const now = DateTime.utc().toJSDate();
  
      if (!userId) throw new Error(this.Errors.USER_NOT_FOUND);
  
      const { packageId, orderId, status, payment, metadata } = details;

      // Idempotency: skip if purchase with same orderId exists
      if (orderId) {
        const existing = await prisma.creditPurchase.findFirst({
          where: { orderId },
          include: this.purchaseInclude
        });
        if (existing) {
          // Try to fetch payment record related to this purchase
          const existingPayment = existing.payment || await prisma.payment.findFirst({ where: { purchaseId: existing.id } });
          return { creditPurchase: existing as any, payment: existingPayment as any };
        }
      }
  
      // ✅ Validate package
      const creditPackage = await this.getPackageById(packageId);
      if (!creditPackage) throw new Error(this.Errors.PACKAGE_NOT_FOUND);
  
      // ✅ Payment & status logic
      const paymentTime = payment.paymentTime
        ? DateTime.fromISO(payment.paymentTime)
        : DateTime.utc();
  
      const paymentStatus = this.getPaymentStatus(payment.paymentStatus || status);
      const purchaseStatus = this.getPurchaseStatus(status);
  
      if (paymentStatus !== PaymentStatus.SUCCEEDED) {
        throw new Error(
          "Payment was not successful. Please try again or contact support."
        );
      }
  
      // ✅ Transaction: Create credit purchase + payment + usage + notification
      return await prisma.$transaction(
        async (tx) => {
          // Create credit purchase
          const creditPurchase = await tx.creditPurchase.create({
            data: {
              userId,
              packageId,
              orderId,
              creditAmount: creditPackage.creditAmount,
              bonusCredits: creditPackage.bonusCredits,
              totalCredits:
                creditPackage.creditAmount + creditPackage.bonusCredits,
              price: creditPackage.price,
              currency: creditPackage.currency,
              status: purchaseStatus,
              purchasedAt: now,
              expiresAt: creditPackage.validityDays
                ? DateTime.fromJSDate(now)
                    .plus({ days: creditPackage.validityDays })
                    .toJSDate()
                : undefined,
              metadata: details.metadata ?? {},
            },
            include: this.purchaseInclude,
          });
  
          // Usage tracking
          const feature = creditPackage.feature;
          await tx.usage.create({
            data: {
              userId,
              creditPurchaseId: creditPurchase.id,
              maxCredits: creditPackage.creditAmount + creditPackage.bonusCredits,
              remainingCredits:
                creditPackage.creditAmount + creditPackage.bonusCredits,
              maxProjects: feature?.maxProjects,
              remainingProjects: feature?.maxProjects,
              maxTeams: feature?.maxTeams,
              remainingTeams: feature?.maxTeams,
              maxProposals: feature?.maxProposals,
              remainingProposals: feature?.maxProposals,
              maxRequests: feature?.maxRequests,
              remainingRequests: feature?.maxRequests,
            },
          });
  
          // Create payment record
          const paymentRecord = await tx.payment.create({
            data: {
              userId,
              purchaseId: creditPurchase.id,
              billingType: BillingType.ONE_TIME,
              paymentMethod: payment.paymentMethod,
              paymentGateway: payment.paymentGateway,
              amount: Number(payment.paymentAmount) ?? 0,
              currency: payment.paymentCurrency ?? "USD",
              status: paymentStatus,
              billingPeriodStart: paymentTime.toJSDate(),
              billingPeriodEnd: null,
              chargeId: orderId ?? payment.paymentId,
              refundId: null,
              failureReason: null,
              metadata: details.metadata ?? {},
            },
          });
  
          // Notify user
          await tx.notification.create({
            data: {
              userId,
              type: NotificationType.BILLING,
              title: `Package Purchased: ${creditPackage.name}`,
              content: `Thank you for purchasing the ${creditPackage.name} package! Your package is now active with ${creditPurchase.totalCredits} total credits.`,
            },
          });
  
          return { creditPurchase, payment: paymentRecord };
        },
        {
          timeout: this.TRANSACTION_TIMEOUT,
          maxWait: this.MAX_WAIT,
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        }
      );
    } catch (error) {
      console.error("Credit purchase error:", error);
  
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new Error(`Unique constraint failed: ${error.meta?.target}`);
        }
      }
  
      throw error;
    }
  }  
  
  /**
   * Get package by ID
   */
  static async getPackageById(id: string) {
    try {
      const creditPackage = await prisma.creditPackage.findUnique({
        where: { id },
        include: this.packageInclude
      });

      if (!creditPackage) {
        throw new Error(this.Errors.PACKAGE_NOT_FOUND);
      }

      return creditPackage;
    } catch (error) {
      console.error("Package fetch error:", error);
      throw new Error(`Failed to fetch package: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get package by name
   */
  static async getPackageByName(packageName: string): Promise<CreditPackage | null> {
    try {
      const creditPackage = await prisma.creditPackage.findUnique({
        where: { name: packageName },
        include: this.packageInclude
      });

      if (!creditPackage) {
        throw new Error(this.Errors.PACKAGE_NOT_FOUND);
      }

      return creditPackage;
    } catch (error) {
      console.error("Package fetch error:", error);
      throw new Error(`Failed to fetch package: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get active packages for a user
   */
  static async getActivePackages(userName: string): Promise<CreditPurchase[]> {
    const user = await prisma.user.findUnique({
      where: { username: userName }
    });

    if (!user) throw new Error(this.Errors.USER_NOT_FOUND);

    return await prisma.creditPurchase.findMany({
      where: {
        userId: user.id,
        status: PurchaseStatus.ACTIVE,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: this.purchaseInclude,
      orderBy: {
        purchasedAt: 'asc',
      },
    });
  }

  /**
   * Get expired packages for a user
   */
  static async getExpiredPackages(
    userName: string, 
    filters: ExpiredPackageFilters = {}
  ): Promise<{ packages: CreditPurchase[]; total: number }> {
    const user = await prisma.user.findUnique({
      where: { username: userName }
    });

    if (!user) throw new Error(this.Errors.USER_NOT_FOUND);

    const {
      startDate,
      endDate,
      limit,
      offset,
      packageIds,
      creditPackageIds,
      minCreditsUsed,
      maxCreditsUsed,
      sortBy = 'purchasedAt',
      sortOrder = 'desc'
    } = filters;

    const where: Prisma.CreditPurchaseWhereInput = {
      userId: user.id,
      status: PurchaseStatus.CANCELLED,
      ...(startDate && {
        purchasedAt: {
          gte: startDate
        }
      }),
      ...(endDate && {
        purchasedAt: {
          lte: endDate
        }
      }),
      ...(packageIds?.length && {
        id: {
          in: packageIds
        }
      }),
      ...(creditPackageIds?.length && {
        packageId: {
          in: creditPackageIds
        }
      }),
      ...(minCreditsUsed !== undefined || maxCreditsUsed !== undefined) && {
        usage: {
          ...(minCreditsUsed !== undefined && {
            remainingCredits: {
              lte: minCreditsUsed
            }
          }),
          ...(maxCreditsUsed !== undefined && {
            remainingCredits: {
              gte: maxCreditsUsed
            }
          })
        }
      }
    };

    const total = await prisma.creditPurchase.count({ where });

    const packages = await prisma.creditPurchase.findMany({
      where,
      include: this.purchaseInclude,
      orderBy: {
        [sortBy]: sortOrder
      },
      ...(limit && { take: limit }),
      ...(offset && { skip: offset })
    });

    return {
      packages,
      total
    };
  }

  /**
   * Get package usage details
   */
  static getPackageUsageDetails(usage: Usage | null) {
    if (!usage) {
      return {
        creditsUsed: 0,
        remainingCredits: 0,
        projectsUsed: 0,
        remainingProjects: 0,
        teamsUsed: 0,
        remainingTeams: 0,
        proposalsUsed: 0,
        remainingProposals: 0,
        requestsUsed: 0,
        remainingRequests: 0
      };
    }

    return {
      creditsUsed: usage.maxCredits - usage.remainingCredits,
      remainingCredits: usage.remainingCredits,
      projectsUsed: usage.maxProjects - usage.remainingProjects,
      remainingProjects: usage.remainingProjects,
      teamsUsed: usage.maxTeams - usage.remainingTeams,
      remainingTeams: usage.remainingTeams,
      proposalsUsed: usage.maxProposals - usage.remainingProposals,
      remainingProposals: usage.remainingProposals,
      requestsUsed: usage.maxRequests - usage.remainingRequests,
      remainingRequests: usage.remainingRequests
    };
  }

  /**
   * Update payment status
   */
  static async updatePaymentStatus(
    intentId: string,
    status: PaymentStatus,
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { intentId },
        include: { purchase: true }
      });

      if (!payment) throw new Error('Payment not found');

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status,
          processedAt: status === PaymentStatus.SUCCEEDED ? new Date() : undefined,
          // no updatedAt field per schema
        }
      });

      if (payment.purchase) {
        const newStatus = status === PaymentStatus.SUCCEEDED ? PurchaseStatus.ACTIVE :
                         status === PaymentStatus.CANCELED ? PurchaseStatus.CANCELLED :
                         status === PaymentStatus.FAILED ? PurchaseStatus.FROZEN :
                         PurchaseStatus.EXPIRED;

        await tx.creditPurchase.update({
          where: { id: payment.purchase.id },
          data: { status: newStatus }
        });
      }
    });
  }

  /**
   * Get credit history for a user
   */
  static async getCreditHistory(userName: string) {
    const user = await prisma.user.findUnique({
      where: { username: userName }
    });

    if (!user) throw new Error(this.Errors.USER_NOT_FOUND);
    
    return await prisma.creditPurchase.findMany({
      where: {
        userId: user.id
      },
      include: {
        payment: true,
        package: true,
        usage: true
      },
      orderBy: {
        purchasedAt: 'desc'
      }
    });
  }

  /**
   * Check and update package status (expire if depleted)
   */
  static async checkAndUpdatePackageStatus(userName: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { username: userName }
    });

    if (!user) throw new Error(this.Errors.USER_NOT_FOUND);

    const activePackages = await prisma.creditPurchase.findMany({
      where: {
        userId: user.id,
        status: PurchaseStatus.ACTIVE
      },
      include: {
        usage: true
      }
    });

    await prisma.$transaction(async (tx) => {
      for (const pkg of activePackages) {
        const usage = pkg.usage;
        
        if (!usage) continue;

        // Check if package is depleted or expired
        const isExpired = pkg.expiresAt && new Date() > pkg.expiresAt;
        const isDepleted = usage.remainingCredits <= 0;

        if (isExpired || isDepleted) {
        await tx.creditPurchase.update({
            where: { id: pkg.id },
          data: { 
            status: PurchaseStatus.CANCELLED
          }
          });
        }
      }
    });
  }

  /**
   * Get next available package (FIFO)
   */
  static async getNextAvailablePackage(userName: string) {
    const user = await prisma.user.findUnique({
      where: { username: userName }
    });

    if (!user) throw new Error(this.Errors.USER_NOT_FOUND);

    return await prisma.creditPurchase.findFirst({
      where: {
        userId: user.id,
        status: PurchaseStatus.ACTIVE,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ],
        usage: {
          remainingCredits: {
            gt: 0
          }
        }
      },
      include: {
        package: true,
        usage: true
      },
      orderBy: {
        purchasedAt: 'asc' // FIFO
      }
    });
  }

  /**
   * Check if credit purchase exists with the same order ID
   */
  static async checkOrderExists(orderId: string): Promise<boolean> {
    try {
      const purchase = await prisma.creditPurchase.findFirst({
        where: { orderId: orderId }
      });
      return !!purchase;
    } catch (error) {
      console.error('Error checking order existence:', error);
      return false;
    }
  }

  /**
   * Update credit purchase metadata to prevent duplicate status modals
   */
  static async updateOrderMetadata(orderId: string, metadata: Record<string, any>): Promise<void> {
    try {
      await prisma.creditPurchase.updateMany({
        where: { orderId: orderId },
        data: { metadata }
      });
    } catch (error) {
      console.error('Error updating order metadata:', error);
      throw error;
    }
  }
}