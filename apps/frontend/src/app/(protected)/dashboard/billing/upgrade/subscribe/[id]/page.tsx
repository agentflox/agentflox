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
import { ArrowLeft, Check, Star, Zap, CreditCard, ShieldCheck, AlertCircle } from "lucide-react";
import SubscriptionPaymentCard from "@/features/billing/components/subscription/SubscriptionPaymentCard";
import { useSession } from "next-auth/react";

const SubscribeSkeleton = () => (
  <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
    <div className="flex items-center gap-4">
      <div className="h-10 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse"></div>
      <div className="space-y-2">
        <div className="h-8 w-64 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse"></div>
        <div className="h-4 w-96 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse"></div>
      </div>
    </div>
    
    <Card className="border-zinc-100 dark:border-zinc-800/60 p-6 bg-white/50 dark:bg-zinc-950/50">
       <div className="flex justify-between">
         <div className="space-y-4 w-1/2">
           <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse"></div>
           <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse"></div>
           <div className="space-y-2 pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
             <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse"></div>
             <div className="h-4 w-2/3 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse"></div>
           </div>
         </div>
         <div className="space-y-2 text-right">
           <div className="h-10 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse ml-auto"></div>
           <div className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse ml-auto"></div>
         </div>
       </div>
    </Card>

    <div className="space-y-6">
      <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse"></div>
      <div className="h-64 w-full bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse"></div>
    </div>
  </div>
);

export default function SubscribePage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();

  const plans = trpc.billing.listPlans.useQuery({});
  
  const selectedPlan = useMemo(
    () => plans.data?.find((p: any) => p.id === id),
    [plans.data, id]
  );

  const handleBack = () => {
    router.push("/dashboard/billing/upgrade");
  };

  if (!session?.user?.id) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="h-16 w-16 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-4">
            <CreditCard className="h-8 w-8 text-zinc-400" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground max-w-sm">
            Please sign in to subscribe to plans.
          </p>
        </div>
      </Shell>
    );
  }

  if (plans.isLoading) {
    return (
      <Shell>
        <SubscribeSkeleton />
      </Shell>
    );
  }

  if (plans.error || !selectedPlan) {
    return (
      <Shell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center bg-red-50 dark:bg-red-950/20 p-8 rounded-xl border border-red-100 dark:border-red-900/50">
            <p className="text-red-700 dark:text-red-400 mb-6 font-medium text-lg">
              Plan not found or error loading plan details.
            </p>
            <Button onClick={handleBack} variant="outline" className="cursor-pointer border-red-200 hover:bg-red-100 dark:border-red-900/50 dark:hover:bg-red-900/30">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Plans
            </Button>
          </div>
        </div>
      </Shell>
    );
  }



  return (
    <Shell>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-5">
          <Button onClick={handleBack} variant="outline" className="cursor-pointer h-12 w-12 p-0 rounded-full shadow-sm hover:shadow-md transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              Subscribe to <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-blue-600 dark:from-violet-400 dark:to-blue-400">{selectedPlan.displayName || selectedPlan.name}</span>
            </h1>
            <p className="text-muted-foreground mt-1 text-lg">
              Select your preferred payment method to complete the transaction securely.
            </p>
          </div>
        </div>

        {/* Payment Options */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-950 rounded-xl shadow-sm border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden">
            <SubscriptionPaymentCard plan={selectedPlan} onError={console.error} />
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-zinc-50 dark:bg-zinc-900/40 rounded-xl p-6 border border-zinc-100 dark:border-zinc-800/50 flex items-start gap-4">
          <ShieldCheck className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground space-y-2 font-medium">
            <p>• Your subscription will be automatically renewed unless cancelled.</p>
            <p>• You can cancel your subscription at any time from your billing dashboard.</p>
            <p>• All payments are processed securely through our trusted payment partners with bank-grade encryption.</p>
          </div>
        </div>
      </div>
    </Shell>
  );
}
