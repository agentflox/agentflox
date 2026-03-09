"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PaypalButton from "@/features/billing/components/paypal/PaypalButton";
import StripeButton from "@/features/billing/components/stripe/StripeButton";
import { PaypalService } from "@/services/paypal.service";
import { useSession } from "next-auth/react";
import { useMemo, useCallback } from "react";

interface CheckoutPaymentCardProps {
  pkg: any;
  onError: (error: any) => void;
}

export default function CheckoutPaymentCard({ pkg, onError }: CheckoutPaymentCardProps) {
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
              ${pkg.price}
            </div>
            <Badge variant="secondary" className="mt-2">
              One-time purchase
            </Badge>
          </div>

          <StripeButton
            event={{ type: "BILLING.PAYMENT.ORDER" }}
            params={{
              userId: session?.user?.id,
              priceId: pkg.metadata?.stripePriceId,
              quantity: 1,
              packageId: pkg.id
            }}
            onError={handleStripeError}
            buttonText="Purchase with Stripe"
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
              ${pkg.price}
            </div>
            <Badge variant="secondary" className="mt-2">
              One-time purchase
            </Badge>
          </div>

          <PaypalButton
            event={{ type: "BILLING.PAYMENT.ORDER" }}
            createAction={async (_, actions) => {
              return await paypalService!.onCreateOrder!(
                {
                  event: { type: "BILLING.PAYMENT.ORDER" },
                  userId: session!.user.id,
                  pkg,
                },
                actions
              );
            }}
            onApprove={(data, actions) =>
              paypalService!.onApproveOrder!(data as any, actions as any)
            }
            onError={handlePaypalError}
            style={{ layout: 'vertical' }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
