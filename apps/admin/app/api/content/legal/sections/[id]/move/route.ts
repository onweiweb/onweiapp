import { moveLegalSection } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../../../_lib/defineAdminRoute";
import { triggerCatalogRevalidate } from "../../../../../_lib/triggerCatalogRevalidate";

const bodySchema = z.object({
  direction: z.enum(["up", "down"], { error: "Choose up or down." }),
});

export const POST = defineAdminRoute<typeof bodySchema, { id: string }>(
  {
    permission: "content:manage",
    body: bodySchema,
    emptyBodyMessage: "Choose up or down.",
  },
  async ({ staff, body, params }) => {
    try {
      await moveLegalSection(params.id, body.direction, {
        staffUserId: staff.staffUserId,
      });
      await triggerCatalogRevalidate();
      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "Couldn't find that point. Refresh and try again.",
        },
        { status: 404 },
      );
    }
  },
);
