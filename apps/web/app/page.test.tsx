import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HomePage from "./page";

// SiteFooter is an async Server Component (it reads site settings), which
// RTL's client render can't resolve. This test only checks the main landmark,
// so a sync stub is enough.
vi.mock("@/_components/SiteFooter", () => ({
  SiteFooter: () => <footer />,
}));

// HomePage is an async Server Component that queries real catalog data via
// @onwei/core, so this needs a real DATABASE_URL, same convention as the
// integration tests in packages/core and packages/database.
describe.skipIf(!process.env.DATABASE_URL)("HomePage", () => {
  it("renders a main landmark", async () => {
    render(await HomePage());
    expect(screen.getByRole("main")).toBeInTheDocument();
  });
});
