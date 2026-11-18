import {
  listGupshupTemplates,
  suggestTemplateValues,
  templateFitFor,
  WHATSAPP_PURPOSES,
  type TemplatePurpose,
} from "@onwei/core";
import { NextResponse } from "next/server";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";
import { GUPSHUP_LIST_ERRORS } from "../../../../whatsapp/_gupshup";

// Templates for the "Choose template" popup on the WhatsApp page. Only
// approved templates that fit the message are listed; the rest are counted so
// the popup can say how many are still waiting. Asked fresh each time the
// popup opens, so a just-approved template shows. Never sends the key.
export const GET = defineAdminRoute(
  { permission: "settings:manage" },
  async ({ request }) => {
    const asked = new URL(request.url).searchParams.get("purpose") ?? "";
    if (!(asked in WHATSAPP_PURPOSES)) {
      return NextResponse.json(
        { ok: false, error: "Say which message the template is for." },
        { status: 400 },
      );
    }
    const purpose = asked as TemplatePurpose;
    const result = await listGupshupTemplates();
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: GUPSHUP_LIST_ERRORS[result.reason] },
        { status: result.reason === "UNAVAILABLE" ? 502 : 400 },
      );
    }
    const templates = result.templates
      .filter((t) => templateFitFor(purpose, t) === "OK")
      .map((t) => ({
        ...t,
        suggestedValues: suggestTemplateValues(purpose, t),
      }));
    const waiting = result.templates.filter(
      (t) =>
        t.status === "PENDING" &&
        templateFitFor(purpose, { ...t, status: "APPROVED" }) === "OK",
    ).length;
    return NextResponse.json({ ok: true, templates, waiting });
  },
);
