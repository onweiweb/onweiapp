import { prisma } from "@onwei/database";
import { toMinorUnits } from "../catalog/helpers";

/**
 * Admin numbers for the pre-order page: what's been reserved per product
 * size and colour, what stock there is, how many mystery boxes and Insider
 * gifts are owed, and each tier's count. Counts only, no customer details.
 */

export interface PreorderDemandRow {
  variantId: string;
  productId: string;
  name: string;
  variantLabel: string;
  /** Reserve paid (stock held), balance nudge not sent yet. */
  waiting: number;
  /** Balance nudge sent, not paid yet. */
  asked: number;
  /** Balance paid. */
  paid: number;
  /** Free stock right now. */
  stock: number;
  isFree: boolean;
}

export interface PreorderOverview {
  orders: number;
  units: number;
  /** Paise. */
  reserveCollected: number;
  /** Paise still to come from reserved orders. */
  balanceOutstanding: number;
  byTier: { label: string; orders: number; units: number }[];
  items: PreorderDemandRow[];
  gifts: PreorderDemandRow[];
  /** Reserved orders with the balance still to pay, oldest first. */
  unpaid: {
    orderId: string;
    orderNumber: string;
    tierLabel: string | null;
    /** Paise. */
    reserveTotal: number;
    balanceDue: number;
    paidAt: Date | null;
    nudgedAt: Date | null;
  }[];
}

export async function getPreorderOverview(
  campaignId: string,
): Promise<PreorderOverview> {
  const orders = await prisma.order.findMany({
    where: {
      preorderCampaignId: campaignId,
      kind: "PREORDER",
      deletedAt: null,
      status: { notIn: ["PENDING", "CANCELLED"] },
    },
    orderBy: [{ paidAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      orderNumber: true,
      paidAt: true,
      balanceNudgedAt: true,
      status: true,
      preorderTierLabel: true,
      reserveTotal: true,
      balanceDue: true,
      items: {
        select: {
          productVariantId: true,
          productName: true,
          variantLabel: true,
          quantity: true,
          isFree: true,
          productVariant: {
            select: {
              productId: true,
              inventory: {
                select: { quantityOnHand: true, quantityReserved: true },
              },
            },
          },
        },
      },
    },
  });

  const overview: PreorderOverview = {
    orders: orders.length,
    units: 0,
    reserveCollected: 0,
    balanceOutstanding: 0,
    byTier: [],
    items: [],
    gifts: [],
    unpaid: [],
  };
  const tiers = new Map<string, { orders: number; units: number }>();
  const rows = new Map<string, PreorderDemandRow>();

  for (const order of orders) {
    overview.reserveCollected += toMinorUnits(order.reserveTotal ?? 0);
    if (order.status === "RESERVED") {
      overview.balanceOutstanding += toMinorUnits(order.balanceDue ?? 0);
      overview.unpaid.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        tierLabel: order.preorderTierLabel,
        reserveTotal: toMinorUnits(order.reserveTotal ?? 0),
        balanceDue: toMinorUnits(order.balanceDue ?? 0),
        paidAt: order.paidAt,
        nudgedAt: order.balanceNudgedAt,
      });
    }
    const units = order.items
      .filter((i) => !i.isFree)
      .reduce((sum, i) => sum + i.quantity, 0);
    overview.units += units;
    const tier = tiers.get(order.preorderTierLabel ?? "") ?? {
      orders: 0,
      units: 0,
    };
    tier.orders++;
    tier.units += units;
    tiers.set(order.preorderTierLabel ?? "", tier);

    const stage =
      order.status !== "RESERVED"
        ? "paid"
        : order.balanceNudgedAt
          ? "asked"
          : "waiting";
    for (const item of order.items) {
      const key = `${item.isFree ? "g" : "p"}:${item.productVariantId}`;
      const row = rows.get(key) ?? {
        variantId: item.productVariantId,
        productId: item.productVariant.productId,
        name: item.productName,
        variantLabel: item.variantLabel,
        waiting: 0,
        asked: 0,
        paid: 0,
        stock: item.productVariant.inventory.reduce(
          (sum, r) => sum + Math.max(0, r.quantityOnHand - r.quantityReserved),
          0,
        ),
        isFree: item.isFree,
      };
      row[stage] += item.quantity;
      rows.set(key, row);
    }
  }

  overview.byTier = [...tiers].map(([label, t]) => ({
    label: label || "No tier",
    ...t,
  }));
  const all = [...rows.values()].sort((a, b) =>
    `${a.name} ${a.variantLabel}`.localeCompare(`${b.name} ${b.variantLabel}`),
  );
  overview.items = all.filter((r) => !r.isFree);
  overview.gifts = all.filter((r) => r.isFree);
  return overview;
}
