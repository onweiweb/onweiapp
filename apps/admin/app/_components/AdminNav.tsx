"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import type { LucideIcon } from "lucide-react";

export interface AdminNavGroup {
  label: string;
  icon: LucideIcon;
  items: readonly { label: string; href: string; icon: LucideIcon }[];
}

/**
 * Sections default collapsed — only a label explicitly expanded before
 * (persisted here) starts open on a later visit. useSyncExternalStore reads
 * localStorage safely: the server snapshot is always "collapsed" (no
 * window on the server), and the real per-viewer value takes over after
 * hydration with no mismatch warning — the pattern React designed this
 * hook for, instead of setting state from inside an effect.
 */
const STORAGE_KEY_PREFIX = "onwei-admin-nav-expanded:";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getExpandedSnapshot(label: string): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY_PREFIX + label) === "1";
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

function setExpanded(label: string, expanded: boolean) {
  try {
    if (expanded) {
      window.localStorage.setItem(STORAGE_KEY_PREFIX + label, "1");
    } else {
      window.localStorage.removeItem(STORAGE_KEY_PREFIX + label);
    }
  } catch {
    // localStorage unavailable (private window, blocked storage) — expanded
    // state just won't persist, section still works collapsed by default.
  }
  listeners.forEach((listener) => listener());
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      width={10}
      height={10}
      aria-hidden="true"
      className={`transition-transform ${expanded ? "rotate-180" : ""}`}
    >
      <path
        d="M2.5 4.5L6 8l3.5-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NavSection({ group }: { group: AdminNavGroup }) {
  const expanded = useSyncExternalStore(
    subscribe,
    () => getExpandedSnapshot(group.label),
    getServerSnapshot,
  );
  const GroupIcon = group.icon;

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(group.label, !expanded)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between px-3 pb-1 text-left text-sm uppercase tracking-wide text-onwei-beige/50 hover:text-onwei-beige/80"
      >
        <span className="flex items-center gap-2">
          <GroupIcon size={14} aria-hidden />
          {group.label}
        </span>
        <ChevronIcon expanded={expanded} />
      </button>
      {expanded ? (
        <ul className="flex flex-col gap-1 pl-2">
          {group.items.map((item) => {
            const ItemIcon = item.icon;
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="flex items-center gap-2 rounded-[30px] px-3 py-1.5 text-xs uppercase tracking-wide hover:bg-onwei-green hover:text-onwei-blue"
                >
                  <ItemIcon size={14} aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export function AdminNav({ groups }: { groups: readonly AdminNavGroup[] }) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <NavSection key={group.label} group={group} />
      ))}
    </div>
  );
}
