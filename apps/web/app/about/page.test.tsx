import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getSiteSetting } from "@onwei/core";
import AboutPage from "./page";

// SiteHeader and SiteFooter are async Server Components, which RTL's client
// render can't resolve. The checks below are all in the page body.
vi.mock("@/_components/SiteHeader", () => ({
  SiteHeader: () => <header />,
}));
vi.mock("@/_components/SiteFooter", () => ({
  SiteFooter: () => <footer />,
}));

// AboutPage is an async Server Component that reads real site settings via
// @onwei/core, so this needs a real DATABASE_URL, same convention as
// apps/web/app/page.test.tsx.
describe.skipIf(!process.env.DATABASE_URL)("AboutPage", () => {
  it("renders chrome matching the current site mode", async () => {
    const { siteMode } = await getSiteSetting();
    render(await AboutPage());
    expect(screen.getByRole("main")).toBeInTheDocument();

    if (siteMode === "WAITLIST") {
      expect(
        screen.getAllByRole("link", { name: /join the movement/i }).length,
      ).toBeGreaterThan(0);
      expect(
        screen.queryByText(/read sabhya's substack/i),
      ).not.toBeInTheDocument();
    } else {
      expect(
        screen.getByRole("link", { name: /explore the collection/i }),
      ).toBeInTheDocument();
      expect(screen.getByText(/read sabhya's substack/i)).toBeInTheDocument();
    }
  });
});
