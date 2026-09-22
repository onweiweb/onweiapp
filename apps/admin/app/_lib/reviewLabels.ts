import type { ReviewSource } from "@onwei/database";

export const REVIEW_SOURCE_LABELS: Record<ReviewSource, string> = {
  SITE: "Submitted on site",
  EMAIL: "Entered from email",
  AMAZON_IMPORT: "Imported from Amazon",
};
