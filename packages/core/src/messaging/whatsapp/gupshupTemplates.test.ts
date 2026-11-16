import { describe, expect, it } from "vitest";
import {
  categoryFits,
  countPlaceholders,
  listGupshupTemplates,
  parseGupshupTemplates,
  readGupshupAppId,
  suggestTemplateValues,
} from "./gupshupTemplates";

// Shapes copied from the live Gupshup response (2026-11-17), text shortened.
const response = {
  status: "success",
  templates: [
    {
      id: "auth-1",
      elementName: "onweisignincode",
      languageCode: "en",
      category: "AUTHENTICATION",
      status: "PENDING",
      templateType: "TEXT",
      data: "*{{1}}* is your code. | [Copy code,https://x/?code=otp{{1}}]",
      containerMeta: JSON.stringify({
        data: "*{{1}}* is your code.",
        buttons: [
          { type: "URL", text: "Copy code", url: "https://x/?code=otp{{1}}" },
        ],
        footer: "Expires in 10 minutes.",
      }),
    },
    {
      id: "ins-1",
      elementName: "onwei_insidersv2",
      languageCode: "en",
      category: "UTILITY",
      status: "APPROVED",
      templateType: "IMAGE",
      containerMeta: JSON.stringify({
        data: "Hi {{1}}, your code is {{2}}.",
        buttons: [
          {
            type: "URL",
            text: "Share my Address",
            url: "https://www.onwei.in/insider/address?t={{1}}",
          },
        ],
        mediaUrl: "https://fss.gupshup.io/0/public/card.jpeg",
      }),
    },
    {
      id: "vid-1",
      elementName: "welcomeinsiders",
      category: "MARKETING",
      status: "REJECTED",
      reason: "Looks like spam",
      templateType: "VIDEO",
      containerMeta: JSON.stringify({
        data: "Hi {{1}}",
        mediaUrl: "https://fss.gupshup.io/v.mp4",
      }),
    },
    { elementName: "no id, skipped" },
    "junk",
  ],
};

describe("parseGupshupTemplates", () => {
  const list = parseGupshupTemplates(response);

  it("reads every template with an id, approved first", () => {
    expect(list.map((t) => t.id)).toEqual(["ins-1", "auth-1", "vid-1"]);
  });

  it("counts body and button values", () => {
    const auth = list.find((t) => t.id === "auth-1")!;
    expect(auth).toMatchObject({
      bodyValues: 1,
      buttonValues: 1,
      header: "NONE",
      footer: "Expires in 10 minutes.",
    });
    const insider = list.find((t) => t.id === "ins-1")!;
    expect(insider).toMatchObject({
      bodyValues: 2,
      buttonValues: 1,
      header: "IMAGE",
      sampleImageUrl: "https://fss.gupshup.io/0/public/card.jpeg",
      status: "APPROVED",
    });
  });

  it("marks video headers as not supported and keeps the reason", () => {
    const video = list.find((t) => t.id === "vid-1")!;
    expect(video).toMatchObject({
      header: "UNSUPPORTED",
      sampleImageUrl: null,
      reason: "Looks like spam",
    });
  });

  it("survives odd responses", () => {
    expect(parseGupshupTemplates(null)).toEqual([]);
    expect(parseGupshupTemplates({ templates: "nope" })).toEqual([]);
    expect(
      parseGupshupTemplates({
        templates: [{ id: "x", containerMeta: "{bad" }],
      })[0],
    ).toMatchObject({ bodyValues: 0, buttonValues: 0 });
  });
});

describe("filling in values", () => {
  it("counts distinct placeholders", () => {
    expect(countPlaceholders("{{1}} and {{ 2 }} and {{1}}")).toBe(2);
    expect(countPlaceholders("none")).toBe(0);
  });

  it("suggests the usual order per message", () => {
    expect(
      suggestTemplateValues("SIGN_IN_CODE", { bodyValues: 1, buttonValues: 1 }),
    ).toEqual(["code", "code"]);
    expect(
      suggestTemplateValues("INSIDER_CODE", { bodyValues: 2, buttonValues: 1 }),
    ).toEqual(["firstName", "insiderCode", "addressToken"]);
    expect(
      suggestTemplateValues("WAITLIST_JOINED", {
        bodyValues: 1,
        buttonValues: 0,
      }),
    ).toEqual(["firstName"]);
  });

  it("knows when the category fits", () => {
    expect(categoryFits("SIGN_IN_CODE", "AUTHENTICATION")).toBe(true);
    expect(categoryFits("SIGN_IN_CODE", "MARKETING")).toBe(false);
    expect(categoryFits("WAITLIST_JOINED", "MARKETING")).toBe(true);
    expect(categoryFits("INSIDER_CODE", "UTILITY")).toBe(true);
    expect(categoryFits("INSIDER_CODE", "AUTHENTICATION")).toBe(false);
  });
});

describe("listGupshupTemplates", () => {
  const env = {
    GUPSHUP_API_KEY: "key",
    GUPSHUP_APP_ID: "80543282-db48-4795-a1a4-c4808d53a5b6",
  };

  it("needs the key and app id", async () => {
    expect(await listGupshupTemplates({})).toEqual({
      ok: false,
      reason: "NOT_CONFIGURED",
    });
    expect(readGupshupAppId({ GUPSHUP_APP_ID: "../etc" })).toBeNull();
  });

  it("calls the app's template list with the key", async () => {
    const result = await listGupshupTemplates(env, async (url, init) => {
      expect(String(url)).toBe(
        "https://api.gupshup.io/wa/app/80543282-db48-4795-a1a4-c4808d53a5b6/template",
      );
      expect((init?.headers as Record<string, string>).apikey).toBe("key");
      return new Response(JSON.stringify(response), { status: 200 });
    });
    expect(result.ok && result.templates.length).toBe(3);
  });

  it("says when the key is refused or Gupshup is down", async () => {
    expect(
      await listGupshupTemplates(
        env,
        async () => new Response("no", { status: 401 }),
      ),
    ).toEqual({ ok: false, reason: "REJECTED_KEY" });
    expect(
      await listGupshupTemplates(env, async () => {
        throw new TypeError("fetch failed");
      }),
    ).toEqual({ ok: false, reason: "UNAVAILABLE" });
  });
});
