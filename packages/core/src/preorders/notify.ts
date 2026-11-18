import { prisma } from "@onwei/database";
import {
  renderPreorderBalanceEmail,
  renderPreorderCreditEmail,
  renderPreorderReservedEmail,
  rupeesText,
  sendEmailSafely,
  type PreorderEmailInput,
} from "@onwei/emails";
import { toMinorUnits } from "../catalog/helpers";
import { firstNameOf } from "../messaging/whatsapp/purposes";
import { sendWhatsApp } from "../messaging/whatsapp/send";

/**
 * Tells the customer about their pre-order by email and WhatsApp (when the
 * WhatsApp template for it is set up and switched on in admin). Never
 * throws: a failed message must not undo a payment or a cancellation.
 */

export type PreorderEvent =
  | { type: "RESERVED" }
  | { type: "BALANCE"; reminder: number }
  | { type: "CREDIT" };

const DATE = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

export async function notifyPreorder(
  orderId: string,
  event: PreorderEvent,
  options: { siteUrl?: string } = {},
): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        customer: { select: { id: true, name: true } },
        preorderCampaign: { select: { expectedShipDate: true } },
      },
    });
    if (!order || order.kind !== "PREORDER") return;
    const main = order.items.find((i) => !i.isFree);
    const name = order.customer.name;
    const product = main
      ? `${main.productName}${main.variantLabel ? ` (${main.variantLabel})` : ""}`
      : "Your pre-order";
    const input: PreorderEmailInput = {
      name,
      orderNumber: order.orderNumber,
      product,
      quantity: main?.quantity ?? 1,
      tierLabel: order.preorderTierLabel,
      gifts: order.items
        .filter((i) => i.isFree)
        .map(
          (i) =>
            `${i.freeReason ?? "Free"}: ${i.variantLabel || i.productName}`,
        ),
      total: toMinorUnits(order.total),
      paidNow: toMinorUnits(order.reserveTotal ?? 0),
      balance: toMinorUnits(order.balanceDue ?? 0),
      expectedShipDate: order.preorderCampaign?.expectedShipDate
        ? DATE.format(order.preorderCampaign.expectedShipDate)
        : null,
      siteUrl: options.siteUrl,
    };

    if (event.type === "RESERVED") {
      if (order.contactEmail)
        await sendEmailSafely(
          order.contactEmail,
          renderPreorderReservedEmail(input),
        );
      if (order.contactPhone)
        await sendWhatsApp({
          purpose: "PREORDER_RESERVED",
          phone: order.contactPhone,
          customerId: order.customer.id,
          values: {
            firstName: firstNameOf(name),
            orderNumber: order.orderNumber,
            product: `${product} x ${input.quantity}`,
            paidNow: rupeesText(input.paidNow),
            balance: rupeesText(input.balance),
          },
        });
      return;
    }

    if (event.type === "BALANCE") {
      if (order.contactEmail)
        await sendEmailSafely(
          order.contactEmail,
          renderPreorderBalanceEmail({ ...input, reminder: event.reminder }),
        );
      if (order.contactPhone)
        await sendWhatsApp({
          purpose: "PREORDER_BALANCE",
          phone: order.contactPhone,
          customerId: order.customer.id,
          values: {
            firstName: firstNameOf(name),
            orderNumber: order.orderNumber,
            balance: rupeesText(input.balance),
            orderPath: order.orderNumber,
          },
        });
      return;
    }

    if (!order.creditCouponId) return;
    const credit = await prisma.coupon.findUnique({
      where: { id: order.creditCouponId },
      select: { code: true, endsAt: true },
    });
    if (!credit) return;
    const validUntil = credit.endsAt
      ? DATE.format(credit.endsAt)
      : "no end date";
    const amount = toMinorUnits(order.reserveTotal ?? 0);
    if (order.contactEmail)
      await sendEmailSafely(
        order.contactEmail,
        renderPreorderCreditEmail({
          name,
          orderNumber: order.orderNumber,
          amount,
          creditCode: credit.code.toUpperCase(),
          validUntil,
          siteUrl: options.siteUrl,
        }),
      );
    if (order.contactPhone)
      await sendWhatsApp({
        purpose: "PREORDER_CREDIT",
        phone: order.contactPhone,
        customerId: order.customer.id,
        values: {
          firstName: firstNameOf(name),
          amount: rupeesText(amount),
          creditCode: credit.code.toUpperCase(),
          validUntil,
        },
      });
  } catch (error) {
    console.error("[preorders] notify failed", error);
  }
}
