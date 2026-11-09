import { OrderActionError, ReturnActionError } from "@onwei/core";
import { NextResponse } from "next/server";

/** Turns a staff-action error into a plain message the admin shows. */
export function actionError(error: unknown): NextResponse {
  if (error instanceof OrderActionError || error instanceof ReturnActionError) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 },
    );
  }
  if (
    error instanceof Error &&
    error.message.startsWith("invalid-transition")
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "This order can't move to that step from where it is now. Refresh the page.",
      },
      { status: 400 },
    );
  }
  console.error(error);
  return NextResponse.json(
    { ok: false, error: "Something went wrong. Try again." },
    { status: 500 },
  );
}
