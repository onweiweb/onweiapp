// DashboardPage is an async Server Component (queries prisma directly) —
// React can't render those through RTL's normal render() outside Next's own
// RSC runtime (same issue as apps/web's ProductGridSection, see
// docs/PHASE_1_SCAFFOLD_PROGRESS.md). Awaiting the component function
// directly and rendering its resolved element works around that.
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DashboardPage from "./page";

describe.skipIf(!process.env.DATABASE_URL)("DashboardPage", () => {
  it("renders a main landmark with either real counts or an explained empty state", async () => {
    const element = await DashboardPage();
    render(element);

    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    // The shared dev DB has real seeded categories/products, so this always
    // renders the counts branch in practice — but either branch is valid.
    const hasCounts = screen.queryByText(/live products/i);
    const hasEmptyState = screen.queryByText(/nothing to show yet/i);
    expect(hasCounts ?? hasEmptyState).not.toBeNull();
  });
});
