import { describe, expect, it } from "vitest";
import { renderInsiderCodeEmail } from "./insiderCodeEmail";

const EM_DASH = String.fromCharCode(0x2014);
const base = {
  fullName: "Priya Shah",
  code: "wei7820",
  addressUrl: "https://www.onwei.in/insider/address?t=abc",
  unsubscribeUrl: "https://www.onwei.in/insider/unsubscribe?t=def",
  oneClickUnsubscribeUrl: "https://www.onwei.in/api/insider/unsubscribe?t=def",
};

describe("renderInsiderCodeEmail", () => {
  it("greets by first name and shows the code in capitals", () => {
    const email = renderInsiderCodeEmail(base);
    expect(email.html).toContain("Hi Priya,");
    expect(email.html).toContain("WEI7820");
    expect(email.text).toContain("WEI7820");
    expect(email.subject).toBe("A little thank you from us");
  });

  it("falls back when there is no name and escapes html", () => {
    expect(renderInsiderCodeEmail({ ...base, fullName: " " }).html).toContain(
      "Hi there,",
    );
    const email = renderInsiderCodeEmail({ ...base, fullName: "<b>Asha</b>" });
    expect(email.html).not.toContain("<b>Asha");
  });

  it("links the address form and a one-click unsubscribe", () => {
    const email = renderInsiderCodeEmail(base);
    expect(email.html).toContain(base.addressUrl);
    expect(email.html).toContain(base.unsubscribeUrl);
    expect(email.headers?.["List-Unsubscribe"]).toBe(
      `<${base.oneClickUnsubscribeUrl}>`,
    );
    expect(email.headers?.["List-Unsubscribe-Post"]).toBe(
      "List-Unsubscribe=One-Click",
    );
  });

  it("does not mention a percentage and has no em dash", () => {
    const email = renderInsiderCodeEmail(base);
    expect(email.text).not.toMatch(/\d+\s?%/);
    expect(email.html).not.toContain(EM_DASH);
    expect(email.text).not.toContain(EM_DASH);
  });
});
