import {
  checkWaitlistRateLimit,
  findInviter,
  getClientIp,
  parseJsonBody,
} from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidInput } from "../../_lib/invalidInput";

// "Know an Insider who can let you in?": checks the Insider number. Answers
// only yes or no (and the inviter's first name, to greet), never contacts.
const bodySchema = z.object({ code: z.string().trim().min(1).max(20) });

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return invalidInput();
  const { allowed } = await checkWaitlistRateLimit(
    `invite:${getClientIp(request) ?? "unknown"}`,
  );
  if (!allowed)
    return NextResponse.json(
      { ok: false, reason: "RATE_LIMITED" },
      { status: 429 },
    );
  const inviter = await findInviter(parsed.data.code);
  if (!inviter) return NextResponse.json({ ok: true, valid: false });
  return NextResponse.json({
    ok: true,
    valid: true,
    firstName: inviter.firstName,
  });
}
