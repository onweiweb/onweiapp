import { getCustomerOrder, type OrderDetail } from "@onwei/core";
import { redirect } from "next/navigation";
import { getSession } from "../../../lib/session";

/** The signed-in customer's order for a result page, or back to the account. */
export async function loadResultOrder(
  searchParams: Promise<{ order?: string }>,
): Promise<{ order: OrderDetail; customerId: string }> {
  const session = await getSession();
  if (!session) redirect("/login?next=/account");
  const { order: orderNumber } = await searchParams;
  const order = orderNumber
    ? await getCustomerOrder(session.customerId, orderNumber)
    : null;
  if (!order) redirect("/account");
  return { order, customerId: session.customerId };
}
