// Groups URLs into the page types the admin reports on. Mirrors PAGE_TYPES in
// packages/core/src/analytics/queries.ts.
export function pageTypeFromPath(pathname: string): string {
  if (pathname === "/") return "home";
  const first = pathname.split("/")[1] ?? "";
  switch (first) {
    case "ontheway":
      return "waitlist";
    case "collection":
    case "product":
    case "about":
    case "journal":
    case "login":
      return first;
    default:
      return "other";
  }
}
