/**
 * Gupshup WhatsApp template sender. Server-only: it uses the account API
 * key, which never reaches the browser and is never logged.
 * Docs: https://docs.gupshup.io (WhatsApp, "Send template message").
 */
export interface GupshupConfig {
  apiKey: string;
  appName: string;
  /** The WhatsApp business number, digits only with country code. */
  sourceNumber: string;
}

export const GUPSHUP_ENV_NAMES = [
  "GUPSHUP_API_KEY",
  "GUPSHUP_APP_NAME",
  "GUPSHUP_SOURCE_NUMBER",
] as const;

export function readGupshupConfig(
  env: Record<string, string | undefined> = process.env,
): GupshupConfig | null {
  const apiKey = env.GUPSHUP_API_KEY?.trim();
  const appName = env.GUPSHUP_APP_NAME?.trim();
  const sourceNumber = digitsOnly(env.GUPSHUP_SOURCE_NUMBER);
  if (!apiKey || !appName || !sourceNumber) return null;
  return { apiKey, appName, sourceNumber };
}

/** Which connection settings are missing (names only, never values). */
export function missingGupshupSettings(
  env: Record<string, string | undefined> = process.env,
): string[] {
  return GUPSHUP_ENV_NAMES.filter((name) => !env[name]?.trim());
}

function digitsOnly(value: string | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

export const GUPSHUP_SEND_URL = "https://api.gupshup.io/wa/api/v1/template/msg";
export const GUPSHUP_TIMEOUT_MS = 10000;

export interface TemplateSendInput {
  /** E.164, e.g. +919876543210 */
  phone: string;
  templateId: string;
  params: string[];
  /** Public image link for templates with an image header. */
  imageUrl?: string | null;
}

/** The form body Gupshup expects. Pure, so it is unit tested. */
export function buildGupshupTemplateBody(
  config: GupshupConfig,
  input: TemplateSendInput,
): URLSearchParams {
  const body = new URLSearchParams();
  body.set("channel", "whatsapp");
  body.set("source", config.sourceNumber);
  body.set("destination", digitsOnly(input.phone));
  body.set("src.name", config.appName);
  body.set(
    "template",
    JSON.stringify({ id: input.templateId, params: input.params }),
  );
  if (input.imageUrl) {
    body.set(
      "message",
      JSON.stringify({ type: "image", image: { link: input.imageUrl } }),
    );
  }
  return body;
}

export type GupshupSendResult =
  { ok: true; messageId: string } | { ok: false; reason: string };

export async function sendGupshupTemplate(
  config: GupshupConfig,
  input: TemplateSendInput,
  fetchImpl: typeof fetch = fetch,
): Promise<GupshupSendResult> {
  let response: Response;
  try {
    response = await fetchImpl(GUPSHUP_SEND_URL, {
      method: "POST",
      headers: {
        apikey: config.apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: buildGupshupTemplateBody(config, input),
      signal: AbortSignal.timeout(GUPSHUP_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return { ok: false, reason: timedOut ? "Timed out" : "Network error" };
  }

  let data: { status?: string; messageId?: string; message?: string } = {};
  try {
    data = (await response.json()) as typeof data;
  } catch {
    // Some errors come back as plain text.
  }
  if (response.ok && data.messageId) {
    return { ok: true, messageId: data.messageId };
  }
  const detail =
    typeof data.message === "string" ? data.message.slice(0, 200) : "";
  return {
    ok: false,
    reason: `Gupshup said ${response.status}${detail ? `: ${detail}` : ""}`,
  };
}
