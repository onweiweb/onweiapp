import { beforeEach, describe, expect, it, vi } from "vitest";

const sendWhatsApp = vi.fn();

vi.mock("../messaging/whatsapp/send", () => ({ sendWhatsApp }));

process.env.INSIDER_LINK_SECRET = "s".repeat(40);

const member = {
  id: "entry-1",
  fullName: "Priya Sharma",
  phone: "+919876543210",
  insiderCode: "WEI4821",
};

describe("sendInsiderWhatsApp", () => {
  beforeEach(() => sendWhatsApp.mockReset());

  it("sends the code and a signed address token", async () => {
    sendWhatsApp.mockResolvedValue({ status: "sent", messageId: "m" });
    const { sendInsiderWhatsApp } = await import("./insiderWelcome");
    expect(await sendInsiderWhatsApp(member)).toBe("sent");
    const [input] = sendWhatsApp.mock.calls[0]!;
    expect(input).toMatchObject({
      purpose: "INSIDER_CODE",
      phone: "+919876543210",
      waitlistEntryId: "entry-1",
      values: { firstName: "Priya", insiderCode: "WEI4821" },
    });
    expect(input.values.addressToken).toMatch(/^entry-1\.\d+\./);
  });

  it("reports a failed WhatsApp without throwing", async () => {
    sendWhatsApp.mockResolvedValue({ status: "failed", reason: "x" });
    const { sendInsiderWhatsApp } = await import("./insiderWelcome");
    expect(await sendInsiderWhatsApp(member)).toBe("failed");
  });

  it("skips members without a phone", async () => {
    const { sendInsiderWhatsApp } = await import("./insiderWelcome");
    expect(await sendInsiderWhatsApp({ ...member, phone: "" })).toBe("skipped");
    expect(sendWhatsApp).not.toHaveBeenCalled();
  });
});
