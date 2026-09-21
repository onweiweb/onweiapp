import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DashboardPage from "./page";

describe("DashboardPage", () => {
  it("renders a main landmark with an explained empty state", () => {
    render(<DashboardPage />);
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByText(/nothing to show yet/i)).toBeInTheDocument();
  });
});
