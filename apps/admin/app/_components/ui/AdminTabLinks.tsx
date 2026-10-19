import Link from "next/link";

export interface AdminTabLink {
  id: string;
  label: string;
}

/**
 * Tabs that are real links (`?tab=id`). Only the open tab's page is built, so
 * a page with many sections stays fast, and a refresh or a shared link opens
 * the same tab.
 */
export function AdminTabLinks({
  basePath,
  tabs,
  active,
}: {
  basePath: string;
  tabs: readonly AdminTabLink[];
  active: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Sections"
      className="flex flex-wrap gap-1 border-b border-onwei-blue/10"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={`${basePath}?tab=${tab.id}`}
            role="tab"
            aria-selected={isActive}
            className={`-mb-px border-b-2 px-4 py-2 font-cta text-sm uppercase tracking-wide transition-colors ${
              isActive
                ? "border-onwei-blue text-onwei-blue"
                : "border-transparent text-onwei-blue/60 hover:text-onwei-blue"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
