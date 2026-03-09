import React from "react";
import { PayPalButtons, PayPalButtonsComponentProps } from "@paypal/react-paypal-js";
import { PaypalProvider } from "@/components/providers/PaypalProvider";

interface PaypalButtonComponentProps {
  event: { type: string };
  createAction: (data: Record<string, unknown>, actions: any) => Promise<string>;
  onApprove: (data: Record<string, unknown>, actions: any) => Promise<void>;
  onError: (err: Record<string, unknown>) => void;
  style?: PayPalButtonsComponentProps["style"];
  isSubscription?: boolean;
}

const PaypalButtonComponent: React.FC<PaypalButtonComponentProps> = ({
  isSubscription = false,
  createAction,
  onApprove,
  onError,
  style,
}) => {
  return (
    <PayPalButtons
      {...(isSubscription
        ? {
            createSubscription: createAction,
          }
        : {
            createOrder: createAction,
          })}
      style={style || { layout: "vertical" }}
      onApprove={onApprove}
      onError={onError}
    />
  );
};

const WrappedPaypalButtonComponent: React.FC<Omit<PaypalButtonComponentProps, "isSubscription">> = (
  props
) => {
  const isSubscription = props.event.type === "BILLING.PAYMENT.SUBSCRIPTION";

  return (
    <PaypalProvider isSubscription={isSubscription}>
      <PaypalButtonComponent {...props} isSubscription={isSubscription} />
    </PaypalProvider>
  );
};

export default WrappedPaypalButtonComponent;
