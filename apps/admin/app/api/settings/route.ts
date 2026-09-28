import { updateSiteSetting } from "@onwei/core";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../_lib/requireStaffSession";

const SITE_MODES = ["WAITLIST", "PREORDERS", "LIVE"] as const;
type SiteModeInput = (typeof SITE_MODES)[number];

function isSiteMode(value: unknown): value is SiteModeInput {
  return (
    typeof value === "string" && SITE_MODES.includes(value as SiteModeInput)
  );
}

export async function PATCH(request: Request) {
  const session = await requireStaffSession(request, "settings:manage");
  if (!session.ok) return session.response;

  const body = (await request.json().catch(() => null)) as {
    siteMode?: unknown;
    launchAt?: unknown;
    allowInternationalPhone?: unknown;
  } | null;

  if (!body) {
    return NextResponse.json(
      { ok: false, error: "Nothing to update." },
      { status: 400 },
    );
  }

  const launchAt =
    typeof body.launchAt === "string" &&
    !Number.isNaN(Date.parse(body.launchAt))
      ? new Date(body.launchAt)
      : undefined;

  const setting = await updateSiteSetting(
    {
      siteMode: isSiteMode(body.siteMode) ? body.siteMode : undefined,
      launchAt,
      allowInternationalPhone:
        typeof body.allowInternationalPhone === "boolean"
          ? body.allowInternationalPhone
          : undefined,
    },
    { staffUserId: session.context.staffUserId },
  );

  return NextResponse.json({ ok: true, setting });
}
