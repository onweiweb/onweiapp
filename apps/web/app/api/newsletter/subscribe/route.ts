import {
  checkNewsletterRateLimit,
  getClientIp,
  getCurrentConsentVersion,
  isValidEmail,
  parseJsonBody,
  subscribeToNewsletter,
} from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidInput } from "../../_lib/invalidInput";

const bodySchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine(isValidEmail, { error: "INVALID_EMAIL" }),
  consent: z.boolean().optional(),
});

export async function POST(request: Request) {
  const { allowed } = await checkNewsletterRateLimit(
    getClientIp(request) ?? "unknown",
  );
  if (!allowed) {
    return NextResponse.json(
      { ok: false, reason: "RATE_LIMITED" },
      { status: 429 },
    );
  }

  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) {
    return parsed.kind === "INVALID"
      ? NextResponse.json(
          { ok: false, reason: "INVALID_EMAIL" },
          { status: 400 },
        )
      : invalidInput();
  }

  if (parsed.data.consent !== true) {
    return NextResponse.json(
      { ok: false, reason: "CONSENT_REQUIRED" },
      { status: 400 },
    );
  }

  const result = await subscribeToNewsletter(
    parsed.data.email,
    "homepage_footer",
    {
      version: await getCurrentConsentVersion(["privacy"]),
      ipAddress: getClientIp(request) ?? undefined,
    },
  );
  return NextResponse.json({
    ok: true,
    alreadySubscribed: result.alreadySubscribed,
  });
}
