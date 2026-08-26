"use client";
import Shell from "@/components/layout/Shell";
import UpgradeLoading from "./loading";
import { trpc } from "@/lib/trpc";
import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import Button from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Zap, Package, CreditCard, Coins, AlertCircle } from "lucide-react";
import { PageHeader } from "@/entities/shared/components/PageHeader";



export default function UpgradePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("plans");

  const plans = trpc.billing.listPlans.useQuery({});
  const packages = trpc.billing.listPackages.useQuery({});
  const currentPlan = trpc.billing.currentPlan.useQuery();

  // All hooks must be declared unconditionally, before any early return.
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
  }, []);

  const handleSubscribe = useCallback((planId: string) => {
    router.push(`/billing/upgrade/subscribe/${planId}`);
  }, [router]);

  const handleCheckout = useCallback((packageId: string) => {
    router.push(`/billing/upgrade/checkout/${packageId}`);
  }, [router]);

  // ---- Early returns now come AFTER all hooks ----

  if (plans.isLoading || packages.isLoading || currentPlan.isLoading) {
    return <UpgradeLoading />;
  }

  if (!session?.user?.id) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="h-16 w-16 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-4">
            <CreditCard className="h-8 w-8 text-zinc-400" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground max-w-sm">
            Please sign in to view upgrade options.
          </p>
        </div>
      </Shell>
    );
  }

  // ---- Plain helper functions (not hooks) — fine to keep here ----

  const getPlanFeatureItems = (feature: any) => {
    if (!feature) return [];
    const items: string[] = [];

    if (feature.maxProjects) items.push(`Up to ${feature.maxProjects} projects`);
    if (feature.maxTeams) items.push(`Up to ${feature.maxTeams} teams`);
    if (feature.maxWorkspaces) items.push(`Up to ${feature.maxWorkspaces} workspaces`);
    if (feature.maxSpaces) items.push(`Up to ${feature.maxSpaces} spaces`);
    if (feature.maxProposals) items.push(`Up to ${feature.maxProposals} proposals`);
    if (feature.maxApplicationRequests) items.push(`Up to ${feature.maxApplicationRequests} application requests/month`);
    if (feature.maxExecutions === -1) items.push(`Unlimited executions/month`);
    else if (feature.maxExecutions) items.push(`Up to ${feature.maxExecutions} executions/month`);
    if (feature.maxConcurrentRuns) items.push(`Up to ${feature.maxConcurrentRuns} concurrent runs`);
    if (feature.maxStorageGB) items.push(`${feature.maxStorageGB} GB storage`);
    if (feature.maxCredits) items.push(`${feature.maxCredits} credits`);

    if (Array.isArray(feature.description)) {
      feature.description.forEach((desc: string) => items.push(desc));
    }
    return items;
  };

  const renderPackageFeature = (feature: any) => {
    if (!feature) return null;
    const items: string[] = [];

    if (feature.maxApplicationRequests) items.push(`Add ${feature.maxApplicationRequests.toLocaleString()} application requests immediately`);
    if (feature.maxCredits) items.push(`Add ${feature.maxCredits.toLocaleString()} credits immediately`);

    return (
      <ul className="mt-6 space-y-3 text-sm">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2.5">
            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span className="text-muted-foreground">{item}</span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <Shell>
      <div className="space-y-8">
        <PageHeader
          title="Upgrade Your Account"
          description="Choose a subscription plan or purchase a one-time package to unlock more features."
        />

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex justify-center mb-8">
            <TabsList className="bg-zinc-100 dark:bg-zinc-900/60 p-1 rounded-xl h-auto inline-flex">
              <TabsTrigger value="plans" className="cursor-pointer rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm transition-all py-2.5 px-6 font-medium">
                <Zap className="h-4 w-4 mr-2 text-violet-500" />
                Subscription Plans
              </TabsTrigger>
              <TabsTrigger value="packages" className="cursor-pointer rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm transition-all py-2.5 px-6 font-medium">
                <Package className="h-4 w-4 mr-2 text-blue-500" />
                One-Time Packages
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="plans" className="mt-0">
            {plans.error ? (
              <div className="text-center py-12 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/50">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
                <p className="text-red-700 dark:text-red-400 font-medium">Error loading plans. Please try again.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500 pt-8">
                {plans.data?.map((plan: any, index: number) => {
                  const isCurrentPlan = currentPlan.data?.plan?.planType === plan.planType;
                  const isPopular = index === 1; // Assuming the second plan is Popular
                  const previousPlan = index > 0 ? plans.data[index - 1] : null;
                  const previousPlanName = previousPlan ? (previousPlan.displayName || previousPlan.name) : "Free Forever";
                  const featureItems = getPlanFeatureItems(plan.feature);

                  return (
                    <Card
                      key={plan.id}
                      className={`relative overflow-hidden flex flex-col transition-all duration-300 ${isPopular
                        ? "border-violet-500 shadow-xl ring-1 ring-violet-500/50 bg-white dark:bg-zinc-950/80 scale-[1.02] z-10"
                        : "border-zinc-200/80 dark:border-zinc-800/80 hover:border-violet-500/30 hover:shadow-lg bg-white dark:bg-zinc-950/50 mt-4"
                        }`}
                    >
                      {isPopular && (
                        <div className="w-full bg-gradient-to-r from-violet-600 to-blue-500 py-2.5 flex items-center justify-center text-white font-semibold">
                          ♥ Popular
                        </div>
                      )}

                      <div className="p-6 flex flex-col h-full relative z-10 bg-white dark:bg-zinc-950/50">
                        <div>
                          <div className="flex items-start justify-between mb-2">
                            <h3 className={`text-2xl font-bold tracking-tight ${isPopular ? "text-violet-700 dark:text-violet-400" : ""}`}>
                              {plan.displayName || plan.name}
                            </h3>
                            {isCurrentPlan && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300 border border-violet-200 dark:border-violet-500/30">
                                Current
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-baseline gap-2 pb-6 border-b border-zinc-200 dark:border-zinc-800/60 mb-6">
                          <span className="text-4xl font-extrabold tracking-tight">
                            ${plan.price}
                          </span>
                          <span className="text-sm text-muted-foreground font-medium">
                            / month
                          </span>
                        </div>

                        {plan.name !== "FREE" && (
                          <div className="mb-6">
                            {isCurrentPlan ? (
                              <Button disabled className="w-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border-0 font-semibold cursor-not-allowed opacity-100">
                                Active Plan
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handleSubscribe(plan.id)}
                                className={`w-full flex items-center justify-center gap-2 cursor-pointer font-bold transition-all duration-300 active:scale-[0.98] ${isPopular
                                  ? "bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-500 hover:to-blue-400 text-white shadow-md hover:shadow-lg border-0"
                                  : "bg-violet-600 hover:bg-violet-700 text-white shadow-sm"
                                  }`}
                              >
                                Upgrade
                              </Button>
                            )}
                          </div>
                        )}

                        {featureItems.length > 0 && (
                          <div className="flex-grow pt-2">
                            {index > 0 ? (
                              <p className="font-bold text-sm mb-4 text-foreground">
                                Everything from {previousPlanName}, and more:
                              </p>
                            ) : (
                              <p className="font-bold text-sm mb-4 text-foreground">
                                Core features included:
                              </p>
                            )}
                            <ul className="space-y-3 text-sm">
                              {featureItems.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-2.5">
                                  <Check className="h-4 w-4 text-violet-600 dark:text-violet-400 mt-0.5 flex-shrink-0" strokeWidth={3} />
                                  <span className="text-foreground">{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="packages" className="mt-0">
            {packages.error ? (
              <div className="text-center py-12 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/50">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
                <p className="text-red-700 dark:text-red-400 font-medium">Error loading packages. Please try again.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
                {packages.data?.map((pkg: any) => (
                  <Card
                    key={pkg.id}
                    className="relative overflow-hidden p-6 border-zinc-200/80 dark:border-zinc-800/80 hover:border-blue-500/30 hover:shadow-lg transition-all duration-300 bg-white dark:bg-zinc-950/50"
                  >
                    <div className="absolute -right-20 -top-20 w-40 h-40 bg-blue-500/10 dark:bg-blue-500/20 blur-3xl rounded-full pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col h-full">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Coins className="h-5 w-5 text-yellow-500" />
                          <h3 className="text-xl font-bold tracking-tight">
                            {pkg.displayName || pkg.name}
                          </h3>
                        </div>
                        <p className="text-sm text-muted-foreground min-h-[40px]">{pkg.description}</p>
                      </div>

                      <div className="mt-6">
                        <span className="text-4xl font-extrabold tracking-tight">${pkg.price}</span>
                        <span className="text-sm text-muted-foreground ml-2 font-medium">one-time</span>
                      </div>

                      <div className="flex-grow my-6 border-t border-zinc-100 dark:border-zinc-800/60 pt-6">
                        {renderPackageFeature(pkg.feature)}
                      </div>

                      <div className="mt-auto pt-4">
                        <Button
                          onClick={() => handleCheckout(pkg.id)}
                          className="w-full flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300 font-semibold active:scale-[0.98]"
                        >
                          Purchase Package
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
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