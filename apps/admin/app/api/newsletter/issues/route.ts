import { saveNewsletterDraft } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../_lib/defineAdminRoute";

const bodySchema = z.object({
  id: z.string().min(1).max(64).nullable(),
  subject: z.string().max(150, "Keep the subject under 150 characters."),
  preheader: z.string().max(200, "Keep the preview line under 200 characters."),
  bodyHtml: z.string().max(100_000, "That's too long for one email."),
  includeUnconfirmed: z.boolean(),
});

/** Save a newsletter draft (new or existing). */
export const POST = defineAdminRoute<typeof bodySchema>(
  { permission: "newsletter:manage", body: bodySchema },
  async ({ staff, body }) => {
    const { id, ...input } = body;
    const result = await saveNewsletterDraft(id, input, {
      staffUserId: staff.staffUserId,
    });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.message },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true, id: result.id });
  },
);
