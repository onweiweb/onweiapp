import { describe, expect, it } from "vitest";
import { renderOtpEmail } from "./otpEmail";

describe("renderOtpEmail", () => {
  it("includes the code in subject, html, and text", () => {
    const email = renderOtpEmail("123456");
    expect(email.subject).toContain("123456");
    expect(email.text).toContain("123456");
    expect(email.html).toContain("123456");
  });

  it("produces non-empty, well-formed-enough html", () => {
    const email = renderOtpEmail("654321");
    expect(email.html.length).toBeGreaterThan(0);
    expect(email.html).toContain("<p>");
  });
});
