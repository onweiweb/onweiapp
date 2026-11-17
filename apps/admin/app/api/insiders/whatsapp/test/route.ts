import {
  checkCampaignFill,
  getSiteSetting,
  sendCampaignTest,
  validatePhone,
} from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";
import { fillSchema, headerImageSchema, loadTemplate } from "../_shared";

const bodySchema = z.object({
  templateId: z.string().trim().min(1).max(100),
  fill: fillSchema,
  headerImageUrl: headerImageSchema,
  phone: z.string().trim().min(1).max(20),
});

// Sends the picked template with sample values (Priya, WEI4821) to a number
// staff type in, so they can see it on a phone before the real send.
export const POST = defineAdminRoute(
  {
    permission: "waitlist:manage",
    body: bodySchema,
    emptyBodyMessage: "Type the phone number to send the test to.",
  },
  async ({ body }) => {
    const setting = await getSiteSetting();
    const phone = validatePhone(body.phone, {
      allowInternational: setting.allowInternationalPhone,
    });
    if (!phone.valid || !phone.e164) {
      return NextResponse.json(
        { ok: false, error: "That phone number doesn't look right." },
        { status: 400 },
      );
    }
    const loaded = await loadTemplate(body.templateId);
    if (!loaded.ok) return loaded.response;
    const problem = checkCampaignFill(
      loaded.template,
      body.fill,
      body.headerImageUrl,
    );
    if (problem) {
      return NextResponse.json({ ok: false, error: problem }, { status: 400 });
    }
    const result = await sendCampaignTest({
      template: loaded.template,
      fill: body.fill,
      headerImageUrl:
        loaded.template.header === "IMAGE" ? body.headerImageUrl : null,
      phone: phone.e164,
    });
    if (result.status === "sent") return NextResponse.json({ ok: true });
    const error =
      result.status === "skipped"
        ? "WhatsApp isn't connected yet. Ask the developer to add the Gupshup settings."
        : `Gupshup didn't send it. ${result.reason}`;
    return NextResponse.json({ ok: false, error }, { status: 400 });
  },
);
