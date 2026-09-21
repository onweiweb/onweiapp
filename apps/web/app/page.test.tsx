import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

// HomePage is an async Server Component that queries real catalog data via
// @onwei/core, so this needs a real DATABASE_URL — same convention as the
// integration tests in packages/core and packages/database.
describe.skipIf(!process.env.DATABASE_URL)("HomePage", () => {
  it("renders a main landmark", async () => {
    render(await HomePage());
    expect(screen.getByRole("main")).toBeInTheDocument();
  });
});
