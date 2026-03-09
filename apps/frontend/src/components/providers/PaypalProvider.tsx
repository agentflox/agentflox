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
  const paypalOptions: ReactPayPalScriptOptions = React.useMemo(
    () => ({
      clientId: process.env.PAYPAL_CLIENT_ID!,
      intent: isSubscription ? "subscription" : "capture",
      vault: isSubscription,
      components: "buttons",
    }),
    [isSubscription]
  );

  if (!process.env.PAYPAL_CLIENT_ID) {
    console.error("Missing NEXT_PUBLIC_PAYPAL_CLIENT_ID environment variable.");
  }

  return <PayPalScriptProvider options={paypalOptions}>{children}</PayPalScriptProvider>;
};
