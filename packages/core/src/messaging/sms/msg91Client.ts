/**
 * MSG91 SendOTP for sign-in codes. Onwei makes and checks the code; MSG91
 * only delivers it, through the OTP template linked to the approved DLT
 * template and sender ID (the template has ##OTP## where the code goes).
 * Request: POST https://control.msg91.com/api/v5/otp with the authkey header
 * and template_id, mobile, otp and otp_expiry in the query.
 * Response: {"type":"success","request_id":"..."} or
 * {"type":"error","message":"..."}. The key is never logged.
 */
export const MSG91_ENV_NAMES = [
  "MSG91_AUTH_KEY",
  "MSG91_OTP_TEMPLATE_ID",
] as const;

export interface Msg91Config {
  authKey: string;
  templateId: string;
}

const SEND_URL = "https://control.msg91.com/api/v5/otp";
const TIMEOUT_MS = 10_000;

export function readMsg91Config(
  env: Record<string, string | undefined> = process.env,
): Msg91Config | null {
  const authKey = env.MSG91_AUTH_KEY?.trim();
  const templateId = env.MSG91_OTP_TEMPLATE_ID?.trim();
  if (!authKey || !templateId) return null;
  return { authKey, templateId };
}

/** The send URL. MSG91 wants the number as digits with the country code. */
export function buildMsg91OtpUrl(
  config: Msg91Config,
  input: { phone: string; code: string; expiryMinutes: number },
): string {
  const url = new URL(SEND_URL);
  url.searchParams.set("template_id", config.templateId);
  url.searchParams.set("mobile", input.phone.replace(/\D/g, ""));
  url.searchParams.set("otp", input.code);
  url.searchParams.set("otp_expiry", String(input.expiryMinutes));
  return url.toString();
}

export type Msg91SendResult =
  { ok: true; requestId: string | null } | { ok: false; reason: string };

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function sendMsg91Otp(
  config: Msg91Config,
  input: { phone: string; code: string; expiryMinutes: number },
  fetchImpl: typeof fetch = fetch,
): Promise<Msg91SendResult> {
  let response: Response;
  try {
    response = await fetchImpl(buildMsg91OtpUrl(config, input), {
      method: "POST",
      headers: {
        authkey: config.authKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: "{}",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    return {
      ok: false,
      reason: timedOut ? "MSG91 took too long" : "Network error",
    };
  }

  let body: Record<string, unknown> = {};
  try {
    const parsed: unknown = await response.json();
    if (parsed && typeof parsed === "object") {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    // Not JSON; handled below.
  }
  const type = str(body.type)?.toLowerCase();
  if (response.ok && type === "success") {
    return {
      ok: true,
      requestId: str(body.request_id) ?? str(body.requestId) ?? null,
    };
  }
  const message = str(body.message) ?? "no reason given";
  return {
    ok: false,
    reason: `MSG91 said ${response.status}: ${message}`.slice(0, 200),
  };
}
