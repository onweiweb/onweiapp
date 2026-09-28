import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// unstable_cache (apps/web/lib/cachedCatalog.ts) requires Next's
// request-scoped incrementalCache, which doesn't exist when a Server
// Component is rendered directly in a Vitest test rather than through an
// actual Next dev/build server -- it throws "Invariant: incrementalCache
// missing" otherwise. Tests need the wrapped function's return value, not
// real caching, so this replaces it with a plain passthrough.
vi.mock("next/cache", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/cache")>();
  return {
    ...actual,
    unstable_cache:
      <Args extends unknown[], R>(fn: (...args: Args) => Promise<R>) =>
      (...args: Args) =>
        fn(...args),
  };
});

afterEach(() => {
  cleanup();
});
