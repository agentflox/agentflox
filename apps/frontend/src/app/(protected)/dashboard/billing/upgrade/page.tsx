"use client";
import Shell from "@/components/layout/Shell";
import { trpc } from "@/lib/trpc";
import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import Button from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

export default function UpgradePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("plans");

  const plans = trpc.billing.listPlans.useQuery({});
  const packages = trpc.billing.listPackages.useQuery({});
  const currentPlan = trpc.billing.currentPlan.useQuery();

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
  }, []);

  const handleSubscribe = (planId: string) => {
    router.push(`/dashboard/billing/upgrade/subscribe/${planId}`);
  };

  const handleCheckout = (packageId: string) => {
    router.push(`/dashboard/billing/upgrade/checkout/${packageId}`);
  };

  if (!session?.user?.id) {
    return (
      <Shell>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">
            Please sign in to view upgrade options.
          </p>
        </div>
      </Shell>
    );
  }

  /** Render feature list for subscription plans */
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
      feature.description.forEach((desc: string) => {
        items.push(desc);
      });
    }

    return (
      <ul className="mt-4 space-y-2 text-sm">
        {items.map((item, idx) => (
          <li key={idx}>• {item}</li>
        ))}
      </ul>
    );
  };

  /** Render feature list for one-time credit packages */
  const renderPackageFeature = (feature: any) => {
    if (!feature) return null;
    const items: string[] = [];

    if (feature.maxRequests)
      items.push(`Add ${feature.maxRequests.toLocaleString()} requests`);

    return (
      <ul className="mt-4 space-y-2 text-sm">
        {items.map((item, idx) => (
          <li key={idx}>• {item}</li>
        ))}
      </ul>
    );
  };

  return (
    <Shell>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold">Upgrade</h1>
          <p className="text-muted-foreground">
            Choose a subscription plan or purchase a one-time package.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
            <TabsTrigger value="packages">One-Time Packages</TabsTrigger>
          </TabsList>

          {/* Subscription Plans */}
          <TabsContent value="plans" className="mt-6">
            {plans.isLoading ? (
              <div className="text-center py-8">Loading plans...</div>
            ) : plans.error ? (
              <div className="text-center py-8 text-red-500">
                Error loading plans. Please try again.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.data?.map((plan: any) => (
                  <Card
                    key={plan.id}
                    className="p-6 border hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-medium">
                          {plan.displayName || plan.name}
                        </h3>
                        <p className="text-muted-foreground">{plan.description}</p>
                      </div>
                    </div>

                    <div className="mt-4 text-3xl font-semibold">
                      ${plan.price}
                      <span className="text-sm text-muted-foreground">
                        /{plan.billingPeriod?.toLowerCase()}
                      </span>
                    </div>

                    {renderPlanFeature(plan.feature)}

                    {plan.name !== "FREE" && (
                      <div className="mt-6">
                        {currentPlan.data?.plan?.planType === plan.planType ? (
                          <div className="text-center">
                            <div className="mb-2 text-sm text-green-600 font-medium">
                              Current Plan
                            </div>
                            <Button disabled className="w-full">
                              Current Plan
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => handleSubscribe(plan.id)}
                            className="w-full flex items-center justify-center gap-2 cursor-pointer"
                          >
                            Subscribe Now
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* One-Time Packages */}
          <TabsContent value="packages" className="mt-6">
            {packages.isLoading ? (
              <div className="text-center py-8">Loading packages...</div>
            ) : packages.error ? (
              <div className="text-center py-8 text-red-500">
                Error loading packages. Please try again.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {packages.data?.map((pkg: any) => (
                  <Card
                    key={pkg.id}
                    className="p-6 border hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-medium">
                          {pkg.displayName || pkg.name}
                        </h3>
                        <p className="text-muted-foreground">{pkg.description}</p>
                      </div>
                    </div>

                    <div className="mt-4 text-3xl font-semibold">${pkg.price}</div>

                    {renderPackageFeature(pkg.feature)}

                    <div className="mt-6">
                      <Button
                        onClick={() => handleCheckout(pkg.id)}
                        className="w-full flex items-center justify-center gap-2 cursor-pointer"
                      >
                        Purchase Now
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Shell>
  );
}
