import type { RenderedEmail } from "../templates/otpEmail";

export interface EmailSender {
  send(to: string, email: RenderedEmail): Promise<void>;
}

/** Dev fallback when no provider key is configured. Sends nothing. */
export class ConsoleEmailSender implements EmailSender {
  async send(to: string, email: RenderedEmail): Promise<void> {
    console.log(
      `[email:dev] to=${to} subject="${email.subject}"\n${email.text}`,
    );
  }
}

export class ResendEmailSender implements EmailSender {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly replyTo?: string,
  ) {}

  async send(to: string, email: RenderedEmail): Promise<void> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: [to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(this.replyTo ? { reply_to: this.replyTo } : {}),
      }),
    });
    if (!response.ok) {
      throw new Error(`Resend responded ${response.status}`);
    }
  }
}

export function createEmailSender(
  env: Record<string, string | undefined> = process.env,
): EmailSender {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) return new ConsoleEmailSender();
  return new ResendEmailSender(
    apiKey,
    env.EMAIL_FROM ?? "Onwei <hello@onwei.in>",
    env.EMAIL_REPLY_TO,
  );
}

/**
 * Welcome mail is a courtesy, never a reason to fail a signup. Logs and
 * swallows any send error. Returns whether the send succeeded.
 */
export async function sendEmailSafely(
  to: string,
  email: RenderedEmail,
  sender: EmailSender = createEmailSender(),
): Promise<boolean> {
  try {
    await sender.send(to, email);
    return true;
  } catch (error) {
    console.error("[email] send failed", error);
    return false;
  }
}
