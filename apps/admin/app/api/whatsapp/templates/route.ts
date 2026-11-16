import { saveWhatsAppTemplate } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../_lib/defineAdminRoute";

const bodySchema = z.object({
  purpose: z.enum(["SIGN_IN_CODE", "WAITLIST_JOINED", "INSIDER_CODE"]),
  gupshupTemplateId: z.string().trim().max(100),
  templateName: z.string().trim().max(200),
  language: z.string().trim().max(20),
  variables: z.array(z.string().trim().min(1).max(40)).max(10),
  headerType: z.enum(["NONE", "TEXT", "IMAGE"]),
  headerImageUrl: z.string().trim().max(1000).nullable(),
  previewText: z.string().max(2000),
  isActive: z.boolean(),
});

// Saves one WhatsApp message's template settings (admin WhatsApp page).
export const PUT = defineAdminRoute(
  {
    permission: "settings:manage",
    body: bodySchema,
    emptyBodyMessage: "Fill in the template details.",
  },
  async ({ staff, body }) => {
    const result = await saveWhatsAppTemplate(
      { ...body, headerImageUrl: body.headerImageUrl || null },
      staff.staffUserId,
    );
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true });
  },
);
