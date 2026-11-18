import { getPreorderPublicStatus } from "@onwei/core";
import { NextResponse } from "next/server";

// The banner, pop-up and Reserve button read this. Short cache: the tier
// changes at most once a day, the countdown runs in the browser.
export async function GET() {
  const status = await getPreorderPublicStatus();
  return NextResponse.json(status, {
    headers: { "Cache-Control": "public, max-age=30, s-maxage=30" },
  });
}
