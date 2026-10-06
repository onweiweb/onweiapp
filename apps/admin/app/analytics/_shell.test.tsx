import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { AnalyticsShell, FilterLink, ReportArea } from "./_shell";

beforeEach(() => push.mockReset());

function setup() {
  render(
    <AnalyticsShell>
      <FilterLink href="/analytics?days=7" current className="x">
        Last 7 days
      </FilterLink>
      <FilterLink href="/analytics?days=30" current={false} className="x">
        Last 30 days
      </FilterLink>
      <ReportArea>
        <p>Real numbers</p>
      </ReportArea>
    </AnalyticsShell>,
  );
}

describe("analytics filters", () => {
  it("shows the report when nothing is loading", () => {
    setup();
    expect(screen.getByText("Real numbers")).toBeTruthy();
  });

  it("navigates in a transition when another filter is clicked", () => {
    setup();
    fireEvent.click(screen.getByText("Last 30 days"));
    expect(push).toHaveBeenCalledWith("/analytics?days=30");
  });

  it("does nothing when the current filter is clicked", () => {
    setup();
    fireEvent.click(screen.getByText("Last 7 days"));
    expect(push).not.toHaveBeenCalled();
  });

  it("leaves new-tab clicks to the browser", () => {
    setup();
    fireEvent.click(screen.getByText("Last 30 days"), { metaKey: true });
    expect(push).not.toHaveBeenCalled();
  });
});
