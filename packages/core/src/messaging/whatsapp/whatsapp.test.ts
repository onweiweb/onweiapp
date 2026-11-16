import { describe, expect, it } from "vitest";
import { phoneOtpMode } from "../../otp/staticOtp";
import {
  buildGupshupTemplateBody,
  missingGupshupSettings,
  readGupshupConfig,
  sendGupshupTemplate,
} from "./gupshupClient";
import { buildTemplateParams, firstNameOf } from "./purposes";
import { checkWhatsAppTemplate } from "./templates";
import {
  isStopReply,
  nextStatus,
  parseGupshupEvent,
  webhookTokenMatches,
} from "./webhook";

const config = {
  apiKey: "test-key",
  appName: "OnweiApp",
  sourceNumber: "919000000000",
};

describe("WhatsApp template values", () => {
  it("fills params in the order staff set, repeats allowed", () => {
    expect(buildTemplateParams(["code", "code"], { code: "482913" })).toEqual([
      "482913",
      "482913",
    ]);
    expect(
      buildTemplateParams(["firstName", "insiderCode", "addressToken"], {
        firstName: "Priya",
        insiderCode: "WEI4821",
        addressToken: "abc.123.sig",
      }),
    ).toEqual(["Priya", "WEI4821", "abc.123.sig"]);
  });

  it("sends nothing when a value is missing", () => {
    expect(buildTemplateParams(["firstName"], { firstName: " " })).toBeNull();
    expect(buildTemplateParams(["insiderCode"], {})).toBeNull();
  });

  it("uses the first word of the name", () => {
    expect(firstNameOf("  Priya  Sharma ")).toBe("Priya");
    expect(firstNameOf("")).toBe("there");
  });
});

describe("Gupshup client", () => {
  it("reads the connection settings and lists missing ones by name", () => {
    expect(readGupshupConfig({})).toBeNull();
    expect(
      readGupshupConfig({
        GUPSHUP_API_KEY: "k",
        GUPSHUP_APP_NAME: "App",
        GUPSHUP_SOURCE_NUMBER: "+91 90000 00000",
      }),
    ).toEqual({ apiKey: "k", appName: "App", sourceNumber: "919000000000" });
    expect(missingGupshupSettings({ GUPSHUP_API_KEY: "k" })).toEqual([
      "GUPSHUP_APP_NAME",
      "GUPSHUP_SOURCE_NUMBER",
    ]);
  });

  it("builds the form body, with the image only when given", () => {
    const body = buildGupshupTemplateBody(config, {
      phone: "+919876543210",
      templateId: "tpl-1",
      params: ["Priya"],
      imageUrl: "https://blob.example/a.jpg",
    });
    expect(body.get("channel")).toBe("whatsapp");
    expect(body.get("source")).toBe("919000000000");
    expect(body.get("destination")).toBe("919876543210");
    expect(body.get("src.name")).toBe("OnweiApp");
    expect(JSON.parse(body.get("template")!)).toEqual({
      id: "tpl-1",
      params: ["Priya"],
    });
    expect(JSON.parse(body.get("message")!)).toEqual({
      type: "image",
      image: { link: "https://blob.example/a.jpg" },
    });
    const plain = buildGupshupTemplateBody(config, {
      phone: "+919876543210",
      templateId: "tpl-1",
      params: ["1"],
    });
    expect(plain.has("message")).toBe(false);
  });

  it("returns the message id, or a reason without the key", async () => {
    const ok = await sendGupshupTemplate(
      config,
      { phone: "+919876543210", templateId: "t", params: ["1"] },
      async (_url, init) => {
        expect((init?.headers as Record<string, string>).apikey).toBe(
          "test-key",
        );
        return new Response(
          JSON.stringify({ status: "submitted", messageId: "m-1" }),
          { status: 202 },
        );
      },
    );
    expect(ok).toEqual({ ok: true, messageId: "m-1" });

    const bad = await sendGupshupTemplate(
      config,
      { phone: "+919876543210", templateId: "t", params: ["1"] },
      async () =>
        new Response(
          JSON.stringify({ status: "error", message: "Template not found" }),
          { status: 400 },
        ),
    );
    expect(bad).toEqual({
      ok: false,
      reason: "Gupshup said 400: Template not found",
    });

    const down = await sendGupshupTemplate(
      config,
      { phone: "+919876543210", templateId: "t", params: ["1"] },
      async () => {
        throw new TypeError("fetch failed");
      },
    );
    expect(down).toEqual({ ok: false, reason: "Network error" });
  });
});

