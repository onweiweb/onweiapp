import {
  checkReviewRateLimit,
  getClientIp,
  getCurrentConsentVersion,
  parseJsonBody,
  REVIEW_LIMITS,
  submitSiteReview,
} from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidInput } from "../_lib/invalidInput";

/**
 * "Write a review": anyone with a valid email. Saved unapproved, staff
 * approve it in admin Reviews before it shows anywhere.
 */
const bodySchema = z.object({
  rating: z.number().int(),
  title: z
    .string()
    .max(REVIEW_LIMITS.title * 2)
    .optional(),
  body: z.string().max(REVIEW_LIMITS.bodyMax * 2),
  name: z.string().max(REVIEW_LIMITS.name * 2),
  email: z.string().max(320),
  productId: z.string().max(64).optional(),
  consent: z.boolean().optional(),
  // Hidden field people never see. Bots fill it in.
  website: z.string().optional(),
});

export async function POST(request: Request) {
  const ip = getClientIp(request) ?? "unknown";
  const { allowed } = await checkReviewRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { ok: false, reason: "RATE_LIMITED" },
      { status: 429 },
    );
  }

  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return invalidInput();
  const { consent, website, ...input } = parsed.data;

  // A filled-in hidden field: answer as if it worked, save nothing.
  if (website) return NextResponse.json({ ok: true });

  if (consent !== true) {
    return NextResponse.json(
      { ok: false, reason: "CONSENT_REQUIRED" },
      { status: 400 },
    );
  }

  const result = await submitSiteReview(input, {
    version: await getCurrentConsentVersion(["privacy"]),
    ipAddress: ip === "unknown" ? undefined : ip,
  });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, reason: result.reason },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true });
}
