import { updateStoreSettings } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../_lib/defineAdminRoute";
import { triggerCatalogRevalidate } from "../../_lib/triggerCatalogRevalidate";

const money = (label: string) =>
  z
    .number({ error: `Enter ${label} in rupees.` })
    .min(0, `${label[0]!.toUpperCase()}${label.slice(1)} can't be below ₹0.`)
    .max(1_000_000);

const bodySchema = z.object({
  freeShippingThreshold: money("the free delivery amount"),
  deliveryFee: money("the delivery fee"),
  codEnabled: z.boolean(),
  codFee: money("the cash on delivery fee"),
  codMinOrder: money("the smallest cash on delivery order").nullable(),
  codMaxOrder: money("the largest cash on delivery order").nullable(),
  paymentHoldMinutes: z
    .number()
    .int("Use whole minutes.")
    .min(5, "Hold items for at least 5 minutes.")
    .max(60, "Hold items for at most 60 minutes."),
  returnWindowDays: z
    .number()
    .int("Use whole days.")
    .min(0, "Use 0 or more days.")
    .max(90, "Use at most 90 days."),
  returnsAllowRefund: z.boolean(),
  returnsAllowExchange: z.boolean(),
  returnSaleItems: z.boolean(),
  returnReasons: z
    .array(z.string().max(80))
    .min(1, "Keep at least one reason.")
    .max(12, "Use at most 12 reasons."),
  returnConditionNote: z.string().max(300),
  returnShippingNote: z.string().max(300),
});

export const PATCH = defineAdminRoute(
  { permission: "settings:manage", body: bodySchema },
  async ({ staff, body }) => {
    if (
      body.codMinOrder !== null &&
      body.codMaxOrder !== null &&
      body.codMinOrder > body.codMaxOrder
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The smallest cash on delivery order is bigger than the largest. Swap them.",
        },
        { status: 400 },
      );
    }
    if (
      !body.returnsAllowRefund &&
      !body.returnsAllowExchange &&
      body.returnWindowDays > 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Offer refunds, exchanges or both, or set the return window to 0 days to stop returns.",
        },
        { status: 400 },
      );
    }
    await updateStoreSettings(body, { staffUserId: staff.staffUserId });
    await triggerCatalogRevalidate("site-setting");
    return NextResponse.json({ ok: true });
  },
);
