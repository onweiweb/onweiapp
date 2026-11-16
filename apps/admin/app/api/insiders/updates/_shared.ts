import type { InsiderUpdateError } from "@onwei/core";
import { z } from "zod";

export const updateBodySchema = z.object({
  title: z.string().max(500),
  body: z.string().max(5000),
  eventDate: z.string().max(10).nullable().optional(),
  imageUrl: z.string().max(1000).nullable().optional(),
  linkUrl: z.string().max(1000).nullable().optional(),
  linkLabel: z.string().max(60).nullable().optional(),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

const MESSAGES: Record<InsiderUpdateError, string> = {
  TITLE_REQUIRED: "Add a title.",
  TITLE_TOO_LONG: "Keep the title under 120 characters.",
  BODY_REQUIRED: "Add a few words about it.",
  BODY_TOO_LONG: "Keep the text under 1000 characters.",
  INVALID_DATE: "That date doesn't look right.",
  INVALID_LINK:
    "The link must start with https:// or be a page on our site, like /collection/all.",
  NOT_FOUND: "This update was already removed. Refresh the page.",
};

export function updateErrorMessage(reason: InsiderUpdateError): string {
  return MESSAGES[reason];
}
