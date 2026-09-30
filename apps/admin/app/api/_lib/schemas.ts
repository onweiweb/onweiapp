import { z } from "zod";

/** A required text field: trimmed, and an empty value shows `message`. */
export const requiredText = (message: string) =>
  z.string({ error: message }).trim().min(1, { error: message });

/** Optional text that may be cleared with null. */
export const optionalText = z.string().nullish();

/** ISO date string, null to clear, empty or invalid means "leave unchanged". */
export const optionalDate = z
  .unknown()
  .optional()
  .transform((value): Date | null | undefined => {
    if (value === null) return null;
    if (typeof value !== "string" || value === "") return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  });
