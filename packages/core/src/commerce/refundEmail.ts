import { prisma } from "@onwei/database";
import { renderRefundEmail, sendEmailSafely } from "@onwei/emails";
import { toMinorUnits } from "../catalog/helpers";

/**
 * Emails the customer that money is on its way back: once per refund row,
 * right after staff make it (a return, a cancelled order or pre-order, or a
 * refund from the order page). Never throws: a failed email must not undo a
 * refund. Automatic refunds of duplicate payments don't email (staff are
 * flagged instead).
 */
export async function sendRefundEmail(refundId: string): Promise<void> {
  try {
    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        order: {
          select: {
            orderNumber: true,
            contactEmail: true,
            status: true,
            kind: true,
            customer: { select: { name: true } },
          },
        },
      },
    });
    const to = refund?.order.contactEmail;
    if (!refund || !to) return;
    const payoutUpi = refund.returnRequestId
      ? ((
          await prisma.returnRequest.findUnique({
            where: { id: refund.returnRequestId },
            select: { payoutUpi: true },
          })
        )?.payoutUpi ?? null)
      : null;
    const { order } = refund;
    const reason = refund.returnRequestId
      ? "your return"
      : order.status === "CANCELLED"
        ? order.kind === "PREORDER"
          ? "your cancelled pre-order"
          : "your cancelled order"
        : "your order";
    await sendEmailSafely(
      to,
      renderRefundEmail({
        name: order.customer?.name ?? null,
        orderNumber: order.orderNumber,
        amount: toMinorUnits(refund.amount),
        method: refund.method === "RAZORPAY" ? "ONLINE" : "UPI",
        upiId: payoutUpi,
        reason,
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? process.env.WEB_APP_URL,
      }),
    );
  } catch (error) {
    console.error("[email] refund email failed", refundId, error);
  }
}
