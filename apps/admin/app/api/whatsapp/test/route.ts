import {
  WHATSAPP_PURPOSES,
  getSiteSetting,
  sendWhatsApp,
  validatePhone,
} from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../_lib/defineAdminRoute";

const bodySchema = z.object({
  purpose: z.enum(["SIGN_IN_CODE", "WAITLIST_JOINED", "INSIDER_CODE"]),
  phone: z.string().trim().min(1).max(20),
});

const SKIP_MESSAGES: Record<string, string> = {
  NOT_CONFIGURED:
    "WhatsApp isn't connected yet. Ask the developer to add the Gupshup settings.",
  TEMPLATE_OFF:
    "Save the template ID first (and upload the image if it has one).",
  OPTED_OUT: "That number replied STOP, so it can't get this message.",
  MISSING_VALUE: "The message is missing a value to fill in.",
};

// Sends one message with sample values to a number staff type in, so a
// template can be checked before it is switched on. Works while it is off.
export const POST = defineAdminRoute(
  {
    permission: "settings:manage",
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
    const values = Object.fromEntries(
      WHATSAPP_PURPOSES[body.purpose].variables.map((v) => [v.key, v.sample]),
    );
    const result = await sendWhatsApp(
      { purpose: body.purpose, phone: phone.e164, values },
      { force: true },
    );
    if (result.status === "sent") return NextResponse.json({ ok: true });
    const error =
      result.status === "skipped"
        ? SKIP_MESSAGES[result.reason]
        : `Gupshup didn't send it. ${result.reason}`;
    return NextResponse.json({ ok: false, error }, { status: 400 });
  },
);
