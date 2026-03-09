import { PayPalButtonsComponentProps } from "@paypal/react-paypal-js";
import { PaymentGateway } from '@agentflox/database/src/generated/prisma/client';
import { billingService } from '@/services/billing.service';

interface IBillingState {
  loading: boolean;
  error: string | null;
  data: any | null;
}

export class PaypalService {
  private userId: string;

  private static state: IBillingState = {
    loading: false,
    error: null,
    data: null
  };

  private static setState(newState: Partial<IBillingState>) {
    this.state = { ...this.state, ...newState };
  }

  constructor(userId: string) {
    this.userId = userId;
  }

  createSubscription: PayPalButtonsComponentProps["createSubscription"] = async (data, actions) => {
    return actions.subscription.create(data as any);
  }

  onApproveSubscription: PayPalButtonsComponentProps["onApprove"] = async (
    data,
    actions
  ) => {
    try {
      PaypalService.setState({ loading: true, error: null });
      const subscriptionDetails = (await actions.subscription?.get()) as any;
      if (!subscriptionDetails) {
        throw new Error('Failed to get subscription details');
      }
      const userId = this.userId;
      if (!userId) {
        throw new Error('User ID is required');
      }

      const response = await billingService.paypal.createSubscription({
        userId,
        subscriptionDetails,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to activate subscription');
      }
      PaypalService.setState({
        loading: false,
        data: result.data
      });

      // Redirect to billing status page with subscription details
      const subscriptionId = subscriptionDetails.id || data.subscriptionID;
      if (subscriptionId) {
        window.location.href = `/dashboard/billing/status?method=subscription&subId=${subscriptionId}&status=success`;
      } else {
        alert('Successfully subscribed!');
        window.location.reload();
      }
    } catch (error) {
      console.error('Subscription approval error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      PaypalService.setState({ loading: false, error: errorMessage });
      alert('Error processing subscription. Please try again.');
    }
  }

  onCreateOrder = async (
    _data: unknown,
    _actions?: any
  ) => {
    const customData = _data as {
      event: any;
      userId: string;
      pkg: any;
    };
    const { event, userId, pkg } = customData;
    try {
      const response = await billingService.paypal.createOrder({
        userId,
        packageId: pkg.id,
        event,
      });

      const orderData = await response.json();

      if (!orderData.id) {
        const detail = orderData?.details?.[0];
        throw new Error(
          detail
            ? `${detail.issue} ${detail.description} (${orderData.debug_id})`
            : "Unexpected error occurred, please try again."
        );
      }
      return orderData.id;
    } catch (error) {
      console.error("Order creation error:", error);
      throw error;
    }
  };

  onApproveOrder: PayPalButtonsComponentProps["onApprove"] = async (data, actions) => {
    try {
      const response = await billingService.paypal.capturePayment({
        orderId: data.orderID,
        userId: this.userId
      });

      const captureData = await response.json();
      if (!captureData?.id) {
        throw new Error("Failed to capture payment or invalid response from PayPal.");
      }

      // Redirect to billing status page with order details
      const orderId = data.orderID || captureData.id;
      if (orderId) {
        window.location.href = `/dashboard/billing/status?method=checkout&orderId=${orderId}&status=success`;
      }

      return captureData;
    } catch (error) {
      console.error("Order approval error:", error);
      alert("Error processing payment. Please try again.");
    }
  }

  static onCancelSubscription = async (subscriptionId: string) => {
    try {
      const response = await billingService.paypal.cancelSubscription({
        subscriptionId
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }
      alert("Subscription cancelled successfully.");
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      alert("Error cancelling subscription. Please try again or contact support.");
    }
  }

  static onCurrencyChange = (
    { target: { value } }: { target: { value: string } },
    setCurrency: (value: string) => void,
    dispatch: React.Dispatch<any>,
    options: any
  ) => {
    setCurrency(value);
    dispatch({
      type: "resetOptions",
      value: {
        ...options,
        currency: value,
      },
    });
  }

  public static getState(): IBillingState {
    return this.state;
  }
}
