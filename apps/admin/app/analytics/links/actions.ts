"use server";

import { buildUtmLink, deleteTrackedLink, saveTrackedLink } from "@onwei/core";
import { revalidatePath } from "next/cache";
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
  const { staffUserId } = await requirePageSession("waitlist:view");

  const channelId = String(formData.get("channel") ?? "");
  const result = buildUtmLink({
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.onwei.in",
    pageUrl: String(formData.get("page") ?? "/ontheway"),
    channelId,
    campaign: String(formData.get("campaign") ?? ""),
    content: String(formData.get("content") ?? ""),
  });
  if (!result.ok) {
    return { status: "error", message: ERROR_COPY[result.reason] };
  }
  await saveTrackedLink({
    url: result.url,
    channelId,
    pagePath: result.pagePath,
    campaign: result.campaign,
    content: result.content,
    createdById: staffUserId,
  });
  revalidatePath("/analytics/links");
  return { status: "done", url: result.url };
}

export type RemoveLinkResult = { ok: true } | { ok: false; message: string };

export async function removeLinkAction(id: string): Promise<RemoveLinkResult> {
  await requirePageSession("waitlist:view");
  const removed = await deleteTrackedLink(id);
  revalidatePath("/analytics/links");
  return removed
    ? { ok: true }
    : { ok: false, message: "That link was already removed." };
}
