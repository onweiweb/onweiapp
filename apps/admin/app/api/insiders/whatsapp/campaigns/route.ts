import {
  checkCampaignFill,
  createCampaign,
  planCampaign,
  readGupshupConfig,
} from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";
import {
  audienceSchema,
  fillSchema,
  headerImageSchema,
  loadTemplate,
} from "../_shared";

const bodySchema = z.object({
  templateId: z.string().trim().min(1).max(100),
  fill: fillSchema,
  headerImageUrl: headerImageSchema,
  audience: audienceSchema,
  allowRepeat: z.boolean().default(false),
});

// Starts a send: checks the template and blanks, works out who gets it, and
// saves the send. Returns the member ids so the page can send them in small
// batches (campaigns/[id]/send) and show progress.
export const POST = defineAdminRoute(
  { permission: "waitlist:manage", body: bodySchema },
  async ({ staff, body }) => {
    if (!readGupshupConfig()) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "WhatsApp isn't connected yet. Ask the developer to add the Gupshup settings.",
        },
        { status: 400 },
      );
    }
    const needsLink = body.fill.some(
      (s) => s.kind === "addressLink" || s.kind === "addressToken",
    );
    if (needsLink && !process.env.INSIDER_LINK_SECRET) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Address links can't be made yet: INSIDER_LINK_SECRET is missing. Ask the developer to add it.",
        },
        { status: 500 },
      );
    }
    const loaded = await loadTemplate(body.templateId);
    if (!loaded.ok) return loaded.response;
    const { template } = loaded;
    const headerImageUrl =
      template.header === "IMAGE" ? body.headerImageUrl : null;
    const problem = checkCampaignFill(template, body.fill, headerImageUrl);
    if (problem) {
      return NextResponse.json({ ok: false, error: problem }, { status: 400 });
    }

    const plan = await planCampaign({
      audience: body.audience,
      templateName: template.name,
      needsCode: body.fill.some((s) => s.kind === "insiderCode"),
      allowRepeat: body.allowRepeat,
    });
    if (plan.ids.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Nobody in this group can get it." },
        { status: 400 },
      );
    }
    const campaign = await createCampaign(
      {
        template,
        fill: body.fill,
        headerImageUrl,
        audience: body.audience,
        plannedCount: plan.ids.length,
      },
      { staffUserId: staff.staffUserId },
    );
    return NextResponse.json(
      { ok: true, id: campaign.id, ids: plan.ids },
      { status: 201 },
    );
  },
);
