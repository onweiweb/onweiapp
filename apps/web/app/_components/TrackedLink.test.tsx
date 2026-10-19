import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const track = vi.fn();
vi.mock("../../lib/analytics/track", () => ({
  track: (...args: unknown[]) => track(...args),
}));

import { TrackedLink } from "./TrackedLink";

describe("TrackedLink", () => {
  beforeEach(() => track.mockReset());

  it("sends its event when clicked", () => {
    render(
      <TrackedLink
        href="/journal"
        analytics={{
          event: "blog_nav_clicked",
          props: { target: "all_blogs", source: "home" },
        }}
      >
        All
      </TrackedLink>,
    );
    fireEvent.click(screen.getByText("All"));
    expect(track).toHaveBeenCalledWith("blog_nav_clicked", {
      target: "all_blogs",
      source: "home",
    });
  });

  it("is a plain link without an event", () => {
    render(<TrackedLink href="/x">Go</TrackedLink>);
    fireEvent.click(screen.getByText("Go"));
    expect(track).not.toHaveBeenCalled();
  });
});
