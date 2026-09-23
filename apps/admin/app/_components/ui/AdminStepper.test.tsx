import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminStepper } from "./AdminStepper";

const steps = [
  { id: "one", label: "Step One", content: <p>Content one</p> },
  { id: "two", label: "Step Two", content: <p>Content two</p> },
];

describe("AdminStepper", () => {
  it("starts on the first step and shows Next, not the submit button", () => {
    render(<AdminStepper steps={steps} submitLabel="Save" />);
    expect(screen.getByText("Content one")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Save" }),
    ).not.toBeInTheDocument();
  });

  it("blocks Next while the active step reports canAdvance: false", () => {
    const gatedSteps = [{ ...steps[0], canAdvance: false }, steps[1]];
    render(<AdminStepper steps={gatedSteps} submitLabel="Save" />);
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("advances to the next step and reveals the submit button on the last step", () => {
    render(<AdminStepper steps={steps} submitLabel="Save" />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Content two")).toBeInTheDocument();
    expect(screen.queryByText("Content one")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("goes back to the previous step", () => {
    render(<AdminStepper steps={steps} submitLabel="Save" />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Content one")).toBeInTheDocument();
  });
});
