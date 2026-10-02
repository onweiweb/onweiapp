import { describe, expect, it, vi } from "vitest";
import { renderCustomerWelcomeEmail } from "./customerWelcomeEmail";
import { renderWaitlistWelcomeEmail } from "./waitlistWelcomeEmail";
import {
  ConsoleEmailSender,
  ResendEmailSender,
  createEmailSender,
  sendEmailSafely,
} from "../sender/emailSender";

const EM_DASH = String.fromCharCode(0x2014);

describe("renderWaitlistWelcomeEmail", () => {
  it("greets by first name and escapes html in the name", () => {
    const email = renderWaitlistWelcomeEmail({ fullName: "<b>Asha</b> Rao" });
    expect(email.html).toContain("Hey &lt;b&gt;Asha&lt;/b&gt;,");
    expect(email.html).not.toContain("<b>Asha");
    expect(email.text).toContain("Hey <b>Asha</b>,");
  });

  it("never mentions a launch date", () => {
    const text = renderWaitlistWelcomeEmail({ fullName: "Asha" }).text;
    expect(text).not.toMatch(/launch on|\d{4}/i);
  });

  it("adds the follow button only with an instagram url", () => {
    const without = renderWaitlistWelcomeEmail({ fullName: "Asha" });
    expect(without.html).not.toContain("https://instagram.com");
    const withLink = renderWaitlistWelcomeEmail({
      fullName: "Asha",
      instagramUrl: "https://instagram.com/onwei",
    });
    expect(withLink.html).toContain("https://instagram.com/onwei");
  });

  it("uses absolute image urls and has no em dash", () => {
    const email = renderWaitlistWelcomeEmail({ fullName: "Asha" });
    expect(email.html).toContain(
      "https://www.onwei.in/images/email/envelope.png",
    );
    expect(email.html + email.text + email.subject).not.toContain(EM_DASH);
  });
});

describe("renderCustomerWelcomeEmail", () => {
  it("works without a name and links to the collection", () => {
    const email = renderCustomerWelcomeEmail();
    expect(email.text).toContain("Hey,");
    expect(email.html).toContain("https://www.onwei.in/collection/all");
    expect(email.html + email.text + email.subject).not.toContain(EM_DASH);
  });
});

describe("email senders", () => {
  it("falls back to console without an api key", () => {
    expect(createEmailSender({})).toBeInstanceOf(ConsoleEmailSender);
    expect(createEmailSender({ RESEND_API_KEY: "k" })).toBeInstanceOf(
      ResendEmailSender,
    );
  });

  it("posts to resend with the expected payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    await new ResendEmailSender("k", "Onwei <hello@onwei.in>").send("a@b.co", {
      subject: "s",
      html: "<p>h</p>",
      text: "t",
    });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    expect(JSON.parse(init.body)).toMatchObject({
      to: ["a@b.co"],
      subject: "s",
      from: "Onwei <hello@onwei.in>",
    });
    vi.unstubAllGlobals();
  });

  it("sendEmailSafely swallows provider errors", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const ok = await sendEmailSafely(
      "a@b.co",
      { subject: "s", html: "h", text: "t" },
      {
        send: async () => {
          throw new Error("boom");
        },
      },
    );
    expect(ok).toBe(false);
    errorSpy.mockRestore();
  });
});
