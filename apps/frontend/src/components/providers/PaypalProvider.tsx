"use client";

import * as React from "react";
import {
  PayPalScriptProvider,
  ReactPayPalScriptOptions,
} from "@paypal/react-paypal-js";

interface PaypalProviderProps {
  children: React.ReactNode;
  isSubscription?: boolean;
}

export const PaypalProvider: React.FC<PaypalProviderProps> = ({
  children,
  isSubscription = true,
}) => {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "";
  const paypalOptions: ReactPayPalScriptOptions = React.useMemo(
    () => ({
      clientId,
      intent: isSubscription ? "subscription" : "capture",
      vault: isSubscription,
      components: "buttons",
    }),
    [clientId, isSubscription]
  );

  if (!clientId) {
    console.error("Missing NEXT_PUBLIC_PAYPAL_CLIENT_ID environment variable.");
  }

  return <PayPalScriptProvider options={paypalOptions}>{children}</PayPalScriptProvider>;
};
