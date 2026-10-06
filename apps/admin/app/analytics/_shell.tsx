"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useState, useTransition } from "react";
import { refreshAnalytics } from "./_actions";
import { SECTION_TITLES, SectionSkeleton } from "./_skeleton";

interface ShellState {
  pending: boolean;
  pendingHref: string | null;
  navigate: (href: string) => void;
  refresh: () => void;
}

const ShellContext = createContext<ShellState | null>(null);

function useShell(): ShellState {
  const value = useContext(ShellContext);
  if (!value) throw new Error("Used outside AnalyticsShell");
  return value;
}

/**
 * Owns the "a filter was clicked and the new numbers are on their way"
 * state. React keeps old content on screen during a navigation, which reads
 * as the page being stuck, so the report area swaps to placeholders the
 * moment this is pending.
 */
export function AnalyticsShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const navigate = (href: string) => {
    setPendingHref(href);
    startTransition(() => {
      router.push(href);
    });
  };

  const refresh = () => {
    setPendingHref(null);
    startTransition(async () => {
      await refreshAnalytics();
      router.refresh();
    });
  };

  return (
    <ShellContext.Provider
      value={{
        pending,
        pendingHref: pending ? pendingHref : null,
        navigate,
        refresh,
      }}
    >
      {children}
    </ShellContext.Provider>
  );
}

/** A filter link that shows a spinner while its numbers load. */
export function FilterLink({
  href,
  className,
  current,
  children,
}: {
  href: string;
  className: string;
  current: boolean;
  children: React.ReactNode;
}) {
  const { navigate, pendingHref } = useShell();
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={className}
      onClick={(event) => {
        // Let new-tab and modified clicks behave normally.
        if (
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        )
          return;
        event.preventDefault();
        if (!current) navigate(href);
      }}
    >
      {children}
      {pendingHref === href ? (
        <span
          role="status"
          aria-label="Loading"
          className="inline-block h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
    </Link>
  );
}

/** Shows the real report, or placeholders while a filter change is loading. */
export function ReportArea({ children }: { children: React.ReactNode }) {
  const { pending } = useShell();
  if (!pending) return <>{children}</>;
  return (
    <div aria-busy="true" className="flex flex-col gap-8">
      {SECTION_TITLES.map((title) => (
        <SectionSkeleton key={title} title={title} />
      ))}
    </div>
  );
}

/** Fetches fresh numbers instead of waiting for the saved ones to expire. */
export function RefreshButton() {
  const { refresh, pending } = useShell();
  return (
    <button
      type="button"
      onClick={refresh}
      disabled={pending}
      className="flex items-center gap-2 rounded-[30px] border border-onwei-blue/25 px-4 py-1.5 text-sm disabled:opacity-60"
    >
      {pending ? "Refreshing..." : "Refresh numbers"}
    </button>
  );
}
