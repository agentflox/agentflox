"use client";
import Shell from "@/components/layout/Shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import Button from "@/components/ui/button";
import { useCallback, useState } from "react";
import {
  Plus,
  CreditCard,
  Receipt,
  AlertCircle,
  Zap,
  Package,
  History,
  Coins,
  ArrowRight
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/entities/shared/components/PageHeader";

const StatusBadge = ({ status }: { status: string }) => {
  const s = status?.toUpperCase() || 'UNKNOWN';
  const isSuccess = s === 'COMPLETED' || s === 'SUCCESS' || s === 'ACTIVE' || s === 'PAID';
  const isPending = s === 'PENDING' || s === 'PROCESSING';
  const isFailed = s === 'FAILED' || s === 'CANCELLED' || s === 'CANCELED' || s === 'INCOMPLETE';

  if (isSuccess) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 shadow-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        {status}
      </span>
    );
  }
  if (isPending) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 shadow-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
        {status}
      </span>
    );
  }
  if (isFailed) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20 shadow-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
        {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 shadow-sm">
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-500"></span>
      {status}
    </span>
  );
};

const BillingSkeleton = () => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <div className="space-y-4">
      <div className="flex gap-2 mb-6">
        <div className="h-10 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse"></div>
        <div className="h-10 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse"></div>
        <div className="h-10 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse"></div>
      </div>
      <Card className="p-0 border-zinc-100 dark:border-zinc-800/60 overflow-hidden bg-white/50 dark:bg-zinc-950/50">
        <div className="h-20 border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/20 p-6 flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-5 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse"></div>
            <div className="h-4 w-64 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse"></div>
          </div>
          <div className="h-10 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse"></div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse mb-6"></div>
            <div className="h-10 w-full bg-zinc-100 dark:bg-zinc-900/40 rounded-md animate-pulse"></div>
            <div className="h-10 w-full bg-zinc-100 dark:bg-zinc-900/40 rounded-md animate-pulse"></div>
            <div className="h-10 w-full bg-zinc-100 dark:bg-zinc-900/40 rounded-md animate-pulse"></div>
          </div>
          <div className="space-y-4">
            <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse mb-6"></div>
            <div className="h-10 w-full bg-zinc-100 dark:bg-zinc-900/40 rounded-md animate-pulse"></div>
            <div className="h-10 w-full bg-zinc-100 dark:bg-zinc-900/40 rounded-md animate-pulse"></div>
          </div>
        </div>
      </Card>
    </div>
  </div>
);

