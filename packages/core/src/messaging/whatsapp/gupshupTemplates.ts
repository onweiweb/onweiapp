import type { TemplatePurpose } from "./purposes";
import { GUPSHUP_TIMEOUT_MS } from "./gupshupClient";
import { WHATSAPP_PURPOSES } from "./purposes";

/**
 * Reads the app's templates from Gupshup so staff pick one in admin instead
 * of typing IDs. Uses GUPSHUP_API_KEY and GUPSHUP_APP_ID (the app's ID from
 * the Gupshup console). Endpoint and response shape confirmed against the
 * live account on 2026-11-17:
 * GET https://api.gupshup.io/wa/app/<appId>/template, header `apikey`.
 */

export type GupshupHeaderKind = "NONE" | "TEXT" | "IMAGE" | "UNSUPPORTED";

export interface GupshupTemplateSummary {
  id: string;
  name: string;
  language: string;
  /** AUTHENTICATION, UTILITY or MARKETING. */
  category: string;
  /** APPROVED, PENDING, REJECTED, ... */
  status: string;
  /** Gupshup's own template type, e.g. TEXT, IMAGE, VIDEO. */
  templateType: string;
  header: GupshupHeaderKind;
  bodyText: string;
  footer: string | null;
  buttons: { type: string; text: string }[];
  /** How many {{n}} values the body needs. */
  bodyValues: number;
  /** How many values the buttons need (a link ending in {{1}}). */
  buttonValues: number;
  /** Gupshup's public sample image, usable as the header image. */
  sampleImageUrl: string | null;
  /** Why it was rejected, when Gupshup says. */
  reason: string | null;
}

export function readGupshupAppId(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const id = env.GUPSHUP_APP_ID?.trim();
  return id && /^[A-Za-z0-9-]{8,64}$/.test(id) ? id : null;
}

/** Number of distinct {{n}} placeholders in a piece of text. */
export function countPlaceholders(text: string): number {
  return new Set([...text.matchAll(/\{\{\s*(\d+)\s*\}\}/g)].map((m) => m[1]))
    .size;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseMeta(raw: unknown): Record<string, unknown> {
  if (typeof raw !== "string") return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/** Turns Gupshup's response into summaries. Pure, unit tested. */
export function parseGupshupTemplates(body: unknown): GupshupTemplateSummary[] {
  if (!body || typeof body !== "object") return [];
  const list = (body as { templates?: unknown }).templates;
  if (!Array.isArray(list)) return [];
  const out: GupshupTemplateSummary[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const t = item as Record<string, unknown>;
    const id = str(t.id);
    if (!id) continue;
    const meta = parseMeta(t.containerMeta);
    const bodyText = str(meta.data) || str(t.data).split(" | [")[0] || "";
    const rawButtons = Array.isArray(meta.buttons) ? meta.buttons : [];
    const buttons = rawButtons
      .filter(
        (b): b is Record<string, unknown> =>
          Boolean(b) && typeof b === "object",
      )
      .map((b) => ({ type: str(b.type), text: str(b.text), url: str(b.url) }));
    const type = str(t.templateType).toUpperCase();
    const header: GupshupHeaderKind =
      type === "IMAGE"
        ? "IMAGE"
        : type === "TEXT"
          ? str(meta.header)
            ? "TEXT"
            : "NONE"
          : "UNSUPPORTED";
    const mediaUrl = str(meta.mediaUrl);
    out.push({
      id,
      name: str(t.elementName),
      language: str(t.languageCode) || "en",
      category: str(t.category).toUpperCase(),
      status: str(t.status).toUpperCase(),
      templateType: type,
      header,
      bodyText,
      footer: str(meta.footer) || null,
      buttons: buttons.map(({ type: bt, text }) => ({ type: bt, text })),
      bodyValues: countPlaceholders(bodyText),
      buttonValues: buttons.reduce(
        (sum, b) => sum + countPlaceholders(b.url),
        0,
      ),
      sampleImageUrl:
        header === "IMAGE" && /^https:\/\//.test(mediaUrl) ? mediaUrl : null,
      reason: str(t.reason) || null,
    });
  }
  // Approved first, then newest Gupshup order.
  return out.sort(
    (a, b) => Number(b.status === "APPROVED") - Number(a.status === "APPROVED"),
  );
}

export type ListGupshupTemplatesResult =
  | { ok: true; templates: GupshupTemplateSummary[] }
  | { ok: false; reason: "NOT_CONFIGURED" | "REJECTED_KEY" | "UNAVAILABLE" };

export async function listGupshupTemplates(
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<ListGupshupTemplatesResult> {
  const apiKey = env.GUPSHUP_API_KEY?.trim();
  const appId = readGupshupAppId(env);
  if (!apiKey || !appId) return { ok: false, reason: "NOT_CONFIGURED" };
  try {
    const response = await fetchImpl(
      `https://api.gupshup.io/wa/app/${encodeURIComponent(appId)}/template`,
      {
        headers: { apikey: apiKey },
        signal: AbortSignal.timeout(GUPSHUP_TIMEOUT_MS),
        cache: "no-store",
      },
    );
    if (response.status === 401 || response.status === 403) {
      return { ok: false, reason: "REJECTED_KEY" };
    }
    if (!response.ok) return { ok: false, reason: "UNAVAILABLE" };
    return {
      ok: true,
      templates: parseGupshupTemplates(await response.json()),
    };
  } catch {
    return { ok: false, reason: "UNAVAILABLE" };
  }
}

/**
 * True when the template's category can carry this message. Sign-in codes
 * must be Authentication; the others can be Utility or Marketing (Meta picks
 * the final category and has moved some of ours between the two).
 */
export function categoryFits(
  purpose: TemplatePurpose,
  category: string,
): boolean {
  const upper = category.toUpperCase();
  if (WHATSAPP_PURPOSES[purpose].category === "Authentication") {
    return upper === "AUTHENTICATION";
  }
  return upper === "UTILITY" || upper === "MARKETING";
}

/**
 * The value order to fill in for a picked template: body values first, then
 * button values, in the usual order for that message. Staff can change it.
 */
export function suggestTemplateValues(
  purpose: TemplatePurpose,
  template: Pick<GupshupTemplateSummary, "bodyValues" | "buttonValues">,
): string[] {
  const keys = WHATSAPP_PURPOSES[purpose].variables.map((v) => v.key);
  const bodyKeys = keys.filter((key) => key !== "addressToken");
  const buttonKey = keys.includes("addressToken")
    ? "addressToken"
    : (keys[0] ?? "code");
  const values: string[] = [];
  for (let i = 0; i < template.bodyValues; i++) {
    values.push(bodyKeys[i] ?? bodyKeys[bodyKeys.length - 1] ?? buttonKey);
  }
  for (let i = 0; i < template.buttonValues; i++) values.push(buttonKey);
  return values;
}
