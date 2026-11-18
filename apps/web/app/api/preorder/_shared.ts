import type { PreorderQuote } from "@onwei/core";

/** What the reserve checkout shows. Paise throughout. */
export function quoteView(quote: PreorderQuote) {
  const p = quote.pricing;
  return {
    tier: { label: quote.tier.label, percent: quote.tier.percent },
    product: {
      name: quote.product.name,
      slug: quote.product.slug,
      variantId: quote.product.variantId,
      variantLabel: quote.product.variantLabel,
      imageUrl: quote.product.imageUrl,
      unitPrice: quote.product.unitPrice,
    },
    quantity: quote.quantity,
    subtotal: p.subtotal,
    discounts: p.discounts
      .filter((d) => d.amount > 0)
      .map((d) => ({ kind: d.kind, label: d.label, amount: d.amount })),
    shippingFee: p.shippingFee,
    total: p.total,
    reserveTotal: quote.reserveTotal,
    balanceDue: quote.balanceDue,
    reservePerItem: quote.campaign.reserveAmount,
    gifts: quote.gifts.map((g) => ({
      reason: g.reason,
      itemLabel: g.itemLabel,
      quantity: g.quantity,
    })),
    codes: quote.codes.map((c) => {
      const rejected = p.rejected.find((r) => r.code === c.code);
      return {
        code: c.code,
        applied: !c.problem && !rejected && !c.isInsiderCode,
        problem: c.problem ?? rejected?.reason ?? null,
      };
    }),
    insider: quote.insider,
    insiderApplied: p.insiderApplied,
    preorderApplied: p.preorderApplied,
    expectedShipDate: quote.campaign.expectedShipDate?.toISOString() ?? null,
  };
}

export type PreorderQuoteView = ReturnType<typeof quoteView>;
