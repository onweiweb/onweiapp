import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const capture = vi.fn();
vi.mock("posthog-js", () => ({
  default: { capture: (...a: unknown[]) => capture(...a) },
}));

import { markAnalyticsReady } from "./track";
import { useFormTracking } from "./useFormTracking";

const FIELDS = ["name", "email", "phone"] as const;

beforeEach(() => {
  capture.mockReset();
  markAnalyticsReady();
});

const names = () => capture.mock.calls.map((c) => c[0]);

describe("useFormTracking", () => {
  it("sends form_started once and field events with an index, never a value", () => {
    const { result } = renderHook(() => useFormTracking("waitlist", FIELDS));
    act(() => {
      result.current.focus("name");
      result.current.blur("name", true);
      result.current.focus("email");
    });
    expect(names().filter((n) => n === "form_started")).toHaveLength(1);
    expect(capture).toHaveBeenCalledWith("field_completed", {
      form_name: "waitlist",
      field: "name",
      field_index: 0,
    });
    expect(JSON.stringify(capture.mock.calls)).not.toMatch(/@|\d{10}/);
  });

  it("does not report a field with no value as completed", () => {
    const { result } = renderHook(() => useFormTracking("waitlist", FIELDS));
    act(() => {
      result.current.focus("name");
      result.current.blur("name", false);
    });
    expect(names()).not.toContain("field_completed");
  });

  it("reports the last touched field once when the person leaves", () => {
    const { result, unmount } = renderHook(() =>
      useFormTracking("waitlist", FIELDS),
    );
    act(() => {
      result.current.focus("name");
      result.current.focus("phone");
    });
    unmount();
    const abandoned = capture.mock.calls.filter(
      (c) => c[0] === "form_abandoned",
    );
    expect(abandoned).toEqual([
      ["form_abandoned", { form_name: "waitlist", last_field: "phone" }],
    ]);
  });

  it("reports nothing as abandoned after a successful submit", () => {
    const { result, unmount } = renderHook(() =>
      useFormTracking("waitlist", FIELDS),
    );
    act(() => {
      result.current.focus("name");
      result.current.submitAttempt();
      result.current.submitSuccess();
    });
    unmount();
    expect(names()).not.toContain("form_abandoned");
    expect(names()).toContain("submit_success");
  });
});