export default function BillingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const currentPlan = trpc.billing.currentPlan.useQuery(undefined, { enabled: !!session?.user?.id });
  const payments = trpc.billing.payments.useQuery({ page: 1, pageSize: 10 }, { enabled: !!session?.user?.id });
  const purchases = trpc.billing.creditPurchases.useQuery({ page: 1, pageSize: 10 }, { enabled: !!session?.user?.id });

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelReasonOther, setCancelReasonOther] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const cancelReasons = [
    'Too expensive',
    'Not using enough',
    'Switching providers',
    'Technical issues',
    'Other'
  ];

  const planName = currentPlan.data?.plan?.displayName || currentPlan.data?.plan?.name || "Free";
  const isLoading = currentPlan.isLoading || payments.isLoading || purchases.isLoading;

  const handleUpgrade = useCallback(() => {
    router.push("/dashboard/billing/upgrade");
  }, [router]);

  const handleCancelSubmit = async () => {
    if (!cancelReason) {
      alert('Please select a reason for cancellation');
      return;
    }

    if (cancelReason === 'Other' && !cancelReasonOther.trim()) {
      alert('Please provide additional details');
      return;
    }

    setIsProcessing(true);
    try {
      await fetch('/api/stripe/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: currentPlan.data?.subId, userId: session?.user?.id, reason: cancelReason }),
      });
      window.location.reload();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
    } finally {
      setIsProcessing(false);
    }
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
            Please sign in to manage your billing, view payment history, and purchase packages.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-8">
        <PageHeader
          title="Billing & Subscription"
          description="Manage your subscription plan, review your payment history, and purchase credits."
        />

        {isLoading ? (
          <BillingSkeleton />
        ) : (
          <>
            <Tabs defaultValue="subscription" className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <TabsList className="bg-zinc-100 dark:bg-zinc-900/60 p-1 rounded-xl h-auto">
                <TabsTrigger value="subscription" className="cursor-pointer rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm transition-all py-2 px-4">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Subscription
                </TabsTrigger>
                <TabsTrigger value="credits" className="cursor-pointer rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm transition-all py-2 px-4">
                  <Coins className="h-4 w-4 mr-2" />
                  Credits
                </TabsTrigger>
                <TabsTrigger value="history" className="cursor-pointer rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm transition-all py-2 px-4">
                  <Receipt className="h-4 w-4 mr-2" />
                  History
                </TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="subscription" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <Card className="p-0 overflow-hidden border-zinc-200/80 dark:border-zinc-800/60 shadow-sm bg-white dark:bg-zinc-950/30">
                    <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold flex items-center gap-2">
                          <Zap className="h-5 w-5 text-blue-500" />
                          Subscription Details
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">Manage your current plan, status, and renewal cycle.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          onClick={handleUpgrade}
                          className="shadow-sm bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white border-0 cursor-pointer gap-2"
                        >
                          <Zap className="h-4 w-4" />
                          Change plan
                        </Button>
                        <Button
                          variant="outline"
                          className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-500 dark:hover:text-red-400 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/50 transition-colors"
                          onClick={() => setShowCancelModal(true)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>

                    {currentPlan.data ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-zinc-700">
                        <div className="p-6">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Plan Information</h4>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center py-3 border-b border-dashed border-zinc-100 dark:border-zinc-800">
                              <span className="text-muted-foreground flex items-center gap-2.5 text-sm"><Package className="h-4 w-4" /> Plan</span>
                              <span className="font-medium text-sm">{currentPlan.data.plan?.displayName || currentPlan.data.plan?.name}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-dashed border-zinc-100 dark:border-zinc-800">
                              <span className="text-muted-foreground flex items-center gap-2.5 text-sm"><AlertCircle className="h-4 w-4" /> Status</span>
                              <StatusBadge status={currentPlan.data.status || 'UNKNOWN'} />
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-dashed border-zinc-100 dark:border-zinc-800">
                              <span className="text-muted-foreground flex items-center gap-2.5 text-sm"><CreditCard className="h-4 w-4" /> Price</span>
                              <span className="font-medium text-sm">${currentPlan.data.plan?.price} <span className="text-muted-foreground font-normal">/ {currentPlan.data.plan?.billingPeriod?.toLowerCase()}</span></span>
                            </div>
                          </div>
                        </div>

                        <div className="p-6 bg-zinc-50/30 dark:bg-zinc-900/10">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Billing Cycle</h4>
                          <div className="space-y-1">
                            {currentPlan.data.currentPeriodStart && (
                              <div className="flex justify-between items-center py-3 border-b border-dashed border-zinc-100 dark:border-zinc-800">
                                <span className="text-muted-foreground flex items-center gap-2.5 text-sm"><History className="h-4 w-4" /> Started</span>
                                <span className="font-medium text-sm">{new Date(currentPlan.data.currentPeriodStart).toLocaleDateString()}</span>
                              </div>
                            )}
                            {currentPlan.data.currentPeriodEnd && (
                              <div className="flex justify-between items-center py-3 border-b border-dashed border-zinc-100 dark:border-zinc-800">
                                <span className="text-muted-foreground flex items-center gap-2.5 text-sm"><ArrowRight className="h-4 w-4" /> Next billing</span>
                                <span className="font-medium text-sm">{new Date(currentPlan.data.currentPeriodEnd).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-12 flex flex-col items-center text-center text-muted-foreground">
                        <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-4">
                          <AlertCircle className="h-6 w-6 opacity-50" />
                        </div>
                        <p className="font-medium">No active subscription found.</p>
                        <p className="text-sm mt-1">Upgrade your account to unlock features.</p>
                      </div>
                    )}
                  </Card>
                </TabsContent>

                <TabsContent value="credits" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <Card className="p-0 overflow-hidden border-zinc-200/80 dark:border-zinc-800/60 shadow-sm bg-white dark:bg-zinc-950/30">
                    <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/60 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/20">
                      <div>
                        <h3 className="text-xl font-semibold flex items-center gap-2">
                          <Coins className="h-5 w-5 text-yellow-500" />
                          Credit Purchases
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">History of your credit package purchases.</p>
                      </div>
                      <Button
                        onClick={handleUpgrade}
                        size="sm"
                        className="gap-2 shadow-sm bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white border-0 cursor-pointer"
                      >
                        <Plus className="h-4 w-4" /> Buy Credits
                      </Button>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-zinc-50/80 dark:bg-zinc-900/50">
                          <TableRow className="hover:bg-transparent border-zinc-100 dark:border-zinc-800/60">
                            <TableHead className="font-semibold">Amount</TableHead>
                            <TableHead className="font-semibold">Credits</TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
                            <TableHead className="font-semibold text-right pr-6">Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {purchases.data?.items?.length > 0 ? (
                            purchases.data.items.map((purchase: any) => (
                              <TableRow key={purchase.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30 transition-colors border-zinc-100 dark:border-zinc-800/60">
                                <TableCell className="font-medium text-foreground">${purchase.amount}</TableCell>
                                <TableCell>
                                  <span className="flex items-center gap-1.5 text-yellow-700 dark:text-yellow-500 font-semibold bg-yellow-100/50 dark:bg-yellow-500/10 px-2.5 py-1 rounded-full w-max text-xs border border-yellow-200/50 dark:border-yellow-500/20">
                                    <Coins className="h-3.5 w-3.5" />
                                    +{purchase.credits}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <StatusBadge status={purchase.status} />
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm text-right pr-6">
                                  {new Date(purchase.createdAt).toLocaleDateString()}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="h-40 text-center">
                                <div className="flex flex-col items-center justify-center text-muted-foreground">
                                  <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-3">
                                    <Coins className="h-6 w-6 opacity-40" />
                                  </div>
                                  <p className="font-medium text-foreground">No credit purchases</p>
                                  <p className="text-sm mt-1">You haven't bought any credit packages yet.</p>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="history" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <Card className="p-0 overflow-hidden border-zinc-200/80 dark:border-zinc-800/60 shadow-sm bg-white dark:bg-zinc-950/30">
                    <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/60 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/20">
                      <div>
                        <h3 className="text-xl font-semibold flex items-center gap-2">
                          <Receipt className="h-5 w-5 text-indigo-500" />
                          Payment History
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">Review your past transactions and invoices.</p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-zinc-50/80 dark:bg-zinc-900/50">
                          <TableRow className="hover:bg-transparent border-zinc-100 dark:border-zinc-800/60">
                            <TableHead className="font-semibold">Amount</TableHead>
                            <TableHead className="font-semibold">Type</TableHead>
                            <TableHead className="font-semibold">Method</TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
                            <TableHead className="font-semibold text-right pr-6">Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payments.data?.items?.length > 0 ? (
                            payments.data.items.map((pay: any) => (
                              <TableRow key={pay.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30 transition-colors border-zinc-100 dark:border-zinc-800/60">
                                <TableCell className="font-medium text-foreground">
                                  {pay.currency} {pay.amount}
                                </TableCell>
                                <TableCell>
                                  <span className="capitalize text-muted-foreground text-sm font-medium">{pay.billingType?.toLowerCase() || 'Subscription'}</span>
                                </TableCell>
                                <TableCell>
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-900/80 text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-800">
                                    <CreditCard className="h-3.5 w-3.5" />
                                    {pay.paymentGateway || pay.paymentMethod || 'Stripe'}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <StatusBadge status={pay.status} />
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm text-right pr-6">
                                  {new Date(pay.createdAt).toLocaleDateString()}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="h-40 text-center">
                                <div className="flex flex-col items-center justify-center text-muted-foreground">
                                  <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-3">
                                    <Receipt className="h-6 w-6 opacity-40" />
                                  </div>
                                  <p className="font-medium text-foreground">No payments found</p>
                                  <p className="text-sm mt-1">Your payment history will appear here.</p>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          </>
        )}
      </div>

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-0 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-5 pb-4 border-b border-zinc-100 dark:border-zinc-800/50 bg-red-50/50 dark:bg-red-950/20 shrink-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 shadow-sm border border-red-200 dark:border-red-900/50">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold tracking-tight">Cancel Subscription</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                We're sorry to see you go. Please let us know why you are cancelling.
              </p>
            </div>

            <div className="p-5 overflow-y-auto min-h-0">
              <div className="space-y-2">
                {cancelReasons.map((r) => (
                  <label key={r} className={`flex items-center gap-3 cursor-pointer py-2.5 px-3.5 rounded-lg border transition-all duration-200 ${cancelReason === r ? 'border-red-500 bg-red-50/50 dark:bg-red-950/30 shadow-sm ring-1 ring-red-500/20' : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'}`}>
                    <div className="flex items-center h-5">
                      <input
                        type="radio"
                        name="cancel-reason"
                        value={r}
                        checked={cancelReason === r}
                        onChange={() => setCancelReason(r)}
                        disabled={isProcessing}
                        className="w-4 h-4 text-red-600 focus:ring-red-500 border-zinc-300 cursor-pointer"
                      />
                    </div>
                    <span className={`text-sm font-medium ${cancelReason === r ? 'text-red-900 dark:text-red-300' : 'text-foreground'}`}>{r}</span>
                  </label>
                ))}
                {cancelReason === 'Other' && (
                  <textarea
                    className="w-full border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 mt-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-zinc-50/50 dark:bg-zinc-900/50 transition-all shadow-inner"
                    placeholder="Tell us more..."
                    value={cancelReasonOther}
                    onChange={(e) => setCancelReasonOther(e.target.value)}
                    disabled={isProcessing}
                    rows={2}
                  />
                )}
              </div>
            </div>

            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/80 dark:bg-zinc-900/40 flex justify-end gap-3 shrink-0">
              <Button
                variant="outline"
                onClick={() => setShowCancelModal(false)}
                disabled={isProcessing}
                className="shadow-sm rounded-lg cursor-pointer"
              >
                Keep Subscription
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelSubmit}
                disabled={isProcessing || !cancelReason}
                className="shadow-sm gap-2 rounded-lg cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                    Processing...
                  </>
                ) : 'Confirm Cancel'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
