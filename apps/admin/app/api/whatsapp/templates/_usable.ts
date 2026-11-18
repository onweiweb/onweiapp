import {
  listGupshupTemplates,
  templateFitFor,
  templateFitMessage,
  type TemplatePurpose,
} from "@onwei/core";

/**
 * Why a template can't be saved for a message, or null when it can. Picking a
 * new template, or switching one on, needs it approved in Gupshup and in the
 * right category. Keeping an old one switched off is always allowed, so staff
 * can still turn off a template WhatsApp has since rejected. If Gupshup can't
 * be reached the save goes through (the test send would fail anyway).
 */
export async function unusableTemplateReason(input: {
  purpose: TemplatePurpose;
  gupshupTemplateId: string;
  savedTemplateId: string;
  isActive: boolean;
}): Promise<string | null> {
  const id = input.gupshupTemplateId.trim();
  if (!id) return null;
  if (id === input.savedTemplateId && !input.isActive) return null;
  const list = await listGupshupTemplates();
  if (!list.ok) return null;
  const found = list.templates.find((t) => t.id === id);
  if (!found) {
    return "This template isn't in Gupshup any more. Pick another one.";
  }
  const fit = templateFitFor(input.purpose, found);
  return fit === "OK" ? null : templateFitMessage(input.purpose, found, fit);
}
