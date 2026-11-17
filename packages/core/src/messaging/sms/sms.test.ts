import { describe, expect, it } from "vitest";
import { phoneOtpMode } from "../../otp/staticOtp";
import { buildMsg91OtpUrl, readMsg91Config, sendMsg91Otp } from "./msg91Client";
import { smsAvailable } from "./send";
import { nextSmsStatus, parseMsg91Reports } from "./webhook";

const config = { authKey: "test-key", templateId: "tpl-1" };
const input = { phone: "+919876543210", code: "482913", expiryMinutes: 10 };

describe("MSG91 settings", () => {
  it("needs both the key and the template", () => {
    expect(readMsg91Config({})).toBeNull();
    expect(readMsg91Config({ MSG91_AUTH_KEY: "k" })).toBeNull();
    expect(
      readMsg91Config({ MSG91_AUTH_KEY: " k ", MSG91_OTP_TEMPLATE_ID: "t" }),
    ).toEqual({ authKey: "k", templateId: "t" });
    expect(smsAvailable({})).toBe(false);
    expect(
      smsAvailable({ MSG91_AUTH_KEY: "k", MSG91_OTP_TEMPLATE_ID: "t" }),
    ).toBe(true);
  });
});

describe("MSG91 send", () => {
  it("puts our code, the number as digits and the expiry in the URL, not the key", () => {
    const url = new URL(buildMsg91OtpUrl(config, input));
    expect(url.origin + url.pathname).toBe(
      "https://control.msg91.com/api/v5/otp",
    );
    expect(url.searchParams.get("template_id")).toBe("tpl-1");
    expect(url.searchParams.get("mobile")).toBe("919876543210");
    expect(url.searchParams.get("otp")).toBe("482913");
    expect(url.searchParams.get("otp_expiry")).toBe("10");
    expect(url.toString()).not.toContain("test-key");
  });

  it("sends the key as a header and returns the request id", async () => {
    const ok = await sendMsg91Otp(config, input, async (_url, init) => {
      expect(init?.method).toBe("POST");
      expect((init?.headers as Record<string, string>).authkey).toBe(
        "test-key",
      );
      return new Response(
        JSON.stringify({ type: "success", request_id: "r-1" }),
        { status: 200 },
      );
    });
    expect(ok).toEqual({ ok: true, requestId: "r-1" });
  });

  it("returns MSG91's reason, or a network error, never the key", async () => {
    const bad = await sendMsg91Otp(
      config,
      input,
      async () =>
        new Response(
          JSON.stringify({ type: "error", message: "Invalid template" }),
          { status: 400 },
        ),
    );
    expect(bad).toEqual({
      ok: false,
      reason: "MSG91 said 400: Invalid template",
    });
    // MSG91 sometimes answers 200 with type error.
    const soft = await sendMsg91Otp(
      config,
      input,
      async () =>
        new Response(
          JSON.stringify({ type: "error", message: "Authentication failure" }),
          { status: 200 },
        ),
    );
    expect(soft).toMatchObject({ ok: false });
    const down = await sendMsg91Otp(config, input, async () => {
      throw new TypeError("fetch failed");
    });
    expect(down).toEqual({ ok: false, reason: "Network error" });
  });
});

describe("MSG91 delivery reports", () => {
  it("reads delivered and failed reports, one or a list", () => {
    expect(
      parseMsg91Reports({
        requestId: "r-1",
        status: "1",
        deliveryTime: "2026-11-18T10:00:05.000Z",
        telNum: "919876543210",
      }),
    ).toEqual([
      {
        requestId: "r-1",
        status: "DELIVERED",
        at: new Date("2026-11-18T10:00:05.000Z"),
      },
    ]);
    const [failed] = parseMsg91Reports([
      { requestId: "r-2", status: "2", failureReason: "Absent Subscriber" },
    ]);
    expect(failed).toMatchObject({
      status: "FAILED",
      failureReason: "Absent Subscriber",
    });
    const [blocked] = parseMsg91Reports({ requestId: "r-3", status: 17 });
    expect(blocked).toMatchObject({
      status: "FAILED",
      failureReason: "Failed (code 17)",
    });
  });

  it("ignores anything it can't read", () => {
    expect(parseMsg91Reports(null)).toEqual([]);
    expect(parseMsg91Reports({ status: "1" })).toEqual([]);
    expect(parseMsg91Reports({ requestId: "r", status: "99" })).toEqual([]);
  });

  it("only moves a status forward", () => {
    expect(nextSmsStatus("SENT", "DELIVERED")).toBe("DELIVERED");
    expect(nextSmsStatus("SENDING", "SENT")).toBe("SENT");
    expect(nextSmsStatus("DELIVERED", "SENT")).toBeNull();
    expect(nextSmsStatus("DELIVERED", "FAILED")).toBeNull();
    expect(nextSmsStatus("SENT", "FAILED")).toBe("FAILED");
    expect(nextSmsStatus("FAILED", "DELIVERED")).toBeNull();
    expect(nextSmsStatus("SENT", "SENT")).toBeNull();
  });
});

describe("phoneOtpMode with SMS", () => {
  const live = {
    env: {
      OTP_STATIC_CODE: "123456",
      NODE_ENV: "production",
      VERCEL_ENV: "production",
    },
    siteMode: "LIVE",
  };

  it("sends real SMS codes once MSG91 is set up, even on the live site", () => {
    expect(phoneOtpMode({ ...live, channel: "SMS", smsReady: true })).toEqual({
      mode: "sms",
    });
  });

  it("keeps SMS unavailable on the live site until then", () => {
    expect(phoneOtpMode({ ...live, channel: "SMS", smsReady: false })).toEqual({
      mode: "unavailable",
    });
    // smsReady never turns WhatsApp on.
    expect(
      phoneOtpMode({ ...live, channel: "WHATSAPP", smsReady: true }),
    ).toEqual({ mode: "unavailable" });
  });
});
