'use client';
import React, { useCallback } from 'react';
import { getStripe } from '@/lib/stripe/client';
import { Button } from '@/components/ui/button';
import { billingService } from '@/services/billing.service';

interface StripeButtonProps {
  event: { type: string };
  params: Record<string, any>;
  onError: (error?: any) => void;
  className?: string;
  buttonText?: string;
}

const StripeButton: React.FC<StripeButtonProps> = ({
  event,
  params,
  onError,
  className = "text-white cursor-pointer",
  buttonText = "PURCHASE",
}) => {
  const handleSubmit = useCallback(async () => {
    try {
      const stripe = await getStripe();
      if (!stripe) throw new Error('Stripe not initialized');

      const isSubscription = event.type === "BILLING.PAYMENT.SUBSCRIPTION";
      const response = isSubscription
        ? await billingService.stripe.createSubscription({
          userId: params.userId,
          planId: params.planId || params.priceId,
          successUrl: params.successUrl,
          cancelUrl: params.cancelUrl,
          trialPeriodDays: params.trial_period_days,
        })
        : await billingService.stripe.createCheckout({
          userId: params.userId,
          packageId: params.packageId || params.priceId,
          successUrl: params.successUrl,
          cancelUrl: params.cancelUrl,
        });

      const data = await response.json();
      if (!data?.result?.url) {
        throw new Error('Invalid checkout session response');
      }
      window.location.href = data.result.url;
    } catch (error) {
      console.error('Stripe checkout error:', error);
      onError(error);
    }
  }, [event, params, onError]);

  return (
    <Button onClick={handleSubmit} className={className} aria-label="Purchase with Stripe">
      {buttonText}
    </Button>
  );
};

export default React.memo(StripeButton);
