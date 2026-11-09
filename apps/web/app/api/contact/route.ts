import {
  checkContactRateLimit,
  getClientIp,
  getSiteSetting,
  parseJsonBody,
  saveContactMessage,
  validateContactInput,
} from "@onwei/core";
import {
  ResendEmailSender,
  createEmailSender,
  renderContactAlertEmail,
  sendEmailSafely,
} from "@onwei/emails";
import { NextResponse, after } from "next/server";
import { z } from "zod";
import { invalidInput } from "../_lib/invalidInput";

// Shape only; the plain-language checks live in validateContactInput.
const bodySchema = z.object({
  fullName: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  message: z.string().default(""),
  // Hidden field real visitors never fill (bots do).
  company: z.string().optional(),
});

export async function POST(request: Request) {
  const { allowed } = await checkContactRateLimit(
    getClientIp(request) ?? "unknown",
  );
  if (!allowed) {
    return NextResponse.json(
      { ok: false, reason: "RATE_LIMITED" },
      { status: 429 },
    );
  }

  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return invalidInput();

  // Pretend it worked so bots learn nothing.
  if (parsed.data.company) return NextResponse.json({ ok: true });

  const checked = validateContactInput(parsed.data);
  if (!checked.ok) {
    return NextResponse.json(
      { ok: false, reason: "INVALID", errors: checked.errors },
      { status: 400 },
    );
  }

  await saveContactMessage(checked.value);

  // The saved row is the record; the alert is a convenience and never fails
  // the request.
  after(async () => {
    const { contactEmail } = await getSiteSetting();
    const to = contactEmail ?? process.env.ORDER_ALERT_EMAIL;
    if (!to) return;
    const apiKey = process.env.RESEND_API_KEY;
    const sender = apiKey
      ? new ResendEmailSender(
          apiKey,
          process.env.EMAIL_FROM ?? "Onwei <hello@onwei.in>",
          checked.value.email,
        )
      : createEmailSender();
    const adminUrl = `${process.env.ADMIN_APP_URL ?? "https://admin.onwei.in"}/messages`;
    await sendEmailSafely(
      to,
      renderContactAlertEmail({ ...checked.value, adminUrl }),
      sender,
    );
  });

  return NextResponse.json({ ok: true });
}
