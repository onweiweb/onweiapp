import { parseJsonBody } from "@onwei/core";
import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

// Only tags the storefront actually caches under (apps/web/lib/cachedCatalog.ts).
// An unknown tag is a caller bug, not something to silently accept.
const bodySchema = z.object({
  tag: z.enum(["catalog"]).default("catalog"),
});

function isAuthorized(header: string | null, secret: string | undefined) {
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  // Constant-time compare so the secret can't be recovered by timing.
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// apps/admin pings this after any catalog mutation so the edit shows up
// immediately instead of waiting out cachedCatalog's 60s window (see
// apps/web/lib/cachedCatalog.ts). Only this process can call revalidateTag
// on its own Data Cache, admin runs as a separate Next process/deployment
// and has no way to reach into this one directly, hence the HTTP hop.
export async function POST(request: Request) {
  if (
    !isAuthorized(
      request.headers.get("authorization"),
      process.env.REVALIDATE_SECRET,
    )
  ) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  // The body is optional for this caller (a bare ping means "catalog").
  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok && parsed.kind === "INVALID") {
    return NextResponse.json(
      { ok: false, error: "Unknown cache tag." },
      { status: 400 },
    );
  }
  const tag = parsed.ok ? parsed.data.tag : "catalog";

  // This call comes from outside a Server Action (admin's own process,
  // over HTTP), so updateTag isn't available and the recommended "max"
  // profile doesn't fit either - that's a one-year stale-while-revalidate
  // window meant for in-app mutations, not "make this gone now." { expire:
  // 0 } is what Next's own docs recommend for exactly this case: an
  // external caller (webhook/other service) that needs the data gone
  // immediately (see revalidateTag.md's "Route Handler" example).
  revalidateTag(tag, { expire: 0 });
  return NextResponse.json({ ok: true, revalidated: tag });
}
