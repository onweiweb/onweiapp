import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const refreshRouter = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: refreshRouter }),
}));
const refreshAnalytics = vi.fn();
vi.mock("./_actions", () => ({
  refreshAnalytics: () => refreshAnalytics(),
}));

import { act } from "@testing-library/react";
import {
  AnalyticsShell,
  FilterLink,
  RefreshButton,
  ReportArea,
} from "./_shell";

beforeEach(() => {
  push.mockReset();
  refreshRouter.mockReset();
  refreshAnalytics.mockReset();
});

function setup() {
  render(
    <AnalyticsShell>
      <FilterLink href="/analytics?days=7" current className="x">
        Last 7 days
      </FilterLink>
      <FilterLink href="/analytics?days=30" current={false} className="x">
        Last 30 days
      </FilterLink>
      <RefreshButton />
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

  it("reloads the page after a refresh", async () => {
    refreshAnalytics.mockResolvedValue({ ok: true });
    setup();
    await act(async () => {
      fireEvent.click(screen.getByText("Refresh numbers"));
    });
    expect(refreshRouter).toHaveBeenCalled();
  });

  it("shows the message and keeps the old numbers when a refresh is refused", async () => {
    refreshAnalytics.mockResolvedValue({
      ok: false,
      message: "Wait a minute and try again.",
    });
    setup();
    await act(async () => {
      fireEvent.click(screen.getByText("Refresh numbers"));
    });
    expect(screen.getByRole("alert").textContent).toContain("Wait a minute");
    expect(refreshRouter).not.toHaveBeenCalled();
    expect(screen.getByText("Real numbers")).toBeTruthy();
  });
});
