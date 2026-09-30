import Link from "next/link";

/**
 * Previous/Next links for a paged list. Keeps the other query params (search,
 * filters) and only changes `page`. Renders nothing when there is one page.
 */
export function AdminPager({
  pathname,
  page,
  hasNext,
  params = {},
}: {
  pathname: string;
  page: number;
  hasNext: boolean;
  params?: Record<string, string | undefined>;
}) {
  if (page <= 1 && !hasNext) return null;

  const hrefFor = (target: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) query.set(key, value);
    }
    if (target > 1) query.set("page", String(target));
    const qs = query.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const linkClass = "text-sm font-medium text-onwei-blue underline";
  const mutedClass = "text-sm text-onwei-blue/40";

  return (
    <nav aria-label="Pages" className="flex items-center gap-4">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={linkClass}>
          Previous
        </Link>
      ) : (
        <span className={mutedClass}>Previous</span>
      )}
      <span className="text-sm text-onwei-blue/70">Page {page}</span>
      {hasNext ? (
        <Link href={hrefFor(page + 1)} className={linkClass}>
          Next
        </Link>
      ) : (
        <span className={mutedClass}>Next</span>
      )}
    </nav>
  );
}
