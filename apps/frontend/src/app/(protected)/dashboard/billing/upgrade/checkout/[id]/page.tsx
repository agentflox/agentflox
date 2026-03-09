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
import { ArrowLeft, Check, Package } from "lucide-react";
import CheckoutPaymentCard from "@/features/billing/components/checkout/CheckoutPaymentCard";
import { useSession } from "next-auth/react";

/**
 * Helper to render the package feature (only requests)
 */
function renderPackageFeature(pkg: any) {
  if (!pkg?.feature) return null;

  const requests = pkg.feature.requests ?? pkg.feature.request_count ?? null;
  if (!requests) return null;

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-lg">What’s included:</h4>
      <ul className="space-y-2">
        <li className="flex items-center gap-2">
          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
          <span>+{requests.toLocaleString()} requests</span>
        </li>
      </ul>
    </div>
  );
}

export default function CheckoutPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [error, setError] = useState<string | null>(null);

  const packages = trpc.billing.listPackages.useQuery({});

  const selectedPackage = useMemo(
    () => packages.data?.find((p: any) => p.id === id),
    [packages.data, id]
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
            Please sign in to purchase packages.
          </p>
        </div>
      </Shell>
    );
  }

  if (packages.isLoading) {
    return (
      <Shell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading package details...</p>
          </div>
        </div>
      </Shell>
    );
  }

  if (packages.error || !selectedPackage) {
    return (
      <Shell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-500 mb-4">
              Package not found or error loading package details.
            </p>
            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Packages
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

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
              Purchase {selectedPackage.displayName || selectedPackage.name}
            </h1>
            <p className="text-muted-foreground">
              Choose your preferred payment method to complete your purchase
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Package Details */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Package className="w-6 h-6 text-primary" />
                  {selectedPackage.displayName || selectedPackage.name}
                </CardTitle>
                <CardDescription className="mt-2 text-base">
                  {selectedPackage.description}
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-primary">
                  ${selectedPackage.price}
                </div>
                <Badge variant="secondary" className="mt-2">
                  One-time purchase
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>{renderPackageFeature(selectedPackage)}</CardContent>
        </Card>

        {/* Payment Options */}
        <div>
          <h2 className="text-2xl font-semibold mb-6">Choose Payment Method</h2>
          <CheckoutPaymentCard pkg={selectedPackage} onError={handleError} />
        </div>

        {/* Additional Info */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>• This is a one-time purchase with no recurring charges</p>
              <p>
                • Your credits will be available immediately after payment
                confirmation
              </p>
              <p>
                • All payments are processed securely through our trusted payment
                partners
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}


