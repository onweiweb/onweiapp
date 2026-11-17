import { planCampaign } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";
import { audienceSchema } from "../_shared";

const bodySchema = z.object({
  audience: audienceSchema,
  templateName: z.string().trim().min(1).max(200),
  needsCode: z.boolean().default(false),
  allowRepeat: z.boolean().default(false),
});

// Counts who a send would reach and why others are left out. Counts only,
// no names or numbers.
export const POST = defineAdminRoute(
  { permission: "waitlist:manage", body: bodySchema },
  async ({ body }) => {
    const { ids, ...plan } = await planCampaign(body);
    return NextResponse.json({ ok: true, ...plan, willGet: ids.length });
  },
);
