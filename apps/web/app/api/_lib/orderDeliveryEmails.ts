import { getOrderDeliveryEmail, type OrderEvent } from "@onwei/core";
import {
  renderOrderDeliveredEmail,
  renderOrderShippedEmail,
  sendEmailSafely,
} from "@onwei/emails";

/**
 * "On its way" and "delivered" emails for orders iThink's webhook just
 * moved. Call it from a background task (`after`); a failed email never undoes
 * the update. Admin's buttons use the same core lookup
 * (apps/admin/app/api/_lib/orderDeliveryEmails.ts).
 */
export async function sendOrderDeliveryEmails(
  events: OrderEvent[],
): Promise<void> {
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
}
