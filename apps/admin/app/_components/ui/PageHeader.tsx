import Link from "next/link";

/**
 * Top of every admin page: where you are, what the page is for, and the main
 * thing you can do here. Keeps titles, spacing and the primary button in the
 * same place on every screen.
 */
export function PageHeader({
  title,
  description,
  back,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** A link to the list this page belongs to, shown above the title. */
  back?: { href: string; label: string };
  /** Usually one primary button. Sits on the right, wraps on small screens. */
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-b border-onwei-blue/10 pb-4">
      <div className="flex min-w-0 flex-col gap-1">
        {back ? (
          <Link
            href={back.href}
            className="w-fit text-xs uppercase tracking-wide text-onwei-blue/60 hover:text-onwei-blue"
          >
            &larr; {back.label}
          </Link>
        ) : null}
        <h1 className="font-display text-2xl font-semibold uppercase leading-tight">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm text-onwei-blue/70">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
