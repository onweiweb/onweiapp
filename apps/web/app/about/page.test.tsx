import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getSiteSetting } from "@onwei/core";
import AboutPage from "./page";

// AboutPage is an async Server Component that reads real site settings via
// @onwei/core, so this needs a real DATABASE_URL — same convention as
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
