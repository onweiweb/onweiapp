import { createLegalSection } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../../../_lib/defineAdminRoute";
import { requiredText } from "../../../../../_lib/schemas";
import { triggerCatalogRevalidate } from "../../../../../_lib/triggerCatalogRevalidate";

const MESSAGE = "Give the point a heading and some text.";

const bodySchema = z.object({
  heading: requiredText(MESSAGE),
  body: requiredText(MESSAGE),
});

export const POST = defineAdminRoute<typeof bodySchema, { id: string }>(
  { permission: "content:manage", body: bodySchema, emptyBodyMessage: MESSAGE },
  async ({ staff, body, params }) => {
    try {
      const section = await createLegalSection(
        params.id,
        { heading: body.heading, body: body.body },
        { staffUserId: staff.staffUserId },
      );
      await triggerCatalogRevalidate();
      return NextResponse.json({ ok: true, section }, { status: 201 });
    } catch {
      return NextResponse.json(
        { ok: false, error: "Couldn't find that page. Refresh and try again." },
        { status: 404 },
      );
    }
  },
);
