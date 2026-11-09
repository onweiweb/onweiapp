import { describe, expect, it } from "vitest";
import { renderContactAlertEmail } from "./contactEmails";

describe("renderContactAlertEmail", () => {
  it("names the sender and escapes what they typed", () => {
    const email = renderContactAlertEmail({
      fullName: "Asha",
      email: "asha@example.com",
      phone: null,
      message: "<b>hi</b>",
      adminUrl: "https://admin.onwei.in/messages",
    });
    expect(email.subject).toBe("New message from Asha");
    expect(email.text).toContain("Phone: not given");
    expect(email.html).toContain("&lt;b&gt;hi&lt;/b&gt;");
    expect(email.html).not.toContain("<b>hi</b>");
  });
});
