"use client";
import Shell from "@/components/layout/Shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import Button from "@/components/ui/button";
import { useCallback, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSession } from "next-auth/react";

import { PageHeader } from "@/entities/shared/components/PageHeader";

export default function BillingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: currentPlan } = trpc.billing.currentPlan.useQuery();
  const payments = trpc.billing.payments.useQuery({ page: 1, pageSize: 10 });
  const purchases = trpc.billing.creditPurchases.useQuery({ page: 1, pageSize: 10 });
  const summary = trpc.billing.summary.useQuery();

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

  const planName = currentPlan?.plan?.displayName || currentPlan?.plan?.name || "Free";

  const handleUpgrade = useCallback(() => {
    router.push("/dashboard/billing/upgrade");
  }, [router]);

  const viewUsage = useCallback(() => {
    router.push("/dashboard/usage");
  }, [router]);

  const onGatewayRefresh = useCallback(async () => {
    payments.refetch();
    purchases.refetch();
  }, [payments, purchases]);

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
      // For now, default to stripe cancellation
      // In the future, you can determine the provider from the subscription data
      await fetch('/api/stripe/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: currentPlan?.subId, userId: session?.user?.id, reason: cancelReason }),
      });

      // Refetch data to update UI
      window.location.reload();

      // Reset modal state
      setShowCancelModal(false);
      setCancelReason('');
      setCancelReasonOther('');
    } catch (error) {
      console.error('Error cancelling subscription:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const quota = summary.data?.quota || summary.data;

  if (!session?.user?.id) {
    return (
      <Shell>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">
            Please sign in to purchase packages.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-8">
        <PageHeader
          title="Billing"
          description="Manage your subscription, packages, and payments."
          actions={<Button onClick={handleUpgrade}>Upgrade</Button>}
        />

        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Current plan</p>
              <p className="mt-1 text-xl font-medium">{planName}</p>
              {currentPlan?.currentPeriodEnd && (
                <p className="text-sm text-muted-foreground mt-1">Renews on {new Date(currentPlan.currentPeriodEnd as any).toLocaleDateString()}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Usage summary</p>
              <div className="mt-1 text-sm">
                <div>Projects: {(quota as any)?.projectsOwned ?? 0}/{(quota as any)?.maxProjects ?? 0}</div>
                <div>Teams: {(quota as any)?.teamsOwned ?? 0}/{(quota as any)?.maxTeams ?? 0}</div>
                <div>Storage: {(quota as any)?.storageUsedGB ?? 0}GB/{(quota as any)?.maxStorageGB ?? 0}GB</div>
              </div>
              <Button className="mt-3 h-8 px-3 text-sm" variant="outline" onClick={viewUsage}>View details</Button>
            </div>
            <div />
          </div>
        </Card>

        <Tabs defaultValue="subscription" className="mt-2">
          <TabsList>
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            {/* Packages moved to Upgrade page */}
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="subscription" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-medium">Your subscription</h3>
                  <p className="text-muted-foreground">Plan, status, and renewal.</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleUpgrade}>Change plan</Button>
                  {currentPlan?.plan?.name !== 'FREE' && currentPlan?.status === 'ACTIVE' && (
                    <Button
                      variant="destructive"
                      onClick={() => setShowCancelModal(true)}
                    >
                      Cancel subscription
                    </Button>
                  )}
                </div>
              </div>

              {currentPlan && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Plan Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Plan:</span>
                        <span>{currentPlan.plan?.displayName || currentPlan.plan?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span className="capitalize">{currentPlan.status?.toLowerCase()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Price:</span>
                        <span>${currentPlan.plan?.price}/{currentPlan.plan?.billingPeriod?.toLowerCase()}</span>
                      </div>
                      {currentPlan.currentPeriodStart && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Started:</span>
                          <span>{new Date(currentPlan.currentPeriodStart).toLocaleDateString()}</span>
                        </div>
                      )}
                      {currentPlan.currentPeriodEnd && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Next billing:</span>
                          <span>{new Date(currentPlan.currentPeriodEnd).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Features</h4>
                    <p className="text-sm text-muted-foreground">
                      Features are managed through your plan type.
                      Upgrade your plan to unlock more features.
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Packages tab removed; manage on Upgrade page */}

          <TabsContent value="history" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-xl font-medium">Payment history</h3>
              <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Gateway</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.data?.items?.map((pay: any) => (
                      <TableRow key={pay.id}>
                        <TableCell>{pay.currency} {pay.amount}</TableCell>
                        <TableCell>{pay.billingType}</TableCell>
                        <TableCell>{pay.paymentGateway || pay.paymentMethod}</TableCell>
                        <TableCell>{pay.status}</TableCell>
                        <TableCell>{new Date(pay.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white dark:bg-neutral-900 rounded-md p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Cancel subscription</h3>
            <p className="text-sm text-muted-foreground mb-4">
              We're sorry to see you go. Please tell us why you're cancelling:
            </p>
            <div className="space-y-3">
              {cancelReasons.map((r) => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="cancel-reason"
                    value={r}
                    checked={cancelReason === r}
                    onChange={() => setCancelReason(r)}
                    disabled={isProcessing}
                  />
                  <span>{r}</span>
                </label>
              ))}
              {cancelReason === 'Other' && (
                <textarea
                  className="w-full border rounded px-3 py-2 mt-2"
                  placeholder="Tell us more..."
                  value={cancelReasonOther}
                  onChange={(e) => setCancelReasonOther(e.target.value)}
                  disabled={isProcessing}
                  rows={3}
                />
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowCancelModal(false)}
                disabled={isProcessing}
              >
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelSubmit}
                disabled={isProcessing || !cancelReason}
              >
                {isProcessing ? 'Processing...' : 'Confirm cancel'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}


