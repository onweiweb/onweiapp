import type { GupshupTemplateSummary } from "./gupshupTemplates";

/**
 * The parts of an Insiders WhatsApp send that the admin page also needs in
 * the browser (blank kinds, preview text, checks). No database or secrets
 * here, so client components can import it from "@onwei/core/campaign-fill".
 */

export const CAMPAIGN_FILL_KINDS = [
  "firstName",
  "fullName",
  "insiderCode",
  "addressLink",
  "addressToken",
  "text",
] as const;
export type CampaignFillKind = (typeof CAMPAIGN_FILL_KINDS)[number];

export interface CampaignFillSlot {
  kind: CampaignFillKind;
  /** Only for "text". */
  text?: string;
}

export const CAMPAIGN_FILL_LABELS: Record<CampaignFillKind, string> = {
  firstName: "First name",
  fullName: "Full name",
  insiderCode: "Insider code",
  addressLink: "Address form link (full link)",
  addressToken: "Address form link (end of button link)",
  text: "Same text for everyone",
};

/** Sample values for the preview and the test send. */
export const CAMPAIGN_SAMPLE: Record<
  Exclude<CampaignFillKind, "text">,
  string
> = {
  firstName: "Priya",
  fullName: "Priya Sharma",
  insiderCode: "WEI4821",
  addressLink: "https://www.onwei.in/insider/address?t=…",
  addressToken: "cm3x9k2.1798000000.Ab3dEf",
};

/** Most people a single send can go to. Meta's daily limits are lower. */
export const CAMPAIGN_MAX_RECIPIENTS = 5000;
export const CAMPAIGN_BATCH_SIZE = 20;
const MAX_TEXT = 300;

/** How many blanks a template has, body first then the button link. */
export function campaignSlotCount(
  template: Pick<GupshupTemplateSummary, "bodyValues" | "buttonValues">,
): number {
  return template.bodyValues + template.buttonValues;
}

/** A sensible first guess: name, then code, then the address link. */
export function suggestCampaignFill(
  template: Pick<GupshupTemplateSummary, "bodyValues" | "buttonValues">,
): CampaignFillSlot[] {
  const body: CampaignFillKind[] = ["firstName", "insiderCode", "addressLink"];
  const slots: CampaignFillSlot[] = [];
  for (let i = 0; i < template.bodyValues; i++) {
    const kind = body[i];
    slots.push(kind ? { kind } : { kind: "text", text: "" });
  }
  for (let i = 0; i < template.buttonValues; i++) {
    slots.push({ kind: "addressToken" });
  }
  return slots;
}

/** WhatsApp refuses values with new lines, tabs or long runs of spaces. */
export function cleanFillText(text: string): string {
  return text
    .replace(/[\r\n\t]+/g, " ")
    .replace(/ {2,}/g, " ")
    .trim()
    .slice(0, MAX_TEXT);
}

/** Returns a plain error for staff, or null when the fill can be sent. */
export function checkCampaignFill(
  template: Pick<
    GupshupTemplateSummary,
    "status" | "category" | "header" | "bodyValues" | "buttonValues"
  >,
  fill: CampaignFillSlot[],
  headerImageUrl: string | null,
): string | null {
  if (template.status !== "APPROVED") {
    return "This template isn't approved yet, so WhatsApp won't send it.";
  }
  if (!["UTILITY", "MARKETING"].includes(template.category)) {
    return "Only utility and marketing templates can be sent from here.";
  }
  if (template.header === "UNSUPPORTED") {
    return "This template has a video or document header, which can't be sent from here yet.";
  }
  if (template.header === "IMAGE" && !headerImageUrl) {
    return "This template has an image at the top. Add the image first.";
  }
  if (fill.length !== campaignSlotCount(template)) {
    return "Fill in every blank in the message.";
  }
  for (const slot of fill) {
    if (slot.kind === "text" && !cleanFillText(slot.text ?? "")) {
      return "Type the text for every blank set to “Same text for everyone”.";
    }
  }
  return null;
}

export const CAMPAIGN_GROUPS = [
  "all",
  "noAddress",
  "addressShared",
  "joined",
  "picked",
] as const;
export type CampaignGroup = (typeof CAMPAIGN_GROUPS)[number];

export const CAMPAIGN_GROUP_LABELS: Record<CampaignGroup, string> = {
  all: "All Insiders",
  noAddress: "Haven't shared their address",
  addressShared: "Shared their address",
  joined: "Joined between two dates",
  picked: "People I pick",
};

export interface CampaignAudience {
  group: CampaignGroup;
  /** yyyy-mm-dd, India time, for "joined". */
  from?: string;
  to?: string;
  /** For "picked". */
  ids?: string[];
}

/** Sample params for the preview and the test send. */
export function sampleCampaignParams(fill: CampaignFillSlot[]): string[] {
  return fill.map((slot) =>
    slot.kind === "text"
      ? cleanFillText(slot.text ?? "") || "…"
      : CAMPAIGN_SAMPLE[slot.kind],
  );
}

/** Puts values into {{1}}, {{2}}... for the preview. */
export function fillTemplateText(text: string, values: string[]): string {
  return text.replace(/\{\{\s*(\d+)\s*\}\}/g, (match, n: string) => {
    const value = values[Number(n) - 1];
    return value === undefined ? match : value;
  });
}
