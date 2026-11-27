import { deleteNewsletterDraft } from "@onwei/core";
import { NextResponse } from "next/server";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";

/** Delete a draft that was never sent. */
export const DELETE = defineAdminRoute<never, { id: string }>(
  { permission: "newsletter:manage" },
  async ({ params }) => {
    if (!(await deleteNewsletterDraft(params.id))) {
      return NextResponse.json(
        {
          ok: false,
          error: "Only a draft that hasn't been sent can be deleted.",
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true });
  },
);
