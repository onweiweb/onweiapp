import {
  WHATSAPP_PURPOSES,
  listWhatsAppTemplates,
  saveWhatsAppTemplate,
  type TemplatePurpose,
} from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../_lib/defineAdminRoute";
import { unusableTemplateReason } from "./_usable";

const purposeSchema = z.enum(
  Object.keys(WHATSAPP_PURPOSES) as [TemplatePurpose, ...TemplatePurpose[]],
);

const bodySchema = z.object({
  purpose: purposeSchema,
  gupshupTemplateId: z.string().trim().max(100),
  templateName: z.string().trim().max(200),
  language: z.string().trim().max(20),
  variables: z.array(z.string().trim().min(1).max(40)).max(10),
  headerType: z.enum(["NONE", "TEXT", "IMAGE"]),
  headerImageUrl: z.string().trim().max(1000).nullable(),
  previewText: z.string().max(2000),
  isActive: z.boolean(),
});

async function savedFor(purpose: TemplatePurpose) {
  const all = await listWhatsAppTemplates();
  return all.find((t) => t.purpose === purpose)!;
}

function refused(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

// Saves one WhatsApp message's template settings (admin WhatsApp page).
export const PUT = defineAdminRoute(
  {
    permission: "settings:manage",
    body: bodySchema,
    emptyBodyMessage: "Fill in the template details.",
  },
  async ({ staff, body }) => {
    const saved = await savedFor(body.purpose);
    const reason = await unusableTemplateReason({
      purpose: body.purpose,
      gupshupTemplateId: body.gupshupTemplateId,
      savedTemplateId: saved.gupshupTemplateId,
      isActive: body.isActive,
    });
    if (reason) return refused(reason);
    const result = await saveWhatsAppTemplate(
      { ...body, headerImageUrl: body.headerImageUrl || null },
      staff.staffUserId,
    );
    if (!result.ok) return refused(result.error);
    return NextResponse.json({ ok: true });
  },
);

// Switches one message on or off from its row, keeping everything else.
export const PATCH = defineAdminRoute(
  {
    permission: "settings:manage",
    body: z.object({ purpose: purposeSchema, isActive: z.boolean() }),
    emptyBodyMessage: "Say which message to switch.",
  },
  async ({ staff, body }) => {
    const saved = await savedFor(body.purpose);
    if (body.isActive) {
      const reason = await unusableTemplateReason({
        purpose: body.purpose,
        gupshupTemplateId: saved.gupshupTemplateId,
        savedTemplateId: saved.gupshupTemplateId,
        isActive: true,
      });
      if (reason) return refused(reason);
    }
    const result = await saveWhatsAppTemplate(
      {
        purpose: saved.purpose,
        gupshupTemplateId: saved.gupshupTemplateId,
        templateName: saved.templateName,
        language: saved.language,
        variables: saved.variables,
        headerType: saved.headerType,
        headerImageUrl: saved.headerImageUrl,
        previewText: saved.previewText,
        isActive: body.isActive,
      },
      staff.staffUserId,
    );
    if (!result.ok) return refused(result.error);
    return NextResponse.json({ ok: true });
  },
);
