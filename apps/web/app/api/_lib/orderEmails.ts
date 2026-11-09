import { getOrderDetailById } from "@onwei/core";
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
