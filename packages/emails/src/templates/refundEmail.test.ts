import { describe, expect, it } from "vitest";
import { maskUpi, renderRefundEmail } from "./orderEmails";

describe("renderRefundEmail", () => {
  it("tells an online payer the money goes back to how they paid", () => {
    const email = renderRefundEmail({
      name: "Asha Rao",
      orderNumber: "ONW1001",
      amount: 129900,
      method: "ONLINE",
      reason: "your return",
      siteUrl: "https://www.onwei.in",
    });
    expect(email.subject).toBe(
      "Your refund of ₹1,299 for Onwei order #ONW1001",
    );
    expect(email.text).toContain("Asha, we've refunded ₹1,299 for your return");
    expect(email.text).toContain("5 to 7 working days");
    expect(email.html).toContain("https://www.onwei.in/account/orders/ONW1001");
  });

  it("shows a cash on delivery refund's UPI id partly hidden", () => {
    const email = renderRefundEmail({
      name: null,
      orderNumber: "ONW1002",
      amount: 49950,
      method: "UPI",
      upiId: "asharao@okaxis",
      reason: "your return",
    });
    expect(email.text).toContain("₹499.50");
    expect(email.text).toContain("as*****@okaxis");
    expect(email.text).not.toContain("asharao");
  });

  it("escapes what it puts in the page", () => {
    const email = renderRefundEmail({
      name: "<b>x</b>",
      orderNumber: "ONW1003",
      amount: 100,
      method: "ONLINE",
      reason: "<script>",
    });
    expect(email.html).not.toContain("<script>");
  });
});

describe("maskUpi", () => {
  it("keeps the first two letters and the bank", () => {
    expect(maskUpi("ab@ybl")).toBe("ab***@ybl");
    expect(maskUpi("9876543210@paytm")).toBe("98********@paytm");
  });
});
