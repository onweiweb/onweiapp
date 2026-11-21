import { describe, expect, it } from "vitest";
import {
  failureCodeOf,
  failureKindOf,
  failureMessage,
  groupFailures,
} from "./failures";

describe("failureCodeOf", () => {
  it("reads Meta's code in the shapes Gupshup sends", () => {
    expect(
      failureCodeOf(
        "131049: This message was not delivered, (#131049) In order to...",
      ),
    ).toBe("131049");
    expect(failureCodeOf("null, (#429) Rate limit hit")).toBe("429");
    expect(failureCodeOf("131026: Message undeliverable")).toBe("131026");
    expect(failureCodeOf("Gupshup said 429: too many")).toBe("429");
    expect(failureCodeOf("Timed out")).toBeNull();
    expect(failureCodeOf(null)).toBeNull();
  });
});

describe("failureKindOf and failureMessage", () => {
  it("sorts codes into kinds", () => {
    expect(failureKindOf("131049")).toBe("HELD");
    expect(failureKindOf("130472")).toBe("HELD");
    expect(failureKindOf("429")).toBe("RATE_LIMIT");
    expect(failureKindOf("131026")).toBe("UNDELIVERABLE");
    expect(failureKindOf("132000")).toBe("TEMPLATE");
    expect(failureKindOf("999")).toBe("OTHER");
    expect(failureKindOf(null)).toBe("OTHER");
  });

  it("gives plain words, falling back to WhatsApp's own", () => {
    expect(failureMessage("131026", "x")).toMatch(/not be on WhatsApp/);
    expect(failureMessage(null, "null, Something odd")).toBe("Something odd");
    expect(failureMessage(null, "Timed out")).toMatch(/Couldn't reach Gupshup/);
    expect(failureMessage(null, null)).toBe("No reason given");
  });
});

describe("groupFailures", () => {
  it("merges by code, leaves out Meta's holds, most common first", () => {
    const groups = groupFailures([
      {
        failureCode: "429",
        failureReason: "null, (#429) Rate limit hit",
        _count: { _all: 2 },
      },
      {
        failureCode: "429",
        failureReason: "Rate limit hit, (#429)",
        _count: { _all: 3 },
      },
      { failureCode: "131049", failureReason: "held", _count: { _all: 9 } },
      { failureCode: null, failureReason: "Odd thing", _count: { _all: 1 } },
    ]);
    expect(groups.map((g) => [g.code, g.count])).toEqual([
      ["429", 5],
      [null, 1],
    ]);
    expect(groups[1]!.message).toBe("Odd thing");
  });
});
