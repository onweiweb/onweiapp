import {
  categoryFits,
  listGupshupTemplates,
  suggestTemplateValues,
  WHATSAPP_PURPOSES,
  type TemplatePurpose,
} from "@onwei/core";
import { NextResponse } from "next/server";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";
import { GUPSHUP_LIST_ERRORS } from "../../../../whatsapp/_gupshup";

// Templates for the "Pick from Gupshup" list in the WhatsApp edit popup.
// Asked fresh each time the popup opens, so a just-approved template shows.
// Only template details go to the browser, never the key.
export const GET = defineAdminRoute(
  { permission: "settings:manage" },
  async ({ request }) => {
    const asked = new URL(request.url).searchParams.get("purpose") ?? "";
    const purpose = (
      asked in WHATSAPP_PURPOSES ? asked : null
    ) as TemplatePurpose | null;
    const result = await listGupshupTemplates();
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: GUPSHUP_LIST_ERRORS[result.reason] },
        { status: result.reason === "UNAVAILABLE" ? 502 : 400 },
      );
    }
    // With a message type, each template says whether it fits and the value
    // order to fill in, so the browser needs no catalog code.
    const templates = result.templates.map((template) => ({
      ...template,
      fits: purpose ? categoryFits(purpose, template.category) : true,
      suggestedValues: purpose ? suggestTemplateValues(purpose, template) : [],
    }));
    return NextResponse.json({ ok: true, templates });
  },
);
