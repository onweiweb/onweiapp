import {
  getOrderDetailById,
  notifyPreorder,
  sendOrderToIthink,
  type PreorderEvent,
} from "@onwei/core";
import {
  renderNewOrderAlertEmail,
  renderOrderConfirmationEmail,
  sendEmailSafely,
  type OrderEmailInput,
} from "@onwei/emails";
import { after } from "next/server";

/**
 * Sends the order confirmation (and the staff alert when ORDER_ALERT_EMAIL is
 * set) after the response has gone out. Called only when an order is newly
 * confirmed, so each order gets one confirmation.
 */
export function sendOrderEmailsInBackground(orderId: string): void {
  const task = async () => {
    try {
      const order = await getOrderDetailById(orderId);
      if (!order) return;
      const input: OrderEmailInput = {
        name: order.customerName,
        orderNumber: order.orderNumber,
        paymentMethod: order.paymentMethod,
        items: order.items.map((i) => ({
          name: i.productName,
          variant: i.variantLabel,
          quantity: i.quantity,
          total: i.unitPrice * i.quantity,
        })),
        subtotal: order.subtotal,
        discounts: order.discounts,
        shippingFee: order.shippingFee,
        codFee: order.codFee,
        total: order.total,
        address: order.address,
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
      };
      if (order.contactEmail)
        await sendEmailSafely(
          order.contactEmail,
          renderOrderConfirmationEmail(input),
        );
      const alertTo = process.env.ORDER_ALERT_EMAIL;
      if (alertTo) {
        const adminUrl = `${process.env.ADMIN_APP_URL ?? "https://admin.onwei.in"}/orders`;
        await sendEmailSafely(
          alertTo,
          renderNewOrderAlertEmail({ ...input, adminUrl }),
        );
      }
    } catch (error) {
      console.error("[email] order email failed", error);
    }
  };
  try {
    after(task);
  } catch {
    void task();
  }
}

/**
 * A newly confirmed order: the confirmation email (and staff alert), and the
 * order goes to iThink so it shows up in the portal for a label. A send that
 * fails stays on the order in admin with a "Send to iThink" button.
 */
export function afterOrderConfirmed(orderId: string): void {
  sendOrderEmailsInBackground(orderId);
  const task = async () => {
    try {
      const result = await sendOrderToIthink(orderId, null);
      if (!result.ok && result.reason !== "NOT_SET_UP") {
        console.warn("[ithink] order not sent", orderId, result.reason);
      } else if (result.ok && result.outcome !== "BOOKED") {
        console.warn("[ithink] order not booked", orderId, result.outcome);
      }
    } catch (error) {
      console.error("[ithink] order send failed", orderId, error);
    }
  };
  try {
    after(task);
  } catch {
    void task();
  }
}

/** Pre-order messages (reserved, balance, credit), after the response. */
export function sendPreorderMessageInBackground(
  orderId: string,
  event: PreorderEvent,
): void {
  const task = () =>
    notifyPreorder(orderId, event, {
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    });
  try {
    after(task);
  } catch {
    void task();
  }
}
