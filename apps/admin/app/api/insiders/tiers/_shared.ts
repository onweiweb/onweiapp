import type { InsiderTierResult } from "@onwei/core";
import { z } from "zod";

export const tierBodySchema = z.object({
  label: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  percent: z.number({ error: "Enter a whole number from 1 to 90." }),
});

type Failure = Extract<InsiderTierResult, { ok: false }>;

export function tierErrorMessage(result: Failure): string {
  switch (result.reason) {
    case "INVALID_LABEL":
      return 'Give the tier a short name, like "First week".';
    case "INVALID_DATE":
      return "Pick both a start date and an end date.";
    case "END_BEFORE_START":
      return "The end date has to be on or after the start date.";
    case "INVALID_PERCENT":
      return "Enter a whole number from 1 to 90.";
    case "OVERLAPS":
      return `These dates overlap with "${result.overlapsWith ?? "another tier"}". Each signup date can only be in one tier.`;
    case "NOT_FOUND":
      return "This tier was already removed. Refresh the page.";
  }
}
