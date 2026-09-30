import { approveReview } from "@onwei/core";
import { NextResponse } from "next/server";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";

export const POST = defineAdminRoute<never, { id: string }>(
  { permission: "review:moderate" },
  async ({ staff, params }) => {
    try {
      const review = await approveReview(params.id, {
        staffUserId: staff.staffUserId,
      });
      return NextResponse.json({ ok: true, review });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error && error.message.startsWith("already-approved")
          ? "This review is already live."
          : "Couldn't find that review.";
      return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }
  },
);
