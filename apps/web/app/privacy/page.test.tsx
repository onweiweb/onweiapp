import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ensureLegalPages, getLegalPage } from "@onwei/core";
import { LegalPageView } from "@/_components/LegalPageView";

// The header and footer are async Server Components, which Testing Library
// can't render, and they aren't what's under test here.
vi.mock("@/_components/SiteHeader", () => ({ SiteHeader: () => null }));
vi.mock("@/_components/SiteFooter", () => ({ SiteFooter: () => null }));
vi.mock("@/_components/WaitlistHeader", () => ({ WaitlistHeader: () => null }));
vi.mock("@/_components/WaitlistFooter", () => ({ WaitlistFooter: () => null }));

// Reads real DB content, so this needs a real DATABASE_URL, same convention
// as about/page.test.tsx.
describe.skipIf(!process.env.DATABASE_URL)("legal pages", () => {
  it("renders the Privacy Policy with its points", async () => {
    await ensureLegalPages();
    const page = await getLegalPage("privacy");
    render(await LegalPageView({ page: page! }));
    expect(
      screen.getByRole("heading", { level: 1, name: /privacy policy/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/what we collect/i)).toBeInTheDocument();
  });

  it("renders the Terms and Conditions with its points", async () => {
    await ensureLegalPages();
    const page = await getLegalPage("terms");
    render(await LegalPageView({ page: page! }));
    expect(
      screen.getByRole("heading", { level: 1, name: /terms and conditions/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/returns and refunds/i)).toBeInTheDocument();
  });
});
