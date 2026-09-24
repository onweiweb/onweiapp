import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminSlider } from "./AdminSlider";

describe("AdminSlider", () => {
  it("shows the raw value by default", () => {
    render(<AdminSlider min={1} max={8} value={3} onChange={() => {}} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows a formatted value when formatValue is given", () => {
    render(
      <AdminSlider
        min={1}
        max={8}
        value={3}
        onChange={() => {}}
        formatValue={(value) => `${value} of 4 approved reviews`}
      />,
    );
    expect(screen.getByText("3 of 4 approved reviews")).toBeInTheDocument();
  });

  it("calls onChange with the new numeric value when dragged", () => {
    const onChange = vi.fn();
    render(<AdminSlider min={1} max={8} value={3} onChange={onChange} />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "5" } });
    expect(onChange).toHaveBeenCalledWith(5);
  });
});
