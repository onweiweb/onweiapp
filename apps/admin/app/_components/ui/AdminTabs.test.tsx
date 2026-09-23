import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminTabs } from "./AdminTabs";

const tabs = [
  { id: "a", label: "Tab A", content: <p>Content A</p> },
  { id: "b", label: "Tab B", content: <p>Content B</p> },
];

describe("AdminTabs", () => {
  it("shows the first tab's content by default", () => {
    render(<AdminTabs tabs={tabs} />);
    expect(screen.getByText("Content A")).toBeInTheDocument();
    expect(screen.queryByText("Content B")).not.toBeInTheDocument();
  });

  it("honors defaultActive", () => {
    render(<AdminTabs tabs={tabs} defaultActive="b" />);
    expect(screen.getByText("Content B")).toBeInTheDocument();
  });

  it("switches content when a tab is clicked, without any gating", () => {
    render(<AdminTabs tabs={tabs} />);
    fireEvent.click(screen.getByRole("tab", { name: "Tab B" }));
    expect(screen.getByText("Content B")).toBeInTheDocument();
    expect(screen.queryByText("Content A")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Tab A" }));
    expect(screen.getByText("Content A")).toBeInTheDocument();
  });
});