describe("Gupshup webhook", () => {
  it("checks the token in full", () => {
    const token = "a".repeat(48);
    expect(webhookTokenMatches(token, token)).toBe(true);
    expect(webhookTokenMatches("a".repeat(47), token)).toBe(false);
    expect(webhookTokenMatches("", undefined)).toBe(false);
    // A short configured token is refused outright.
    expect(webhookTokenMatches("short", "short")).toBe(false);
  });

  it("reads delivery updates", () => {
    expect(
      parseGupshupEvent({
        app: "OnweiApp",
        timestamp: 1700000000000,
        version: 2,
        type: "message-event",
        payload: {
          id: "wa-1",
          gsId: "m-1",
          type: "delivered",
          destination: "919876543210",
          payload: { ts: 1700000000 },
        },
      }),
    ).toEqual({
      kind: "status",
      ids: ["m-1", "wa-1"],
      status: "DELIVERED",
      at: new Date(1700000000000),
    });
    const failed = parseGupshupEvent({
      type: "message-event",
      timestamp: 1,
      payload: {
        id: "m-2",
        type: "failed",
        payload: { code: 1002, reason: "Number does not exist on WhatsApp" },
      },
    });
    expect(failed).toMatchObject({
      kind: "status",
      status: "FAILED",
      failureReason: "Number does not exist on WhatsApp",
    });
  });

  it("reads replies and ignores everything else", () => {
    expect(
      parseGupshupEvent({
        type: "message",
        payload: {
          source: "919876543210",
          type: "text",
          payload: { text: "STOP" },
        },
      }),
    ).toEqual({ kind: "inbound", phone: "+919876543210", text: "STOP" });
    expect(parseGupshupEvent({ type: "user-event" })).toEqual({
      kind: "ignored",
    });
    expect(parseGupshupEvent(null)).toEqual({ kind: "ignored" });
  });

  it("knows a STOP reply", () => {
    expect(isStopReply(" Stop ")).toBe(true);
    expect(isStopReply("UNSUBSCRIBE.")).toBe(true);
    expect(isStopReply("stop sending me the code please")).toBe(false);
    expect(isStopReply("hi")).toBe(false);
  });

  it("only moves a status forward", () => {
    expect(nextStatus("SENT", "DELIVERED")).toBe("DELIVERED");
    expect(nextStatus("READ", "DELIVERED")).toBeNull();
    expect(nextStatus("READ", "SENT")).toBeNull();
    expect(nextStatus("SENT", "FAILED")).toBe("FAILED");
    expect(nextStatus("DELIVERED", "FAILED")).toBeNull();
    expect(nextStatus("FAILED", "READ")).toBeNull();
    expect(nextStatus("SENT", "SENT")).toBeNull();
  });
});

describe("checkWhatsAppTemplate", () => {
  const base = {
    purpose: "INSIDER_CODE" as const,
    gupshupTemplateId: "tpl",
    templateName: "onwei_insider_code",
    language: "en",
    variables: ["firstName", "insiderCode", "addressToken"],
    headerType: "IMAGE" as const,
    headerImageUrl: "https://blob.example/card.jpg",
    previewText: "",
    isActive: true,
  };

  it("accepts a complete template", () => {
    expect(checkWhatsAppTemplate(base)).toBeNull();
  });

  it("refuses values that don't belong to the message", () => {
    expect(checkWhatsAppTemplate({ ...base, variables: ["code"] })).toMatch(
      /can't be used/,
    );
  });

  it("won't switch on without an ID or a needed image", () => {
    expect(checkWhatsAppTemplate({ ...base, gupshupTemplateId: " " })).toMatch(
      /template ID/,
    );
    expect(checkWhatsAppTemplate({ ...base, headerImageUrl: null })).toMatch(
      /image/,
    );
    // Saving it off without them is fine.
    expect(
      checkWhatsAppTemplate({
        ...base,
        isActive: false,
        gupshupTemplateId: "",
        headerImageUrl: null,
      }),
    ).toBeNull();
  });

  it("refuses an image on sign-in codes", () => {
    expect(
      checkWhatsAppTemplate({
        ...base,
        purpose: "SIGN_IN_CODE",
        variables: ["code"],
      }),
    ).toMatch(/can't have an image/);
  });
});

describe("phoneOtpMode with WhatsApp", () => {
  const live = {
    env: {
      OTP_STATIC_CODE: "123456",
      NODE_ENV: "production",
      VERCEL_ENV: "production",
    },
    siteMode: "LIVE",
  };

  it("sends real WhatsApp codes once the template is on, even on the live site", () => {
    expect(
      phoneOtpMode({ ...live, channel: "WHATSAPP", whatsappReady: true }),
    ).toEqual({ mode: "whatsapp" });
  });

  it("keeps SMS, and WhatsApp before it is set up, unavailable on the live site", () => {
    expect(
      phoneOtpMode({ ...live, channel: "SMS", whatsappReady: true }),
    ).toEqual({ mode: "unavailable" });
    expect(
      phoneOtpMode({ ...live, channel: "WHATSAPP", whatsappReady: false }),
    ).toEqual({ mode: "unavailable" });
  });
});
