import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
  it("renders a main landmark", () => {
    render(<HomePage />);
    expect(screen.getByRole("main")).toBeInTheDocument();
  });
});
