import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ExpandableBio, truncateAtWord } from "./ExpandableBio";

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Element.prototype.scrollIntoView = vi.fn();
});

describe("truncateAtWord", () => {
  it("returns short text untouched", () => {
    expect(truncateAtWord("hello world", 50)).toBe("hello world");
  });

  it("cuts at the last word boundary and adds an ellipsis", () => {
    const out = truncateAtWord("one two three four", 10);
    expect(out).toBe("one two…");
  });
});

describe("ExpandableBio", () => {
  const long = Array.from({ length: 60 }, (_, i) => `word${i}`).join(" ");

  it("shows no toggle when the copy fits in the limit", () => {
    render(<ExpandableBio paragraphs={["short bio"]} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("toggles between Read more and Read less", () => {
    render(<ExpandableBio paragraphs={[long]} limit={100} />);
    const button = screen.getByRole("button", { name: "Read more" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(button);
    const less = screen.getByRole("button", { name: "Read less" });
    expect(less.getAttribute("aria-expanded")).toBe("true");
  });

  it("keeps the full text in the DOM for desktop and crawlers", () => {
    render(<ExpandableBio paragraphs={[long]} limit={100} />);
    expect(screen.getAllByText(long).length).toBeGreaterThan(0);
  });
});
