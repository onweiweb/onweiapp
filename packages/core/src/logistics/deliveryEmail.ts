import { getOrderDetailById, type OrderDetail } from "../commerce/account";
import { getStoreSettings } from "../commerce/storeSettings";

/**
 * What the "on its way" and "delivered" emails need for one order, in the
 * shape `renderOrderShippedEmail` / `renderOrderDeliveredEmail` take. Shared
 * by admin (the update buttons) and the storefront (iThink's webhook).
 * Null when the order is gone or has no email address.
 */
export async function getOrderDeliveryEmail(orderId: string): Promise<{
  to: string;
  input: {
    name: string | null;
    orderNumber: string;
    paymentMethod: OrderDetail["paymentMethod"];
    amountDue: number;
    courierName: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    returnWindowDays: number;
    siteUrl: string | undefined;
  };
} | null> {
  const order = await getOrderDetailById(orderId);
  if (!order?.contactEmail) return null;
  const settings = await getStoreSettings();
  return {
    to: order.contactEmail,
    input: {
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
    },
  };
}
