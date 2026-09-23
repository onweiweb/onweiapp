import { z } from "zod";

/** Ordered label/value pairs for the PDP spec table — the key set varies by
 * category (paddle specs vs. apparel specs), so it's validated as a plain
 * array rather than a fixed shape. */
export const productSpecsSchema = z.array(
  z.object({
    label: z.string().min(1, "Spec label can't be empty."),
    value: z.string().min(1, "Spec value can't be empty."),
  }),
);

export function validateProductSpecs(
  specs: unknown,
):
  | { ok: true; data: { label: string; value: string }[] }
  | { ok: false; error: string } {
  const result = productSpecsSchema.safeParse(specs);
  if (!result.success) {
    return {
      ok: false,
      error: result.error.issues[0]?.message ?? "Invalid spec list.",
    };
  }
  return { ok: true, data: result.data };
}
