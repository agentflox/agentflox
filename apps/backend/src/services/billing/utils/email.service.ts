import emailService from "@/utils/email/emailService";
import { BillingEmailTemplates } from "./email.template";
import { SubscriptionStatus, NotificationType } from "@agentflox/database/src/generated/prisma/client";
import { EmailTemplate, BillingEmailData, EmailTheme } from "@/utils/email/types";
import { EmailServiceError } from "@/utils/email/emailService";

export class BillingEmailService {
  private theme: EmailTheme;

  private constructor(theme?: Partial<EmailTheme>) {
    this.theme = {
      brandColor: '#346df1',
      buttonText: '#ffffff',
      backgroundColor: '#f9f9f9',
      textColor: '#444444',
      headerColor: '#000000',
      ...theme
    };
  }

  public async sendSubscriptionActivated(to: string, data: BillingEmailData): Promise<any> {
    this.validateEmailData(data, ["shopName", "planName"]);
    try {
      const template = BillingEmailTemplates.getSubscriptionActivatedTemplate(data, this.theme);
      return await emailService.sendNodemailerEmail(to, template.subject, template.html);
    } catch (error) {
      if (error instanceof EmailServiceError) throw error;
      throw new EmailServiceError("Failed to send subscription activated email", "TEMPLATE_ERROR", error);
    }
  }

  public async sendSubscriptionCancelled(to: string, data: BillingEmailData): Promise<any> {
    this.validateEmailData(data, ["shopName", "planName"]);
    try {
      const template = BillingEmailTemplates.getSubscriptionCancelledTemplate(data, this.theme);
      return await emailService.sendNodemailerEmail(to, template.subject, template.html);
    } catch (error) {
      if (error instanceof EmailServiceError) throw error;
      throw new EmailServiceError("Failed to send subscription cancelled email", "TEMPLATE_ERROR", error);
    }
  }

  public async sendSubscriptionExpired(to: string, data: BillingEmailData): Promise<any> {
    this.validateEmailData(data, ["shopName", "planName", "nextBillingDate"]);
    try {
      const template = BillingEmailTemplates.getSubscriptionExpiredTemplate(data, this.theme);
      return await emailService.sendNodemailerEmail(to, template.subject, template.html);
    } catch (error) {
      if (error instanceof EmailServiceError) throw error;
      throw new EmailServiceError("Failed to send subscription expired email", "TEMPLATE_ERROR", error);
    }
  }

  public async sendSubscriptionPastDue(to: string, data: BillingEmailData): Promise<any> {
    this.validateEmailData(data, ["shopName", "planName", "amount", "currency"]);
    try {
      const template = BillingEmailTemplates.getSubscriptionFrozenTemplate(data, this.theme);
      return await emailService.sendNodemailerEmail(to, template.subject, template.html);
    } catch (error) {
      if (error instanceof EmailServiceError) throw error;
      throw new EmailServiceError("Failed to send past due email", "TEMPLATE_ERROR", error);
    }
  }

  public async sendUsageLimitApproaching(to: string, data: BillingEmailData): Promise<any> {
    this.validateEmailData(data, ["shopName", "serviceType", "currentUsage", "usageLimit"]);
    try {
      const template = BillingEmailTemplates.getUsageLimitApproachingTemplate(data, this.theme);
      return await emailService.sendNodemailerEmail(to, template.subject, template.html);
    } catch (error) {
      if (error instanceof EmailServiceError) throw error;
      throw new EmailServiceError("Failed to send usage limit approaching email", "TEMPLATE_ERROR", error);
    }
  }

  public async sendCreditsPurchased(to: string, data: BillingEmailData): Promise<any> {
    this.validateEmailData(data, ["shopName", "credits", "amount", "currency"]);
    try {
      const template = BillingEmailTemplates.getCreditsPurchasedTemplate(data, this.theme);
      return await emailService.sendNodemailerEmail(to, template.subject, template.html);
    } catch (error) {
      if (error instanceof EmailServiceError) throw error;
      throw new EmailServiceError("Failed to send credits purchased email", "TEMPLATE_ERROR", error);
    }
  }

  public async sendTrialEnding(to: string, data: BillingEmailData): Promise<any> {
    this.validateEmailData(data, ["shopName", "planName", "trialEndDate"]);
    try {
      const template = BillingEmailTemplates.getSubscriptionTrialEndingTemplate(data, this.theme);
      return await emailService.sendNodemailerEmail(to, template.subject, template.html);
    } catch (error) {
      if (error instanceof EmailServiceError) throw error;
      throw new EmailServiceError("Failed to send trial ending email", "TEMPLATE_ERROR", error);
    }
  }

  public async sendSubscriptionEmail(to: string, data: BillingEmailData, status: SubscriptionStatus): Promise<void> {
    let emailTemplate: EmailTemplate;

    switch (status) {
      case SubscriptionStatus.ACTIVE:
        emailTemplate = BillingEmailTemplates.getSubscriptionActivatedTemplate(data, this.theme);
        break;
      case SubscriptionStatus.ON_HOLD:
        emailTemplate = BillingEmailTemplates.getSubscriptionOnholdTemplate(data, this.theme);
        break;
      default:
        console.warn(`Unexpected subscription status in sendSubscriptionEmail: ${status}`);
        return;
    }

    try {
      await emailService.sendNodemailerEmail(to, emailTemplate.subject, emailTemplate.html);
    } catch (error) {
      if (error instanceof EmailServiceError) throw error;
      throw new EmailServiceError("Failed to send subscription email", "TEMPLATE_ERROR", error);
    }
  }

  public async sendUsageEmail(to: string, data: BillingEmailData, status: NotificationType): Promise<void> {
    let emailTemplate: EmailTemplate;

    switch (status) {
      case NotificationType.USAGE_OVER_LIMIT:
        emailTemplate = BillingEmailTemplates.getUsageLimitOverTemplate(data, this.theme);
        break;
      case NotificationType.USAGE_APPROACHING_LIMIT:
        emailTemplate = BillingEmailTemplates.getUsageLimitApproachingTemplate(data, this.theme);
        break;
      case NotificationType.PACKAGE_EXPIRED:
        emailTemplate = BillingEmailTemplates.getPackageExpiredWithOverageTemplate(data, this.theme);
        break;
      case NotificationType.SUBSCRIPTION_EXPIRED:
        emailTemplate = BillingEmailTemplates.getSubscriptionExpiredWithOverageTemplate(data, this.theme);
        break;
      default:
        console.warn(`Unexpected notification type in sendUsageEmail: ${status}`);
        return;
    }

    try {
      await emailService.sendNodemailerEmail(to, emailTemplate.subject, emailTemplate.html);
    } catch (error) {
      if (error instanceof EmailServiceError) throw error;
      throw new EmailServiceError("Failed to send usage email", "TEMPLATE_ERROR", error);
    }
  }

  private validateEmailData(data: BillingEmailData, requiredFields: (keyof BillingEmailData)[]): void {
    const missingFields = requiredFields.filter((field) => !data[field]);
    if (missingFields.length > 0) {
      throw new EmailServiceError(
        `Missing required data fields: ${missingFields.join(", ")}`,
        "DATA_ERROR",
        { required: requiredFields, missing: missingFields, received: data }
      );
    }
  }
}

export default BillingEmailService;
