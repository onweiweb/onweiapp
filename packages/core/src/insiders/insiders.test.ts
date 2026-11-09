import { describe, expect, it } from "vitest";
import {
  generateInsiderCode,
  isInsiderCodeFormat,
  normalizeCode,
} from "./insiderCode";
import { createInsiderLinkToken, verifyInsiderLinkToken } from "./insiderLink";
import {
  findTierFor,
  istDateOf,
  istDayStart,
  istLastDayOf,
  isValidPercent,
  resolveInsiderPercent,
  type InsiderTierSummary,
} from "./insiderTiers";

const SECRET = "x".repeat(40);

describe("insider codes", () => {
  it("is WEI plus four digits", () => {
    expect(generateInsiderCode(() => 7820)).toBe("WEI7820");
    for (let i = 0; i < 200; i++) {
      expect(generateInsiderCode()).toMatch(/^WEI[1-9]\d{3}$/);
    }
  });

  it("normalizes what a customer types", () => {
    expect(normalizeCode(" wei 7820 ")).toBe("WEI7820");
    expect(isInsiderCodeFormat("wei7820")).toBe(true);
    expect(isInsiderCodeFormat("WEI782")).toBe(false);
    expect(isInsiderCodeFormat("SAVE10")).toBe(false);
  });
});

describe("insider tiers", () => {
  it("reads dates as whole days in India time", () => {
    expect(istDayStart("2026-10-01")?.toISOString()).toBe(
      "2026-09-30T18:30:00.000Z",
    );
    expect(istDayStart("2026-02-31")).toBeNull();
    expect(istDayStart("1 Oct")).toBeNull();
    expect(istDateOf(new Date("2026-09-30T18:30:00.000Z"))).toBe("2026-10-01");
    expect(istDateOf(new Date("2026-09-30T18:29:59.000Z"))).toBe("2026-09-30");
    expect(istLastDayOf(new Date("2026-10-15T18:30:00.000Z"))).toBe(
      "2026-10-15",
    );
  });

  const tiers: InsiderTierSummary[] = [
    {
      id: "a",
      label: "First week",
      startsAt: istDayStart("2026-10-01") as Date,
      endsAt: istDayStart("2026-10-08") as Date,
      percent: 15,
    },
    {
      id: "b",
      label: "Second week",
      startsAt: istDayStart("2026-10-08") as Date,
      endsAt: istDayStart("2026-10-15") as Date,
      percent: 10,
    },
  ];

  it("gives a member their tier's percent, else the default", () => {
    // 7 Oct 23:59 IST is still the first week.
    expect(
      resolveInsiderPercent(new Date("2026-10-07T18:29:00Z"), tiers, 5),
    ).toBe(15);
    // 8 Oct 00:00 IST is the second week (end is exclusive).
    expect(
      resolveInsiderPercent(new Date("2026-10-07T18:30:00Z"), tiers, 5),
    ).toBe(10);
    expect(
      resolveInsiderPercent(new Date("2026-11-01T00:00:00Z"), tiers, 5),
    ).toBe(5);
    expect(findTierFor(new Date("2026-09-01T00:00:00Z"), tiers)).toBeNull();
  });

  it("only allows whole percentages from 1 to 90", () => {
    expect(isValidPercent(5)).toBe(true);
    expect(isValidPercent(0)).toBe(false);
    expect(isValidPercent(5.5)).toBe(false);
    expect(isValidPercent(91)).toBe(false);
  });
});

describe("insider links", () => {
  const now = new Date("2026-11-09T00:00:00Z");

  it("round-trips for the same purpose", () => {
    const token = createInsiderLinkToken("address", "entry1", SECRET, now);
    expect(verifyInsiderLinkToken("address", token, SECRET, now)).toEqual({
      ok: true,
      entryId: "entry1",
    });
  });

  it("rejects another purpose, a changed id, and a wrong secret", () => {
    const token = createInsiderLinkToken("unsubscribe", "entry1", SECRET, now);
    expect(verifyInsiderLinkToken("address", token, SECRET, now).ok).toBe(
      false,
    );
    const forged = token.replace("entry1", "entry2");
    expect(verifyInsiderLinkToken("unsubscribe", forged, SECRET, now).ok).toBe(
      false,
    );
    expect(
      verifyInsiderLinkToken("unsubscribe", token, "y".repeat(40), now).ok,
    ).toBe(false);
    expect(verifyInsiderLinkToken("unsubscribe", "junk", SECRET, now).ok).toBe(
      false,
    );
  });

  it("expires the address link after 90 days", () => {
    const token = createInsiderLinkToken("address", "entry1", SECRET, now);
    const later = new Date(now.getTime() + 91 * 24 * 60 * 60 * 1000);
    expect(verifyInsiderLinkToken("address", token, SECRET, later)).toEqual({
      ok: false,
      reason: "EXPIRED",
    });
  });

  it("refuses to run without a real secret", () => {
    expect(() => createInsiderLinkToken("address", "e", undefined)).toThrow();
    expect(() => createInsiderLinkToken("address", "e", "short")).toThrow();
  });
});
