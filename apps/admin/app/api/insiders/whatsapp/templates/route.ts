import { listGupshupTemplates, suggestCampaignFill } from "@onwei/core";
import { NextResponse } from "next/server";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";
import { GUPSHUP_LIST_ERRORS } from "../../../../whatsapp/_gupshup";
import { sendable } from "../_shared";

// Approved utility and marketing templates for Insiders > WhatsApp. Asked
// fresh each time, so a just-approved template shows. Never sends the key.
export const GET = defineAdminRoute(
  { permission: "waitlist:manage" },
  async () => {
    const result = await listGupshupTemplates();
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: GUPSHUP_LIST_ERRORS[result.reason] },
        { status: result.reason === "UNAVAILABLE" ? 502 : 400 },
      );
    }
    const templates = result.templates.filter(sendable).map((template) => ({
      ...template,
      suggestedFill: suggestCampaignFill(template),
    }));
    return NextResponse.json({ ok: true, templates });
  },
);
