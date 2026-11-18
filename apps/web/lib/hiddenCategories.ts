// Pre-order mode hides categories with nothing on pre-order from every menu,
// tab and footer link (owner decision 2026-11-18). Outside pre-order mode
// the list is empty and every link shows as designed.

/** False for a `/collection/<slug>` link whose category is hidden. */
export function showsCategoryLink(
  href: string,
  hiddenSlugs: readonly string[],
): boolean {
  const match = /^\/collection\/([^/?#]+)/.exec(href);
  return !match?.[1] || !hiddenSlugs.includes(match[1]);
}
