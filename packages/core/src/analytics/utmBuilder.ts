import { slugifyUtmValue } from "./attribution";

export interface UtmChannel {
  id: string;
  /** Plain-language name shown to staff. */
  label: string;
  utmSource: string;
  utmMedium: string;
}

// A fixed list on purpose, so "instagram" is never also "insta" or "IG" in
// the reports.
export const UTM_CHANNELS: readonly UtmChannel[] = [
  {
    id: "instagram-bio",
    label: "Instagram bio link",
    utmSource: "instagram",
    utmMedium: "bio",
  },
  {
    id: "instagram-story",
    label: "Instagram story",
    utmSource: "instagram",
    utmMedium: "story",
  },
  {
    id: "linkedin",
    label: "LinkedIn post or message",
    utmSource: "linkedin",
    utmMedium: "social",
  },
  {
    id: "whatsapp",
    label: "WhatsApp message",
    utmSource: "whatsapp",
    utmMedium: "message",
  },
  {
    id: "founder-outreach",
    label: "Founder outreach (direct message or email)",
    utmSource: "founder-outreach",
    utmMedium: "message",
  },
  {
    id: "other",
    label: "Somewhere else",
    utmSource: "other",
    utmMedium: "link",
  },
];

export type BuildUtmLinkResult =
  | { ok: true; url: string }
  | { ok: false; reason: "UNKNOWN_CHANNEL" | "EMPTY_CAMPAIGN" | "BAD_URL" };

/** Builds a tagged link. `pageUrl` may be a full URL or a path like "/ontheway". */
export function buildUtmLink(input: {
  siteUrl: string;
  pageUrl: string;
  channelId: string;
  campaign: string;
  content?: string;
}): BuildUtmLinkResult {
  const channel = UTM_CHANNELS.find((c) => c.id === input.channelId);
  if (!channel) return { ok: false, reason: "UNKNOWN_CHANNEL" };

  const campaign = slugifyUtmValue(input.campaign);
  if (!campaign) return { ok: false, reason: "EMPTY_CAMPAIGN" };

  let url: URL;
  try {
    url = new URL(input.pageUrl, input.siteUrl);
  } catch {
    return { ok: false, reason: "BAD_URL" };
  }

  url.searchParams.set("utm_source", channel.utmSource);
  url.searchParams.set("utm_medium", channel.utmMedium);
  url.searchParams.set("utm_campaign", campaign);
  const content = input.content ? slugifyUtmValue(input.content) : "";
  if (content) url.searchParams.set("utm_content", content);
  return { ok: true, url: url.toString() };
}
