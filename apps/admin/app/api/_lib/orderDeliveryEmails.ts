import {
  getOrderDetailById,
  getStoreSettings,
  type OrderEvent,
} from "@onwei/core";
import {
  renderOrderDeliveredEmail,
  renderOrderShippedEmail,
  sendEmailSafely,
} from "@onwei/emails";
import { after } from "next/server";

/**
 * "On its way" and "delivered" emails for orders a courier update just
 * moved. Sent after the response; a failed email never undoes the update.
 */
export function sendOrderDeliveryEmails(events: OrderEvent[]): void {
  if (events.length === 0) return;
  const task = async () => {
    const settings = await getStoreSettings();
    for (const event of events) {
      try {
        const order = await getOrderDetailById(event.orderId);
        if (!order?.contactEmail) continue;
        const input = {
          name: order.customerName ?? order.address?.fullName ?? null,
          orderNumber: order.orderNumber,
          paymentMethod: order.paymentMethod,
          amountDue:
            order.paymentMethod === "COD" &&
            order.paymentLabel !== "Cash on delivery (paid)"
              ? order.total
              : 0,
          courierName: order.courierName,
          trackingNumber: order.trackingNumber,
          trackingUrl: order.trackingUrl,
          returnWindowDays: settings.returnWindowDays,
          siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? process.env.WEB_APP_URL,
        };
        await sendEmailSafely(
          order.contactEmail,
          event.type === "SHIPPED"
            ? renderOrderShippedEmail(input)
            : renderOrderDeliveredEmail(input),
        );
      } catch (error) {
        console.error("[email] delivery email failed", event.orderId, error);
      }
    }
  };
  try {
    after(task);
  } catch {
    void task();
  }
}
