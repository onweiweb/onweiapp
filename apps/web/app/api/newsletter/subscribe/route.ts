import {
  checkNewsletterRateLimit,
  getClientIp,
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

  const result = await subscribeToNewsletter(
    parsed.data.email,
    "homepage_footer",
  );
  return NextResponse.json({
    ok: true,
    alreadySubscribed: result.alreadySubscribed,
  });
}
