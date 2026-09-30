import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

// apps/admin pings this after any catalog mutation so the edit shows up
// immediately instead of waiting out cachedCatalog's 60s window (see
// apps/web/lib/cachedCatalog.ts). Only this process can call revalidateTag
// on its own Data Cache — admin runs as a separate Next process/deployment
// and has no way to reach into this one directly, hence the HTTP hop.
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    tag?: unknown;
  } | null;
  const tag = typeof body?.tag === "string" ? body.tag : "catalog";

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
