import { describe, expect, it } from "vitest";
import { phoneOtpMode } from "./staticOtp";

describe("phoneOtpMode", () => {
  it("uses the static code in development and previews", () => {
    expect(
      phoneOtpMode({
        env: { OTP_STATIC_CODE: "123456", NODE_ENV: "development" },
        siteMode: "LIVE",
      }),
    ).toEqual({
      mode: "static",
      code: "123456",
    });
    expect(
      phoneOtpMode({
        env: {
          OTP_STATIC_CODE: "123456",
          NODE_ENV: "production",
          VERCEL_ENV: "preview",
        },
        siteMode: "LIVE",
      }),
    ).toEqual({ mode: "static", code: "123456" });
  });

  it("refuses the static code on the live production site", () => {
    expect(
      phoneOtpMode({
        env: {
          OTP_STATIC_CODE: "123456",
          NODE_ENV: "production",
          VERCEL_ENV: "production",
        },
        siteMode: "LIVE",
      }),
    ).toEqual({ mode: "unavailable" });
    expect(
      phoneOtpMode({
        env: { OTP_STATIC_CODE: "123456", NODE_ENV: "production" },
        siteMode: "LIVE",
      }),
    ).toEqual({ mode: "unavailable" });
  });

  it("allows it on production while the store is still hidden", () => {
    expect(
      phoneOtpMode({
        env: {
          OTP_STATIC_CODE: "123456",
          NODE_ENV: "production",
          VERCEL_ENV: "production",
        },
        siteMode: "WAITLIST",
      }),
    ).toEqual({ mode: "static", code: "123456" });
  });

  it("is unavailable without a proper six-digit code", () => {
    expect(phoneOtpMode({ env: {}, siteMode: "WAITLIST" })).toEqual({
      mode: "unavailable",
    });
    expect(
      phoneOtpMode({ env: { OTP_STATIC_CODE: "12" }, siteMode: "WAITLIST" }),
    ).toEqual({ mode: "unavailable" });
  });
});
