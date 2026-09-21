import { describe, expect, it, vi } from "vitest";
import { ConsoleOtpSender } from "./ConsoleOtpSender";
import { generateOtpCode, hashOtpCode } from "./generateOtpCode";

describe("generateOtpCode", () => {
  it("returns a 6-digit zero-padded string", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateOtpCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });
});

describe("hashOtpCode", () => {
  it("is deterministic for the same code and secret", () => {
    expect(hashOtpCode("123456", "test-secret")).toBe(
      hashOtpCode("123456", "test-secret"),
    );
  });

  it("differs for different secrets (same code)", () => {
    expect(hashOtpCode("123456", "secret-a")).not.toBe(
      hashOtpCode("123456", "secret-b"),
    );
  });

  it("differs for different codes (same secret)", () => {
    expect(hashOtpCode("123456", "test-secret")).not.toBe(
      hashOtpCode("654321", "test-secret"),
    );
  });

  it("rejects an empty secret", () => {
    expect(() => hashOtpCode("123456", "")).toThrow();
  });
});

describe("ConsoleOtpSender", () => {
  it("resolves and logs instead of calling a real vendor", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const sender = new ConsoleOtpSender();

    await expect(
      sender.send("+919999999999", "SMS", "123456"),
    ).resolves.toBeUndefined();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("123456"));

    logSpy.mockRestore();
  });
});
