import { describe, expect, it } from "vitest";
import { formatLegalBody } from "./formatLegalBody";

describe("formatLegalBody", () => {
  it("splits paragraphs on blank lines", () => {
    expect(formatLegalBody("One.\n\nTwo.")).toEqual([
      { type: "paragraph", text: "One." },
      { type: "paragraph", text: "Two." },
    ]);
  });

  it("groups bullet lines into one list and keeps the intro line", () => {
    expect(formatLegalBody("We collect:\n- Name\n- Email\nThanks.")).toEqual([
      { type: "paragraph", text: "We collect:" },
      { type: "list", items: ["Name", "Email"] },
      { type: "paragraph", text: "Thanks." },
    ]);
  });

  it("joins single line breaks and ignores empty input", () => {
    expect(formatLegalBody("a\nb")).toEqual([
      { type: "paragraph", text: "a b" },
    ]);
    expect(formatLegalBody("  \n ")).toEqual([]);
  });
});
