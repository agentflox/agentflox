import { PromotionUnit } from '@agentflox/database';
import { EmailTemplate, EmailTheme, BillingEmailData } from '@/utils/email/types';

interface BillingTemplateContent {
  subject: string;
  html: string;
}

// Using shared BillingEmailData; any extra ad-hoc fields are accessed via (data as any)

export class BillingEmailTemplates {
  private static cleanShopName(shopName: string): string {
    if (!shopName) return '';
    let cleaned = shopName.replace(/^(https?:\/\/)/, '');
    cleaned = cleaned.replace('.myshopify.com', '');
    cleaned = cleaned.replace(/\/$/, '');
    return cleaned;
  }

  private static getPromotionUnitDisplay(unit: PromotionUnit): string {
    switch (unit) {
      case PromotionUnit.PERCENTAGE:
        return "%";
      case PromotionUnit.AMOUNT:
        return "USD";
      case PromotionUnit.CREDITS:
        return "credits";
      case PromotionUnit.DAYS:
        return "days";
      case PromotionUnit.REQUESTS:
        return "requests";
      case PromotionUnit.TOKENS:
        return "tokens";
      default:
        throw new Error(`Unknown promotion unit: ${unit}`);
    }
  }

  private static formatPaymentAmount(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      maximumFractionDigits: 2,
    }).format(amount);
  }

  private static formatDiscountValue(amount: number, unit: PromotionUnit): string {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'decimal',
      maximumFractionDigits: 2,
    }).format(amount);
    const unitDisplay = this.getPromotionUnitDisplay(unit);
    return `${formattedAmount} ${unitDisplay}`.trim();
  }

  private static formatDate (date: string | Date | undefined) {
    if (!date) return '';
    return new Date(date as any).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private static getBaseTemplate(content: BillingTemplateContent, theme: EmailTheme): EmailTemplate {
    return {
      subject: content.subject,
      html: `
        <body style="background: ${theme.backgroundColor}; margin: 0; padding: 0; font-family: Arial, sans-serif;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table style="background: #ffffff; max-width: 600px; width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                  <tr>
                    <td style="padding: 40px;">
                      <img src="https://ozuowglcgqoxtxnncluc.supabase.co/storage/v1/object/public/app_images/Doc2Product-logo.png" style="width: 200px; margin-bottom: 20px;"/>
                      ${content.html}
                      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: ${theme.textColor}; font-size: 14px;">
                        <p>Need help? Contact our support team at support@doc2product.com</p>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      `
    };
  }

  static getSubscriptionActivatedTemplate(data: BillingEmailData, theme: EmailTheme): EmailTemplate {
    const content = {
      subject: `Subscription Activated - ${this.cleanShopName(data.shopName)}`,
      html: `
        <h1 style="color: ${theme.headerColor}; margin-bottom: 24px;">Subscription Activated</h1>
        <p style="color: ${theme.textColor}; margin-bottom: 16px;">
          Your subscription to the ${data.planName} plan has been successfully activated for ${this.cleanShopName(data.shopName)}.
        </p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0;">
          <h3 style="color: ${theme.headerColor}; margin-top: 0;">Subscription Details:</h3>
          <p style="color: ${theme.textColor}; margin: 8px 0;">Plan: ${data.planName}</p>
          <p style="color: ${theme.textColor}; margin: 8px 0;">Amount: ${this.formatPaymentAmount(data.amount ?? 0)} ${data.currency}/month</p>
          <p style="color: ${theme.textColor}; margin: 8px 0;">Current billing date: ${(data as any)?.currentBillingDate ?? ''}</p>
          <p style="color: ${theme.textColor}; margin: 8px 0;">Next billing date: ${data.nextBillingDate}</p>
        </div>
      `
    };
    return this.getBaseTemplate(content, theme);
  }

  static getSubscriptionTrialActivatedTemplate(data: BillingEmailData, theme: EmailTheme): EmailTemplate {
    const content = {
      subject: `Trial Activated - ${this.cleanShopName(data.shopName)}`,
      html: `
        <h1 style="color: ${theme.headerColor}; margin-bottom: 24px;">Trial Period Activated</h1>
        <p style="color: ${theme.textColor}; margin-bottom: 16px;">
          Your ${data.planName} trial has been successfully activated for ${this.cleanShopName(data.shopName)}.
        </p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0;">
          <h3 style="color: ${theme.headerColor}; margin-top: 0;">Trial Details:</h3>
          <p style="color: ${theme.textColor}; margin: 8px 0;">Plan: ${data.planName}</p>
          <p style="color: ${theme.textColor}; margin: 8px 0;">Trial End Date: ${this.formatDate(data.nextBillingDate)}</p>
          <p style="color: ${theme.textColor}; margin: 8px 0;">Plan Price: ${this.formatPaymentAmount(data.amount ?? 0)} ${data.currency}</p>
        </div>
        <p style="color: ${theme.textColor}; margin: 16px 0;">
          After your trial ends, you'll be automatically subscribed to the ${data.planName} plan to ensure uninterrupted service.
        </p>
      `
    };
    return this.getBaseTemplate(content, theme);
  }

  static getSubscriptionTrialEndedActivationTemplate(data: BillingEmailData, theme: EmailTheme): EmailTemplate {
    const content = {
      subject: `Trial Ended - Subscription Activated - ${this.cleanShopName(data.shopName)}`,
      html: `
        <h1 style="color: ${theme.headerColor}; margin-bottom: 24px;">Trial Period Ended - Subscription Activated</h1>
        <p style="color: ${theme.textColor}; margin-bottom: 16px;">
          Your trial period has ended and your subscription has been automatically activated for ${this.cleanShopName(data.shopName)}.
        </p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0;">
          <h3 style="color: ${theme.headerColor}; margin-top: 0;">Subscription Details:</h3>
          <p style="color: ${theme.textColor}; margin: 8px 0;">Plan: ${data.planName}</p>
          <p style="color: ${theme.textColor}; margin: 8px 0;">Amount: ${this.formatPaymentAmount(data.amount ?? 0)} ${data.currency}/month</p>
          <p style="color: ${theme.textColor}; margin: 8px 0;">Billing date: ${data.nextBillingDate}</p>
        </div>
        <p style="color: ${theme.textColor}; margin: 16px 0;">
          Your first payment has been processed successfully. Thank you for choosing to continue with our service!
        </p>
      `
    };
    return this.getBaseTemplate(content, theme);
  }

  static getSubscriptionRenewingTemplate(data: BillingEmailData, theme: EmailTheme): EmailTemplate {
    const content = {
      subject: `Subscription Renewed - ${this.cleanShopName(data.shopName)}`,
      html: `
        <h1 style="color: ${theme.headerColor}; margin-bottom: 24px;">Subscription Activated</h1>
        <p style="color: ${theme.textColor}; margin-bottom: 16px;">
          Your subscription to the ${data.planName} plan has been successfully renewed for ${this.cleanShopName(data.shopName)}.
        </p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0;">
          <h3 style="color: ${theme.headerColor}; margin-top: 0;">Subscription Details:</h3>
          <p style="color: ${theme.textColor}; margin: 8px 0;">Plan: ${data.planName}</p>
          <p style="color: ${theme.textColor}; margin: 8px 0;">Amount: ${this.formatPaymentAmount(data.amount ?? 0)} ${data.currency}/month</p>
          ${
            (data as any)?.adjustedAmount && (data as any)?.adjustedAmount > 0 && (data as any)?.adjustedUnit
              ? `<p style=\"color: ${theme.textColor}; margin: 8px 0;\">Discount Amount: ${this.formatDiscountValue((data as any).adjustedAmount, (data as any).adjustedUnit)}</p>`
              : ''
          }
          <p style=\"color: ${theme.textColor}; margin: 8px 0;\">Current billing date: ${(data as any)?.currentBillingDate ?? ''}</p>
          <p style="color: ${theme.textColor}; margin: 8px 0;">Next billing date: ${data.nextBillingDate}</p>
        </div>
      `
    };
    return this.getBaseTemplate(content, theme);
  }

  static getSubscriptionCancelledTemplate(data: BillingEmailData, theme: EmailTheme): EmailTemplate {
    const content = {
      subject: `Subscription Cancelled - ${this.cleanShopName(data.shopName)}`,
      html: `
        <h1 style="color: ${theme.headerColor}; margin-bottom: 24px;">Subscription Cancelled</h1>
        <p style="color: ${theme.textColor}; margin-bottom: 16px;">
          Your subscription to the ${data.planName} plan has been cancelled for ${this.cleanShopName(data.shopName)}.
        </p>
        <p style="color: ${theme.textColor}; margin-bottom: 16px;">
          To continue using our advanced features and services, please select a subscription plan.
        </p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0;">
          <h3 style="color: ${theme.headerColor}; margin-top: 0;">Access Until:</h3>
          <p style="color: ${theme.textColor}; margin: 8px 0;">${data.nextBillingDate}</p>
        </div>
        <a href="https://admin.shopify.com/store/${this.cleanShopName(data.shopName)}/apps/doc2product-latest/billing" 
          style="background-color: ${theme.brandColor}; color: ${theme.buttonText}; padding: 12px 24px; 
          border-radius: 4px; text-decoration: none; display: inline-block; margin: 20px 0;">
          Subscribe Subscription
        </a>
      `
    };
    return this.getBaseTemplate(content, theme);
  }

  static getSubscriptionProrateCancelledTemplate(data: BillingEmailData, theme: EmailTheme): EmailTemplate {
    const content = {
      subject: `Subscription Cancelled - ${this.cleanShopName(data.shopName)}`,
      html: `
        <h1 style="color: ${theme.headerColor}; margin-bottom: 24px;">Subscription Cancelled</h1>
        <p style="color: ${theme.textColor}; margin-bottom: 16px;">
          Your subscription to the ${data.planName} plan has been cancelled for ${this.cleanShopName(data.shopName)}.
        </p>
        <p style="color: ${theme.textColor}; margin-bottom: 16px;">
          Based on your usage period, you will receive a prorated refund of $${this.formatPaymentAmount((data as any).adjustedAmount || 0)}. 
          This refund will be processed automatically.
        </p>
        <p style="color: ${theme.textColor}; margin-bottom: 16px;">
          To continue using our advanced features and services, please select a subscription plan.
        </p>
        <a href="https://admin.shopify.com/store/${this.cleanShopName(data.shopName)}/apps/doc2product-latest/billing" 
           style="background-color: ${theme.brandColor}; color: ${theme.buttonText}; padding: 12px 24px; 
           border-radius: 4px; text-decoration: none; display: inline-block; margin: 20px 0;">
          Subscribe Subscription
        </a>
      `
    };
    return this.getBaseTemplate(content, theme);
  }

  static getSubscriptionDeclinedTemplate(data: BillingEmailData, theme: EmailTheme): EmailTemplate {
    const content = {
      subject: `Subscription Declined - ${this.cleanShopName(data.shopName)}`,
      html: `
        <h1 style="color: ${theme.headerColor}; margin-bottom: 24px;">Subscription Cancelled</h1>
        <p style="color: ${theme.textColor}; margin-bottom: 16px;">
          Your subscription to the ${data.planName} plan has been declined for ${this.cleanShopName(data.shopName)}.
        </p>
        <p style="color: ${theme.textColor}; margin-bottom: 16px;">
          To continue using our advanced features and services, please select a subscription plan.
        </p>
        <a href="https://admin.shopify.com/store/${this.cleanShopName(data.shopName)}/apps/doc2product-latest/billing" 
           style="background-color: ${theme.brandColor}; color: ${theme.buttonText}; padding: 12px 24px; 
           border-radius: 4px; text-decoration: none; display: inline-block; margin: 20px 0;">
          Subscribe Subscription
        </a>
      `
    };
    return this.getBaseTemplate(content, theme);
  }

  static getSubscriptionExpiredTemplate(data: BillingEmailData, theme: EmailTheme): EmailTemplate {
    const content = {
      subject: `Subscription Expired - ${this.cleanShopName(data.shopName)}`,
      html: `
        <h1 style="color: ${theme.headerColor}; margin-bottom: 24px;">Subscription Expired</h1>
        <p style="color: ${theme.textColor}; margin-bottom: 16px;">
          Your subscription to the ${data.planName} plan has expired for ${this.cleanShopName(data.shopName)}.
        </p>
        <p style="color: ${theme.textColor}; margin-bottom: 16px;">
          To continue using doc2product's features, please renew your subscription.
        </p>
        <a href="https://admin.shopify.com/store/${this.cleanShopName(data.shopName)}/apps/doc2product-latest/billing" 
           style="background-color: ${theme.brandColor}; color: ${theme.buttonText}; padding: 12px 24px; 
           border-radius: 4px; text-decoration: none; display: inline-block; margin: 20px 0;">
          Renew Subscription
        </a>
      `
    };
    return this.getBaseTemplate(content, theme);
  }

  static getCreditsPurchasedTemplate(data: BillingEmailData, theme: EmailTheme): EmailTemplate {
    const content = {
      subject: `Credits Purchase Confirmed - ${this.cleanShopName(data.shopName)}`,
      html: `
        <h1 style="color: ${theme.headerColor}; margin-bottom: 24px;">Credits Purchase Confirmed</h1>
        <p style="color: ${theme.textColor}; margin-bottom: 16px;">
          Your purchase of additional credits has been confirmed for ${this.cleanShopName(data.shopName)}.
        </p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0;">
          <h3 style="color: ${theme.headerColor}; margin-top: 0;">Purchase Details:</h3>
          <p style="color: ${theme.textColor}; margin: 8px 0;">Plan: ${(data as any).packageName ?? ''}</p>
          <p style="color: ${theme.textColor}; margin: 8px 0;">Credits Added: ${data.credits}</p>
          <p style="color: ${theme.textColor}; margin: 8px 0;">Amount: ${this.formatPaymentAmount(data.amount ?? 0)} ${data.currency}</p>
          ${
            (data as any)?.adjustedAmount && (data as any)?.adjustedAmount > 0 && (data as any)?.adjustedUnit
              ? `<p style=\"color: ${theme.textColor}; margin: 8px 0;\">Discount Amount: ${this.formatDiscountValue((data as any).adjustedAmount, (data as any).adjustedUnit)}</p>`
              : ''
          }
          <p style=\"color: ${theme.textColor}; margin: 8px 0;\">Billing date: ${(data as any).billingDate ?? ''}</p>
        </div>
      `
    };
    return this.getBaseTemplate(content, theme);
  }     

  static getSubscriptionTrialEndingTemplate(data: BillingEmailData, theme: EmailTheme): EmailTemplate {
    const content = {
      subject: `Trial Ending Soon - ${this.cleanShopName(data.shopName)}`,
      html: `
        <h1 style="color: ${theme.headerColor}; margin-bottom: 24px;">Trial Ending Soon</h1>
        <p style="color: ${theme.textColor}; margin-bottom: 16px;">
          Your trial period for doc2product will end on ${data.nextBillingDate}.
        </p>
        <p style="color: ${theme.textColor}; margin-bottom: 16px;">
          To continue using our advanced features and services, please select a subscription plan.
        </p>
        <a href="https://admin.shopify.com/store/${this.cleanShopName(data.shopName)}/apps/doc2product-latest/billing" 
           style="background-color: ${theme.brandColor}; color: ${theme.buttonText}; padding: 12px 24px; 
           border-radius: 4px; text-decoration: none; display: inline-block; margin: 20px 0;">
          Choose a Plan
        </a>
      `
    };
    return this.getBaseTemplate(content, theme);
  }

  static getSubscriptionPendingTemplate(data: BillingEmailData, theme: EmailTheme): EmailTemplate {
    const content = {
      subject: `Subscription Pending - ${this.cleanShopName(data.shopName)}`,
      html: `
        <h1 style="color: ${theme.headerColor}; margin-bottom: 24px;">Subscription Pending Cancellation</h1>
        <p style="color: ${theme.textColor}; margin-bottom: 16px;">
          Your subscription to the ${data.planName} plan for ${this.cleanShopName(data.shopName)} is pending.
        </p>
        <p style="color: ${theme.textColor}; margin-bottom: 16px;">
          To continue using our advanced features and services, please select a subscription plan.
        </p>
        <a href="https://admin.shopify.com/store/${this.cleanShopName(data.shopName)}/apps/doc2product-latest/billing" 
           style="background-color: ${theme.brandColor}; color: ${theme.buttonText}; padding: 12px 24px; 
           border-radius: 4px; text-decoration: none; display: inline-block; margin: 20px 0;">
          Choose a Plan
        </a>
      `
    };
    return this.getBaseTemplate(content, theme);
  }

  static getSubscriptionOnholdTemplate(data: BillingEmailData, theme: EmailTheme): EmailTemplate {
    const content = {
      subject: `Subscription On Hold - ${this.cleanShopName(data.shopName)}`,
      html: `
        <h1 style="color: ${theme.headerColor}; margin-bottom: 24px;">Subscription On Hold</h1>
        <p style="color: ${theme.textColor}; margin-bottom: 16px;">
          Your subscription to the ${data.planName} plan has been put on hold for ${this.cleanShopName(data.shopName)}.
        </p>
        <p style="color: ${theme.textColor}; margin-bottom: 16px;">
          You'll continue to have access to your current plan features until the end of your billing period.
        </p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0;">
          <h3 style="color: ${theme.headerColor}; margin-top: 0;">Access Until:</h3>
          <p style="color: ${theme.textColor}; margin: 8px 0;">${data.nextBillingDate}</p>
        </div>
      `
    };
    return this.getBaseTemplate(content, theme);
  }
  
    static getSubscriptionFrozenTemplate(data: BillingEmailData, theme: EmailTheme): EmailTemplate {
      const content = {
        subject: `Payment Past Due - ${data.shopName}`,
        html: `
          <h1 style="color: ${theme.headerColor}; margin-bottom: 24px;">Payment Past Due</h1>
          <p style="color: ${theme.textColor}; margin-bottom: 16px;">
              The payment for your ${data.planName} subscription is past due for ${data.shopName}.
          </p>
          <p style="color: ${theme.textColor}; margin-bottom: 16px;">
              Your services have been temporarily paused. Please update your payment information to restore access.
          </p>
          <div style="background: #fff4f4; padding: 20px; border-radius: 4px; margin: 20px 0; border: 1px solid #ffe0e0;">
              <h3 style="color: #d32f2f; margin-top: 0;">Account Status: Frozen</h3>
              <p style="color: ${theme.textColor}; margin: 8px 0;">Amount Due: ${this.formatPaymentAmount(data.amount ?? 0)}</p>
          </div>
          <a href="https://admin.shopify.com/store/${data.shopName}/apps/doc2product-latest/billing" 
             style="background-color: ${theme.brandColor}; color: ${theme.buttonText}; padding: 12px 24px; 
             border-radius: 4px; text-decoration: none; display: inline-block; margin: 20px 0;">
              Update Payment Method
          </a>
        `
      };
    return this.getBaseTemplate(content, theme);
  }

   static getPackageExpiredWithOverageTemplate(data: BillingEmailData, theme: EmailTheme): EmailTemplate {
    const getActivePackagesSection = (activePackages: any[]) => {
        if (!activePackages?.length) return '';
        return `
          <div style="background: #f5f9ff; padding: 20px; border-radius: 4px; margin: 20px 0; border: 1px solid #e3efff;">
            <h3 style="color: ${theme.headerColor}; margin-top: 0;">Active Packages</h3>
            ${activePackages.map(pkg => `
              <div style="margin: 12px 0;">
                <p style="color: ${theme.textColor}; margin: 4px 0;">
                  <strong>${pkg.packageName}</strong>
                  <br>
                  <span style="font-size: 0.9em;">Credits Remaining: ${pkg.remainingCredits}</span>
                </p>
              </div>
            `).join('')}
          </div>
        `;
      };

      const getContextualMessage = (activePackages: any[]) => {
        if (!activePackages?.length) {
          return `You currently have no active packages. To continue using our services without interruption, 
          please purchase additional credits or upgrade your plan.`;
        }
        return `While your ${(data as any).usageDetails?.packageName} package has expired, you still have ${activePackages.length} 
          active package${activePackages.length > 1 ? 's' : ''}. Consider purchasing additional credits to ensure 
          uninterrupted service when your current packages expire.`;
      };

      const content = {
        subject: `Package ${(data as any).usageDetails?.packageName} Expired - ${this.cleanShopName(data.shopName)}`,
        html: `
          <h1 style="color: ${theme.headerColor}; margin-bottom: 24px;">Package Status Update</h1>
          <div style="background: #fff4f4; padding: 20px; border-radius: 4px; margin: 20px 0; border: 1px solid #ffe0e0;">
            <h3 style="color: #d32f2f; margin-top: 0;">Expired Package</h3>
            <div style="margin-top: 16px;">
              <p style="color: ${theme.textColor}; margin: 4px 0;">
                <strong>Package Name:</strong> ${(data as any).usageDetails?.packageName}
              </p>
              <p style="color: ${theme.textColor}; margin: 4px 0;">
                <strong>Expiration Date:</strong> ${(data as any).usageDetails?.expiredDate}
              </p>
            </div>
          </div>
          ${getActivePackagesSection((data as any).activePackages)}
          <p style="color: ${theme.textColor}; margin: 16px 0;">
            ${getContextualMessage((data as any).activePackages)}
          </p>
          <div style="margin: 24px 0;">
            <h3 style="color: ${theme.headerColor};">Available Options:</h3>
            <ul style="color: ${theme.textColor}; padding-left: 20px;">
              <li style="margin: 8px 0;">Purchase additional credits for expanded usage</li>
              <li style="margin: 8px 0;">Upgrade to a higher tier plan for better value</li>
              <li style="margin: 8px 0;">Contact our support team for customized solutions</li>
            </ul>
          </div>
          <div style="margin: 24px 0; text-align: center;">
            <a href="https://admin.shopify.com/store/${this.cleanShopName(data.shopName)}/apps/doc2product-latest/billing" 
              style="background-color: ${theme.brandColor}; color: ${theme.buttonText}; padding: 12px 24px; 
              border-radius: 4px; text-decoration: none; display: inline-block;">
              Manage Packages
            </a>
          </div>
          <p style="color: ${theme.textColor}; font-size: 0.9em; margin-top: 24px;">
            Need help? Our support team is always here to assist you with any questions or concerns.
          </p>
          `
      };
      return this.getBaseTemplate(content, theme);
  }

  static getSubscriptionExpiredWithOverageTemplate(data: BillingEmailData, theme: EmailTheme): EmailTemplate {
    const content = {
      subject: `Subscription Limit Reached - ${this.cleanShopName(data.shopName)}`,
      html: `
        <h1 style="color: ${theme.headerColor}; margin-bottom: 24px;">Subscription Limit Reached</h1>
        
        <div style="background: #fff4f4; padding: 20px; border-radius: 4px; margin: 20px 0; border: 1px solid #ffe0e0;">
          <h3 style="color: #d32f2f; margin-top: 0;">Important Notice</h3>
          <p style="color: ${theme.textColor}; margin: 8px 0;">
            You have reached your subscription usage limits for ${((data as any).usageDetails?.service ?? 'your').toString()} service. Doc2Product will now use your active credit packages (if any) to ensure uninterrupted service.
          </p>
        </div>
        <div style="margin: 16px 0;">
          <h3 style="color: ${theme.headerColor};">Usage Reset Information</h3>
          <p style="color: ${theme.textColor}; margin: 8px 0;">
            Your subscription limits will reset automatically at the start of your next billing cycle:
          </p>
          <p style="color: ${theme.textColor}; font-weight: bold; margin: 8px 0;">
            Next Reset: ${(data as any).usageDetails?.nextResetDate ?? ''}
          </p>
        </div>
        <div style="margin: 24px 0;">
          <h3 style="color: ${theme.headerColor};">Recommended Actions</h3>
          <ul style="color: ${theme.textColor}; padding-left: 20px;">
            <li style="margin: 8px 0;">Add more credits to your account for immediate use</li>
            <li style="margin: 8px 0;">Consider upgrading to a higher tier plan for increased limits</li>
            <li style="margin: 8px 0;">Review our usage optimization guidelines</li>
          </ul>
        </div>
        <div style="margin: 24px 0; text-align: center;">
          <a href="https://admin.shopify.com/store/${this.cleanShopName(data.shopName)}/apps/doc2product-latest/billing" 
             style="background-color: ${theme.brandColor}; color: ${theme.buttonText}; padding: 12px 24px; 
             border-radius: 4px; text-decoration: none; display: inline-block;">
            Manage Subscription
          </a>
        </div>

        <p style="color: ${theme.textColor}; font-size: 0.9em; margin-top: 24px;">
          Need help? Our support team is always here to assist you with any questions or concerns.
        </p>
      `
    };
    return this.getBaseTemplate(content, theme);
  }

  static getUsageLimitApproachingTemplate(data: BillingEmailData, theme: EmailTheme): EmailTemplate {
    const content = {
      subject: `Usage Limit Approaching - ${this.cleanShopName(data.shopName)}`,
      html: `
        <h1 style="color: ${theme.headerColor}; margin-bottom: 24px;">Usage Limit Approaching</h1>
        <div style="background: #fff8e1; padding: 20px; border-radius: 4px; margin: 20px 0; border: 1px solid #ffe0b2;">
          <h3 style="color: #f57c00; margin-top: 0;">Total Usage Status</h3>
          <p style="color: ${theme.textColor}; margin: 8px 0;">
            Credits Used: ${(data as any).usageDetails?.totalUsage?.creditsUsed ?? 0} / ${(data as any).usageDetails?.totalUsage?.creditLimit ?? 0}
          </p>
          <p style="color: ${theme.textColor}; margin: 8px 0;">
            Usage: ${Number(((data as any).usageDetails?.totalUsage?.percentageUsed ?? 0)).toFixed(1)}%
          </p>
        </div>
        <div style="margin: 24px 0;">
          <h3 style="color: ${theme.headerColor};">Service Details</h3>
          ${(((data as any).usageDetails?.serviceDetails ?? []) as any[]).map(service => `
            <div style="background: #f8f9fa; padding: 16px; border-radius: 4px; margin: 12px 0;">
              <h4 style="color: ${theme.headerColor}; margin-top: 0;">${service.service}</h4>
              <p style="color: ${theme.textColor}; margin: 4px 0;">
                Requests: ${service.totalRequestsUsed} / ${service.totalRequests}
              </p>
              <p style="color: ${theme.textColor}; margin: 4px 0;">
                Usage: ${Number(service.percentageUsed ?? 0).toFixed(1)}%
              </p>
              <p style="color: ${theme.textColor}; margin: 4px 0;">
                Remaining: ${service.remainingRequests} requests
              </p>
            </div>
          `).join('')}
        </div>
        <div style="background: #e3f2fd; padding: 20px; border-radius: 4px; margin: 20px 0;">
          <h3 style="color: ${theme.headerColor}; margin-top: 0;">Recommended Actions</h3>
          <ul style="color: ${theme.textColor}; padding-left: 20px;">
            <li>Monitor your usage over the next few days</li>
            <li>Consider implementing rate limiting in your application</li>
            <li>Review our documentation for optimization tips</li>
          </ul>
        </div>
        <a href="https://admin.shopify.com/store/${this.cleanShopName(data.shopName)}/apps/doc2product-latest/billing" 
          style="background-color: ${theme.brandColor}; color: ${theme.buttonText}; padding: 12px 24px; 
          border-radius: 4px; text-decoration: none; display: inline-block; margin: 20px 0;">
          View Usage Details
        </a>
      `
    };
    return this.getBaseTemplate(content, theme);
  }

  static getUsageLimitOverTemplate(data: BillingEmailData, theme: EmailTheme): EmailTemplate {
    const content = {
      subject: `Usage Limit Exceeded - ${this.cleanShopName(data.shopName)}`,
      html: `
      <h1 style="color: ${theme.headerColor}; margin-bottom: 24px;">Usage Limit Exceeded</h1>
      <div style="background: #fff4f4; padding: 20px; border-radius: 4px; margin: 20px 0; border: 1px solid #ffe0e0;">
        <h3 style="color: #d32f2f; margin-top: 0;">Total Usage Status</h3>
        <p style="color: ${theme.textColor}; margin: 8px 0;">
            Credits Used: ${(data as any).usageDetails?.totalUsage?.creditsUsed ?? 0} / ${(data as any).usageDetails?.totalUsage?.creditLimit ?? 0}
        </p>
        <p style="color: ${theme.textColor}; margin: 8px 0;">
            Usage: ${Number(((data as any).usageDetails?.totalUsage?.percentageUsed ?? 0)).toFixed(1)}%
        </p>
      </div>
      <div style="margin: 24px 0;">
        <h3 style="color: ${theme.headerColor};">Service Details</h3>
        ${(((data as any).usageDetails?.serviceDetails ?? []) as any[]).map(service => `
          <div style="background: #f8f9fa; padding: 16px; border-radius: 4px; margin: 12px 0;">
            <h4 style="color: ${theme.headerColor}; margin-top: 0;">${service.service}</h4>
            <p style="color: ${theme.textColor}; margin: 4px 0;">
                Requests: ${service.totalRequestsUsed} / ${service.totalRequests}
            </p>
            <p style="color: ${theme.textColor}; margin: 4px 0;">
                Usage: ${(service.percentageUsed).toFixed(1)}%
            </p>
            <p style="color: ${theme.textColor}; margin: 4px 0;">
                Remaining: ${service.remainingRequests} requests
            </p>
          </div>
        `).join('')}
      </div>
      <div style="background: #fff8e1; padding: 20px; border-radius: 4px; margin: 20px 0;">
        <h3 style="color: ${theme.headerColor}; margin-top: 0;">Recommended Actions</h3>
        <ul style="color: ${theme.textColor}; padding-left: 20px;">
          <li>Upgrade your plan to increase your usage limits</li>
          <li>Review your API usage patterns for optimization</li>
          <li>Contact support if you need temporary limit extensions</li>
        </ul>
      </div>
      <a href="https://admin.shopify.com/store/${this.cleanShopName(data.shopName)}/apps/doc2product-latest/billing" 
         style="background-color: ${theme.brandColor}; color: ${theme.buttonText}; padding: 12px 24px; 
         border-radius: 4px; text-decoration: none; display: inline-block; margin: 20px 0;">
          Upgrade Plan
      </a>
    `
    };
    return this.getBaseTemplate(content, theme);
  }

}