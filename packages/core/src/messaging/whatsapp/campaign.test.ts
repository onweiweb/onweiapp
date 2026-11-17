import { describe, expect, it } from "vitest";
import {
  audienceLabel,
  audienceWhere,
  campaignParams,
  checkCampaignFill,
  cleanFillText,
  fillTemplateText,
  sampleCampaignParams,
  suggestCampaignFill,
} from "./campaign";

const secret = "test-insider-link-secret-at-least-32-chars";
const member = {
  id: "entry1",
  fullName: "Priya Sharma",
  insiderCode: "WEI4821",
};
const context = { siteUrl: "https://www.onwei.in/", secret };

const approved = {
  status: "APPROVED",
  category: "UTILITY",
  header: "NONE" as const,
  bodyValues: 2,
  buttonValues: 1,
};

describe("Insiders WhatsApp send: blanks", () => {
  it("suggests name, code, then the button link", () => {
    expect(suggestCampaignFill({ bodyValues: 2, buttonValues: 1 })).toEqual([
      { kind: "firstName" },
      { kind: "insiderCode" },
      { kind: "addressToken" },
    ]);
    expect(suggestCampaignFill({ bodyValues: 4, buttonValues: 0 })[3]).toEqual({
      kind: "text",
      text: "",
    });
  });

  it("fills each member's own values in Gupshup order", () => {
    const params = campaignParams(
      [
        { kind: "firstName" },
        { kind: "insiderCode" },
        { kind: "addressLink" },
        { kind: "text", text: " Sat\n7 am " },
        { kind: "addressToken" },
      ],
      member,
      context,
    );
    expect(params?.slice(0, 2)).toEqual(["Priya", "WEI4821"]);
    expect(params?.[2]).toMatch(
      /^https:\/\/www\.onwei\.in\/insider\/address\?t=/,
    );
    expect(params?.[3]).toBe("Sat 7 am");
    expect(params?.[4]).toMatch(/^[\w-]+\.\d+\.[\w-]+$/);
  });

  it("sends nothing when a value is missing", () => {
    expect(
      campaignParams(
        [{ kind: "insiderCode" }],
        { ...member, insiderCode: null },
        context,
      ),
    ).toBeNull();
    expect(
      campaignParams([{ kind: "addressToken" }], member, {
        ...context,
        secret: undefined,
      }),
    ).toBeNull();
    expect(
      campaignParams([{ kind: "text", text: "  " }], member, context),
    ).toBeNull();
  });

  it("checks the template and blanks before sending", () => {
    const fill = suggestCampaignFill(approved);
    expect(checkCampaignFill(approved, fill, null)).toBeNull();
    expect(
      checkCampaignFill({ ...approved, status: "PENDING" }, fill, null),
    ).toMatch(/approved/);
    expect(
      checkCampaignFill(
        { ...approved, category: "AUTHENTICATION" },
        fill,
        null,
      ),
    ).toMatch(/utility and marketing/);
    expect(
      checkCampaignFill({ ...approved, header: "IMAGE" }, fill, null),
    ).toMatch(/image/);
    expect(checkCampaignFill(approved, fill.slice(1), null)).toMatch(
      /every blank/,
    );
    expect(
      checkCampaignFill(
        { ...approved, bodyValues: 1, buttonValues: 0 },
        [{ kind: "text", text: "" }],
        null,
      ),
    ).toMatch(/Type the text/);
  });

  it("previews with sample values", () => {
    const values = sampleCampaignParams([
      { kind: "firstName" },
      { kind: "text", text: "Sat" },
    ]);
    expect(fillTemplateText("Hi {{1}}, see you {{2}}. {{3}}", values)).toBe(
      "Hi Priya, see you Sat. {{3}}",
    );
    expect(cleanFillText("a\t\tb    c")).toBe("a b c");
  });
});

describe("Insiders WhatsApp send: who gets it", () => {
  it("builds the filter for each group", () => {
    expect(audienceWhere({ group: "all" })).toEqual({});
    expect(audienceWhere({ group: "noAddress" })).toEqual({
      cardAddress: { is: null },
    });
    expect(audienceWhere({ group: "picked", ids: ["a", "a", "b"] })).toEqual({
      id: { in: ["a", "b"] },
    });
    expect(
      audienceWhere({ group: "joined", from: "2026-11-01", to: "2026-11-02" }),
    ).toEqual({
      submittedAt: {
        gte: new Date("2026-10-31T18:30:00Z"),
        lt: new Date("2026-11-02T18:30:00Z"),
      },
    });
  });

  it("describes the group in plain words", () => {
    expect(audienceLabel({ group: "noAddress" })).toBe(
      "Haven't shared their address",
    );
    expect(audienceLabel({ group: "picked", ids: ["a"] })).toBe(
      "1 picked person",
    );
    expect(audienceLabel({ group: "joined", from: "2026-11-01" })).toBe(
      "Joined from 1 Nov 2026",
    );
  });
});
