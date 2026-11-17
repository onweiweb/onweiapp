import { prisma, type SmsPurpose } from "@onwei/database";
import { readMsg91Config, sendMsg91Otp, type Msg91Config } from "./msg91Client";

/** True once the MSG91 settings are in place, so SMS codes can go out. */
export function smsAvailable(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return readMsg91Config(env) !== null;
}

export interface SendSmsCodeInput {
  /** E.164 */
  phone: string;
  code: string;
  expiryMinutes: number;
  customerId?: string;
  purpose?: SmsPurpose;
}

export interface SendSmsOptions {
  config?: Msg91Config | null;
  fetchImpl?: typeof fetch;
}

export type SendSmsResult =
  | { status: "sent"; requestId: string | null }
  | { status: "skipped" }
  | { status: "failed"; reason: string };

/**
 * Sends one sign-in code by SMS and logs it (without the code). Never
 * throws: the caller shows "try WhatsApp or email" when it didn't go out.
 */
export async function sendSmsCode(
  input: SendSmsCodeInput,
  options: SendSmsOptions = {},
): Promise<SendSmsResult> {
  const config =
    options.config === undefined ? readMsg91Config() : options.config;
  if (!config) return { status: "skipped" };

  let logId: string | null = null;
  try {
    const row = await prisma.smsMessage.create({
      data: {
        purpose: input.purpose ?? "SIGN_IN_CODE",
        phone: input.phone,
        customerId: input.customerId ?? null,
      },
      select: { id: true },
    });
    logId = row.id;
  } catch (error) {
    // Still send: a missing log row must not block someone signing in.
    console.error("[sms] couldn't log the send", error);
  }

  const result = await sendMsg91Otp(
    config,
    {
      phone: input.phone,
      code: input.code,
      expiryMinutes: input.expiryMinutes,
    },
    options.fetchImpl,
  );

  if (logId) {
    const now = new Date();
    await prisma.smsMessage
      .updateMany({
        where: { id: logId, status: "SENDING" },
        data: result.ok
          ? {
              status: "SENT",
              sentAt: now,
              providerRequestId: result.requestId,
            }
          : { status: "FAILED", failedAt: now, failureReason: result.reason },
      })
      .catch((error: unknown) => {
        console.error("[sms] couldn't update the log", error);
      });
  }

  if (!result.ok) {
    console.error("[sms] send failed:", result.reason);
    return { status: "failed", reason: result.reason };
  }
  return { status: "sent", requestId: result.requestId };
}
