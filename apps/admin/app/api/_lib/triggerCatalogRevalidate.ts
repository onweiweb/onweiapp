// Best-effort ping to the storefront so a catalog edit shows up right away
// instead of waiting out cachedCatalog's 60s window
// (apps/web/lib/cachedCatalog.ts). Admin and web run as separate Next
// processes/deployments with no shared cache to reach into directly, so
// this is the only path from an admin mutation to web's Data Cache.
// Missing env vars, the storefront being down, or a network hiccup here
// never blocks the admin mutation itself — the 60s fallback still applies
// either way, so failures are logged and swallowed, not thrown.
export async function triggerCatalogRevalidate(
  tag: string = "catalog",
): Promise<void> {
  const webAppUrl = process.env.WEB_APP_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!webAppUrl || !secret) return;

  try {
    await fetch(`${webAppUrl}/api/revalidate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ tag }),
    });
  } catch (error) {
    console.error("catalog revalidate ping failed", error);
  }
}
