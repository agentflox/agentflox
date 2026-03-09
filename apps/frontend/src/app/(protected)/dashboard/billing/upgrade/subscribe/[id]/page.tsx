"use client";

import Shell from "@/components/layout/Shell";
import { trpc } from "@/lib/trpc";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Star } from "lucide-react";
import SubscriptionPaymentCard from "@/features/billing/components/subscription/SubscriptionPaymentCard";
import { useSession } from "next-auth/react";

export default function SubscribePage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [error, setError] = useState<string | null>(null);

  const plans = trpc.billing.listPlans.useQuery({});
  
  const selectedPlan = useMemo(
    () => plans.data?.find((p: any) => p.id === id),
    [plans.data, id]
  );

  const handleError = useCallback((error: any) => {
    console.error("Payment error:", error);
    setError(error.message || "Payment failed. Please try again.");
  }, []);

  const handleBack = () => {
    router.push("/dashboard/billing/upgrade");
  };

  if (!session?.user?.id) {
    return (
      <Shell>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">
            Please sign in to subscribe to plans.
          </p>
        </div>
      </Shell>
    );
  }

  if (plans.isLoading) {
    return (
      <Shell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading plan details...</p>
          </div>
        </div>
      </Shell>
    );
  }

  if (plans.error || !selectedPlan) {
    return (
      <Shell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-500 mb-4">
              Plan not found or error loading plan details.
            </p>
            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Plans
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  /** Render feature list for this plan */
  const renderPlanFeature = (feature: any) => {
    if (!feature) return null;
    const items: string[] = [];

    if (feature.maxProjects)
      items.push(`Up to ${feature.maxProjects} projects`);
    if (feature.maxTeams)
      items.push(`Up to ${feature.maxTeams} teams`);
    if (feature.maxProposals)
      items.push(`Up to ${feature.maxProposals} proposals`);
    if (feature.maxRequests)
      items.push(`Up to ${feature.maxRequests} requests/month`);
    if (feature.maxStorageGB)
      items.push(`${feature.maxStorageGB} GB storage`);
    if (feature.maxCredits)
      items.push(`${feature.maxCredits} credits`);

    if (Array.isArray(feature.description)) {
      feature.description.forEach((desc: string) => items.push(desc));
    }

    return (
      <ul className="space-y-2 mt-2">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <Shell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-semibold">
              Subscribe to {selectedPlan.displayName || selectedPlan.name}
            </h1>
            <p className="text-muted-foreground">
              Choose your preferred payment method to start your subscription
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Plan Details */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Star className="w-6 h-6 text-primary" />
                  {selectedPlan.displayName || selectedPlan.name}
                </CardTitle>
                <CardDescription className="mt-2 text-base">
                  {selectedPlan.description}
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-primary">
                  ${selectedPlan.price}
                  <span className="text-lg text-muted-foreground">
                    /{selectedPlan.billingPeriod?.toLowerCase()}
                  </span>
                </div>
                {selectedPlan.trialDays > 0 && (
                  <Badge variant="secondary" className="mt-2">
                    {selectedPlan.trialDays} days free trial
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              <h4 className="font-medium text-lg">What's included:</h4>
              {renderPlanFeature(selectedPlan.feature)}
            </div>
          </CardContent>
        </Card>

        {/* Payment Options */}
        <div>
          <h2 className="text-2xl font-semibold mb-6">Choose Payment Method</h2>
          <SubscriptionPaymentCard plan={selectedPlan} onError={handleError} />
        </div>

        {/* Additional Info */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>• Your subscription will be automatically renewed unless cancelled</p>
              <p>• You can cancel your subscription at any time from your billing dashboard</p>
              <p>• All payments are processed securely through our trusted payment partners</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
