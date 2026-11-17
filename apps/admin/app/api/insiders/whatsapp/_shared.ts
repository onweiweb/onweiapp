import {
  CAMPAIGN_FILL_KINDS,
  CAMPAIGN_GROUPS,
  listGupshupTemplates,
  type GupshupTemplateSummary,
} from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { GUPSHUP_LIST_ERRORS } from "../../../whatsapp/_gupshup";

export const fillSchema = z
  .array(
    z.object({
      kind: z.enum(CAMPAIGN_FILL_KINDS),
      text: z.string().max(1000).optional(),
    }),
  )
  .max(20);

export const audienceSchema = z.object({
  group: z.enum(CAMPAIGN_GROUPS),
  from: z.string().max(10).optional(),
  to: z.string().max(10).optional(),
  ids: z.array(z.string().min(1).max(64)).max(500).optional(),
});

export const headerImageSchema = z
  .string()
  .trim()
  .url()
  .startsWith("https://")
  .max(1000)
  .nullable()
  .default(null);

/** Templates staff can send from Insiders: approved utility or marketing. */
export function sendable(template: GupshupTemplateSummary): boolean {
  return (
    template.status === "APPROVED" &&
    (template.category === "UTILITY" || template.category === "MARKETING")
  );
}

/**
 * Reads one template fresh from Gupshup, so a send always uses what Gupshup
 * has now (not what the page loaded earlier).
 */
export async function loadTemplate(
  id: string,
): Promise<
  | { ok: true; template: GupshupTemplateSummary }
  | { ok: false; response: Response }
> {
  const result = await listGupshupTemplates();
  if (!result.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: GUPSHUP_LIST_ERRORS[result.reason] },
        { status: result.reason === "UNAVAILABLE" ? 502 : 400 },
      ),
    };
  }
  const template = result.templates.find((t) => t.id === id);
  if (!template) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: "That template isn't in Gupshup any more. Pick another one.",
        },
        { status: 404 },
      ),
    };
  }
  return { ok: true, template };
}
