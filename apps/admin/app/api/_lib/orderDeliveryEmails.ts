import { getOrderDeliveryEmail, type OrderEvent } from "@onwei/core";
import {
  renderOrderDeliveredEmail,
  renderOrderShippedEmail,
  sendEmailSafely,
} from "@onwei/emails";
import { after } from "next/server";

/**
 * "On its way" and "delivered" emails for orders a courier update just
 * moved. Sent after the response; a failed email never undoes the update.
 * The storefront has the same wrapper for iThink's webhook; the order
 * details come from core's getOrderDeliveryEmail.
 */
export function sendOrderDeliveryEmails(events: OrderEvent[]): void {
  if (events.length === 0) return;
  const task = async () => {
    for (const event of events) {
      try {
        const email = await getOrderDeliveryEmail(event.orderId);
        if (!email) continue;
        await sendEmailSafely(
          email.to,
          event.type === "SHIPPED"
            ? renderOrderShippedEmail(email.input)
            : renderOrderDeliveredEmail(email.input),
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
