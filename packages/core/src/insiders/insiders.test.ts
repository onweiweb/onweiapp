import { describe, expect, it } from "vitest";
import {
  generateInsiderCode,
  isInsiderCodeFormat,
  normalizeCode,
} from "./insiderCode";
import { insiderCardQrLink, planPoolFill } from "./codePool";
import {
  createInsiderLinkToken,
  insiderAddressUrl,
  insiderEmailLinks,
  insiderShareMessage,
  verifyInsiderLinkToken,
} from "./insiderLink";
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

describe("printed card pool", () => {
  // Steps through 1000..9999 in order, so tests are repeatable.
  function counter(start = 1000) {
    let n = start;
    return () => n++;
  }

  it("fills an empty pool to the target, members first, numbered 1..N", () => {
    const plan = planPoolFill({
      target: 500,
      poolSize: 0,
      maxCardNumber: 0,
      unpooledMembers: [
        { id: "a", code: "WEI5000" },
        { id: "b", code: "WEI5001" },
      ],
      takenCodes: new Set(["WEI5000", "WEI5001"]),
      random: counter(),
    });
    expect(plan.target).toBe(500);
    expect(
      plan.memberRows.map((r) => [r.waitlistEntryId, r.cardNumber]),
    ).toEqual([
      ["a", 1],
      ["b", 2],
    ]);
    expect(plan.freeRows).toHaveLength(498);
    const numbers = [...plan.memberRows, ...plan.freeRows].map(
      (r) => r.cardNumber,
    );
    expect(numbers).toEqual(Array.from({ length: 500 }, (_, i) => i + 1));
    const codes = new Set(
      [...plan.memberRows, ...plan.freeRows].map((r) => r.code),
    );
    expect(codes.size).toBe(500);
  });

  it("never reuses a code that is taken", () => {
    const plan = planPoolFill({
      target: 3,
      poolSize: 0,
      maxCardNumber: 0,
      unpooledMembers: [],
      takenCodes: new Set(["WEI1000", "WEI1001"]),
      random: counter(),
    });
    expect(plan.freeRows.map((r) => r.code)).toEqual([
      "WEI1002",
      "WEI1003",
      "WEI1004",
    ]);
  });

  it("adds nothing to a full pool", () => {
    const plan = planPoolFill({
      target: 500,
      poolSize: 500,
      maxCardNumber: 500,
      unpooledMembers: [],
      takenCodes: new Set(),
    });
    expect(plan.memberRows).toHaveLength(0);
    expect(plan.freeRows).toHaveLength(0);
  });

  it("numbers a top-up after the highest card", () => {
    const plan = planPoolFill({
      target: 500,
      poolSize: 498,
      maxCardNumber: 498,
      unpooledMembers: [{ id: "late", code: "WEI9000" }],
      takenCodes: new Set(["WEI9000"]),
      random: counter(),
    });
    expect(plan.memberRows[0]?.cardNumber).toBe(499);
    expect(plan.freeRows.map((r) => r.cardNumber)).toEqual([500]);
  });

  it("raises the target when more members need a card than it allows", () => {
    const members = Array.from({ length: 6 }, (_, i) => ({
      id: `m${i}`,
      code: `WEI${2000 + i}`,
    }));
    const plan = planPoolFill({
      target: 5,
      poolSize: 0,
      maxCardNumber: 0,
      unpooledMembers: members,
      takenCodes: new Set(members.map((m) => m.code)),
    });
    expect(plan.target).toBe(6);
    expect(plan.memberRows).toHaveLength(6);
    expect(plan.freeRows).toHaveLength(0);
  });

  it("tags the card QR link", () => {
    const url = new URL(insiderCardQrLink("https://www.onwei.in"));
    expect(url.origin).toBe("https://www.onwei.in");
    expect(url.searchParams.get("utm_source")).toBe("insider-card");
    expect(url.searchParams.get("utm_medium")).toBe("print");
    expect(url.searchParams.get("utm_campaign")).toBe("insider-cards");
  });
});

describe("insider email links", () => {
  it("builds signed address and unsubscribe links", () => {
    const links = insiderEmailLinks("entry1", "https://www.onwei.in/", SECRET);
    const address = new URL(links.addressUrl);
    expect(address.pathname).toBe("/insider/address");
    expect(
      verifyInsiderLinkToken("address", address.searchParams.get("t")!, SECRET),
    ).toEqual({ ok: true, entryId: "entry1" });
    expect(new URL(links.unsubscribeUrl).pathname).toBe("/insider/unsubscribe");
    expect(new URL(links.oneClickUnsubscribeUrl).pathname).toBe(
      "/api/insider/unsubscribe",
    );
  });

  it("refuses to build links without a secret", () => {
    expect(() =>
      insiderEmailLinks("entry1", "https://www.onwei.in", undefined),
    ).toThrow();
    expect(() =>
      insiderAddressUrl("entry1", "https://www.onwei.in", undefined),
    ).toThrow();
  });

  it("builds the address link staff copy from admin", () => {
    const url = new URL(
      insiderAddressUrl("entry1", "https://www.onwei.in/", SECRET),
    );
    expect(url.origin + url.pathname).toBe(
      "https://www.onwei.in/insider/address",
    );
    expect(
      verifyInsiderLinkToken("address", url.searchParams.get("t")!, SECRET),
    ).toEqual({ ok: true, entryId: "entry1" });
    // An address token can't unsubscribe anyone.
    expect(
      verifyInsiderLinkToken("unsubscribe", url.searchParams.get("t")!, SECRET),
    ).toEqual({ ok: false, reason: "INVALID" });
  });

  it("writes the message to paste into WhatsApp", () => {
    expect(
      insiderShareMessage({
        firstName: "Priya",
        insiderCode: "WEI4821",
        addressUrl: "https://www.onwei.in/insider/address?t=x",
      }),
    ).toBe(
      "Hi Priya, your Onwei Insider code is WEI4821. Share your address for your Insider card here: https://www.onwei.in/insider/address?t=x",
    );
  });
});
