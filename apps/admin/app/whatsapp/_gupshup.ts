import {
  listGupshupTemplates,
  type ListGupshupTemplatesResult,
} from "@onwei/core";
import { unstable_cache } from "next/cache";

/**
 * Gupshup's template list, cached for a minute so the WhatsApp page and the
 * picker don't ask Gupshup on every load. Server-only (uses the API key).
 */
export const cachedGupshupTemplates = unstable_cache(
  (): Promise<ListGupshupTemplatesResult> => listGupshupTemplates(),
  ["whatsapp:gupshupTemplates"],
  { revalidate: 60 },
);

export const GUPSHUP_LIST_ERRORS: Record<
  Exclude<ListGupshupTemplatesResult, { ok: true }>["reason"],
  string
> = {
  NOT_CONFIGURED:
    "Can't read templates from Gupshup: GUPSHUP_API_KEY or GUPSHUP_APP_ID is missing. Ask the developer to add them.",
  REJECTED_KEY:
    "Gupshup refused the API key. Check GUPSHUP_API_KEY matches the key on the app's page in Gupshup.",
  UNAVAILABLE: "Couldn't reach Gupshup just now. Try again in a minute.",
};
