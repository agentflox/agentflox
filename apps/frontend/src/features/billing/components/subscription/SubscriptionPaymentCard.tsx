"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PaypalButton from "@/features/billing/components/paypal/PaypalButton";
import StripeButton from "@/features/billing/components/stripe/StripeButton";
import { PaypalService } from "@/services/paypal.service";
import { useSession } from "next-auth/react";
import { useMemo, useCallback } from "react";

interface SubscriptionPaymentCardProps {
  plan: any;
  onError: (error: any) => void;
}

export default function SubscriptionPaymentCard({ plan, onError }: SubscriptionPaymentCardProps) {
  const { data: session } = useSession();

  // Initialize services with proper user ID
  const paypalService = useMemo(
    () => new PaypalService(session?.user?.id || ''),
    [session?.user?.id]
  );

  const handleStripeError = useCallback(() => {
    onError(new Error('Stripe payment failed'));
  }, [onError]);

  const handlePaypalError = useCallback(() => {
    onError(new Error('PayPal payment failed'));
  }, [onError]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Stripe Payment Card */}
      <Card className="border-2 border-blue-200 hover:border-blue-300 transition-colors">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
          </div>
          <CardTitle className="text-lg">Pay with Stripe</CardTitle>
          <CardDescription>
            Secure payment processing with Stripe
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              ${plan.price}
              <span className="text-sm text-muted-foreground">
                /{plan.billingPeriod?.toLowerCase()}
              </span>
            </div>
            {plan.trialDays > 0 && (
              <Badge variant="secondary" className="mt-2">
                {plan.trialDays} days free trial
              </Badge>
            )}
          </div>

          <StripeButton
            event={{ type: "BILLING.PAYMENT.SUBSCRIPTION" }}
            params={{
              userId: session?.user?.id,
              priceId: plan?.stripePriceId,
              trial_period_days: plan.trialDays || 0,
              quantity: 1,
              planId: plan.id,
            }}
            onError={handleStripeError}
            buttonText="Subscribe with Stripe"
            className="w-full"
          />
        </CardContent>
      </Card>

      {/* PayPal Payment Card */}
      <Card className="border-2 border-yellow-200 hover:border-yellow-300 transition-colors">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
          </div>
          <CardTitle className="text-lg">Pay with PayPal</CardTitle>
          <CardDescription>
            Quick and secure payments with PayPal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              ${plan.price}
              <span className="text-sm text-muted-foreground">
                /{plan.billingPeriod?.toLowerCase()}
              </span>
            </div>
            {plan.trialDays > 0 && (
              <Badge variant="secondary" className="mt-2">
                {plan.trialDays} days free trial
              </Badge>
            )}
          </div>

          <PaypalButton
            event={{ type: "BILLING.PAYMENT.SUBSCRIPTION" }}
            createAction={async (data, actions) => {
              const paypalPlanId = plan.paypalPlanId ?? plan.metadata?.paypalPlanId;
              const planId = plan.id;
              const userId = session?.user?.id;
              if (!paypalPlanId) {
                throw new Error('Missing PayPal plan ID');
              }
              if (!session?.user?.id) {
                throw new Error('Missing user session');
              }
              const payload = {
                plan_id: paypalPlanId,
                custom_id: JSON.stringify({ userId, planId })
              };

              return paypalService?.createSubscription
                ? await paypalService.createSubscription(payload, actions)
                : Promise.reject(new Error('PayPal service unavailable'));
            }}
            onApprove={(data, actions) =>
              paypalService!.onApproveSubscription!(data as any, actions as any)
            }
            onError={handlePaypalError}
            style={{ layout: 'vertical' }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
