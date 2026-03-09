"use client";

import Shell from "@/components/layout/Shell";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { billingService } from "@/services/billing.service";

interface StatusData {
  exists: boolean;
  shouldShowModal: boolean;
  status: string;
  method: string;
  id: string;
}

export default function BillingStatusPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const method = searchParams.get('method');
  const subId = searchParams.get('subId');
  const orderId = searchParams.get('orderId');
  const status = searchParams.get('status');

  useEffect(() => {
    const checkStatus = async () => {
      if (!method || (!subId && !orderId) || !status) {
        setError('Missing required parameters');
        setLoading(false);
        return;
      }

      try {
        const response = await billingService.status.get({
          method,
          status,
          ...(subId ? { subId } : {}),
          ...(orderId ? { orderId } : {})
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to check status');
        }

        setStatusData(data);
      } catch (err) {
        console.error('Error checking status:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, [method, subId, orderId, status]);

  const handleDismissModal = async () => {
    if (statusData) {
      try {
        await billingApi.status.update({
          type: statusData.method === 'subscription' ? 'subscription' : 'order',
          id: statusData.id,
          metadata: { modalDismissed: true }
        });
      } catch (err) {
        console.error('Error dismissing modal:', err);
      }
    }

    router.push('/dashboard/billing');
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-16 h-16 text-green-500" />;
      case 'error':
        return <XCircle className="w-16 h-16 text-red-500" />;
      default:
        return <AlertCircle className="w-16 h-16 text-yellow-500" />;
    }
  };

  const getStatusTitle = () => {
    if (method === 'subscription') {
      switch (status) {
        case 'success':
          return 'Subscription Successful!';
        case 'error':
          return 'Subscription Failed';
        default:
          return 'Subscription Status';
      }
    } else {
      switch (status) {
        case 'success':
          return 'Purchase Successful!';
        case 'error':
          return 'Purchase Failed';
        default:
          return 'Purchase Status';
      }
    }
  };

  const getStatusMessage = () => {
    if (method === 'subscription') {
      switch (status) {
        case 'success':
          return 'Your subscription has been activated successfully. You can now enjoy all the features of your plan.';
        case 'error':
          return 'There was an issue processing your subscription. Please try again or contact support.';
        default:
          return 'Checking subscription status...';
      }
    } else {
      switch (status) {
        case 'success':
          return 'Your purchase has been completed successfully. Your credits have been added to your account.';
        case 'error':
          return 'There was an issue processing your purchase. Please try again or contact support.';
        default:
          return 'Checking purchase status...';
      }
    }
  };

  if (!session?.user?.id) {
    return (
      <Shell>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Please sign in to view billing status.</p>
        </div>
      </Shell>
    );
  }

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Checking payment status...</p>
          </div>
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <CardTitle className="text-xl text-red-600">Error</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => router.push('/dashboard/billing')} variant="outline">
                Back to Billing
              </Button>
            </CardContent>
          </Card>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            {getStatusIcon()}
            <CardTitle className="text-2xl">{getStatusTitle()}</CardTitle>
            <CardDescription className="text-base">
              {getStatusMessage()}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {statusData && (
              <div className="text-sm text-muted-foreground">
                <p>Transaction ID: {statusData.id}</p>
                <p>Method: {statusData.method}</p>
                <p>Status: {statusData.status}</p>
              </div>
            )}
            <div className="space-y-2">
              <Button
                onClick={handleDismissModal}
                className="w-full"
                variant={status === 'success' ? 'primary' : 'outline'}
              >
                {status === 'success' ? 'Continue to Dashboard' : 'Try Again'}
              </Button>
              <Button
                onClick={() => router.push('/dashboard/billing')}
                variant="ghost"
                className="w-full"
              >
                Back to Billing
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
