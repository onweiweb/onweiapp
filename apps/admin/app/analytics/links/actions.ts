"use server";

import { buildUtmLink } from "@onwei/core";
import { requirePageSession } from "../../_lib/requirePageSession";

export type LinkBuilderState =
  | { status: "idle" }
  | { status: "done"; url: string }
  | { status: "error"; message: string };

const ERROR_COPY = {
  UNKNOWN_CHANNEL: "Pick where you'll share the link.",
  EMPTY_CAMPAIGN:
    "Give the campaign a short name, like launch-week. Letters and numbers only.",
  BAD_URL:
    "That page address doesn't look right. Pick a page from the list, or type a path like /ontheway.",
} as const;

export async function buildLinkAction(
  _previous: LinkBuilderState,
  formData: FormData,
): Promise<LinkBuilderState> {
  await requirePageSession("waitlist:view");

  const result = buildUtmLink({
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.onwei.in",
    pageUrl: String(formData.get("page") ?? "/ontheway"),
    channelId: String(formData.get("channel") ?? ""),
    campaign: String(formData.get("campaign") ?? ""),
    content: String(formData.get("content") ?? ""),
  });
  if (!result.ok) {
    return { status: "error", message: ERROR_COPY[result.reason] };
  }
  return { status: "done", url: result.url };
}
