"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PendingSpinner } from "./PendingSpinner";
import {
  LayoutDashboard,
  Settings,
  Package,
  Tags,
  Warehouse,
  ShoppingCart,
  Undo2,
  Ticket,
  FileText,
  Newspaper,
  Star,
  LayoutList,
  Mail,
  ListChecks,
  UserCog,
  ShieldCheck,
  UsersRound,
  ScrollText,
  FileSearch,
  BarChart3,
  Scale,
  type LucideIcon,
} from "lucide-react";

// Icons are referenced by name because AdminNav's props come from a Server
// Component (layout.tsx) and component functions can't cross that boundary.
const ICONS = {
  LayoutDashboard,
  Settings,
  Package,
  Tags,
  Warehouse,
  ShoppingCart,
  Undo2,
  Ticket,
  FileText,
  Newspaper,
  Star,
  LayoutList,
  Mail,
  ListChecks,
  UserCog,
  ShieldCheck,
  UsersRound,
  ScrollText,
  FileSearch,
  BarChart3,
  Scale,
} satisfies Record<string, LucideIcon>;

export type AdminNavIconName = keyof typeof ICONS;

export interface AdminNavItem {
  label: string;
  href: string;
  icon: AdminNavIconName;
}

export interface AdminNavGroup {
  /** Small heading above the group. Omit for the top, unlabelled group. */
  label?: string;
  items: readonly AdminNavItem[];
}

/** How well a nav link matches the current address, or -1 for no match.
 * Longer, more specific links win, so "Review placements" does not also
 * light up "Reviews". */
function matchScore(
  href: string,
  pathname: string,
  tab: string | null,
): number {
  const [path = "", query] = href.split("?");
  const linkTab = query ? new URLSearchParams(query).get("tab") : null;
  const onPath =
    path === "/"
      ? pathname === "/"
      : pathname === path || pathname.startsWith(`${path}/`);
  if (!onPath) return -1;
  if (linkTab && linkTab !== tab) return -1;
  return path.length + (linkTab ? 1 : 0);
}

function NavLinks({ groups }: { groups: readonly AdminNavGroup[] }) {
  const pathname = usePathname();
  const tab = useSearchParams().get("tab");

  let best = -1;
  let bestHref = "";
  for (const group of groups) {
    for (const item of group.items) {
      const score = matchScore(item.href, pathname, tab);
      if (score > best) {
        best = score;
        bestHref = item.href;
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group, index) => (
        <div key={group.label ?? index} className="flex flex-col gap-0.5">
          {group.label ? (
            <p className="px-3 pb-1 text-[0.6875rem] uppercase tracking-widest text-onwei-beige/50">
              {group.label}
            </p>
          ) : null}
          {group.items.map((item) => {
            const Icon = ICONS[item.icon];
            const active = item.href === bestHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-onwei-beige/15 font-medium text-onwei-white"
                    : "text-onwei-beige/80 hover:bg-onwei-beige/10 hover:text-onwei-white"
                }`}
              >
                <Icon size={15} aria-hidden className="shrink-0" />
                {item.label}
                <PendingSpinner />
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function AdminNav({ groups }: { groups: readonly AdminNavGroup[] }) {
  // useSearchParams needs a Suspense boundary; the plain links render first.
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4">
          {groups.flatMap((g) =>
            g.items.map((item) => (
              <Link key={item.href} href={item.href} className="px-3 text-sm">
                {item.label}
              </Link>
            )),
          )}
        </div>
      }
    >
      <NavLinks groups={groups} />
    </Suspense>
  );
}
