import { describe, expect, it } from "vitest";
import {
  renderOrderDeliveredEmail,
  renderOrderShippedEmail,
} from "./orderEmails";

const base = {
  name: "Asha Rao",
  orderNumber: "ONW1001",
  paymentMethod: "COD" as const,
  amountDue: 129900,
  courierName: "Delhivery",
  trackingNumber: "1333110042856",
  trackingUrl: "https://ithinklogistics.co.in/postship/tracking/1333110042856",
  siteUrl: "https://www.onwei.in",
};

describe("order delivery emails", () => {
  it("shipped: courier, tracking link and cash to keep ready", () => {
    const email = renderOrderShippedEmail(base);
    expect(email.subject).toBe("Your Onwei order #ONW1001 is on its way");
    expect(email.html).toContain(base.trackingUrl);
    expect(email.text).toContain("Delhivery, tracking number 1333110042856");
    expect(email.text).toContain("₹1,299");
    const prepaid = renderOrderShippedEmail({
      ...base,
      paymentMethod: "RAZORPAY",
      amountDue: 0,
    });
    expect(prepaid.text).not.toContain("keep");
  });

  it("shipped without iThink links to the order page", () => {
    const email = renderOrderShippedEmail({ ...base, trackingUrl: null });
    expect(email.html).toContain("https://www.onwei.in/account/orders/ONW1001");
  });

  it("delivered: return window and the name escaped", () => {
    const email = renderOrderDeliveredEmail({
      ...base,
      name: "<Asha>",
      returnWindowDays: 7,
    });
    expect(email.subject).toBe("Your Onwei order #ONW1001 has been delivered");
    expect(email.text).toContain("within 7 days");
    expect(email.html).not.toContain("<Asha>");
  });
});
