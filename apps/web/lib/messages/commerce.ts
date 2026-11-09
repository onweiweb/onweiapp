/**
 * Every customer-facing line for cart, sign-in, checkout, account and
 * returns (docs/COMMERCE_BUILD_PLAN.md section 11). The server answers with a
 * reason code; the UI shows the line from here. Change copy here only.
 */

export function rupees(paise: number): string {
  const hidePaise = paise % 100 === 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: hidePaise ? 0 : 2,
    maximumFractionDigits: hidePaise ? 0 : 2,
  }).format(paise / 100);
}

export const CART_ERRORS: Record<string, string> = {
  NOT_AVAILABLE: "This item isn't available right now.",
  OUT_OF_STOCK: "That's sold out for now.",
  INVALID_QUANTITY: "Pick a quantity from 1 to 10.",
  NETWORK: "We couldn't update your bag. Check your connection and try again.",
};

/** Why a code didn't apply, in plain words. */
export function codeMessage(input: {
  problem: string | null;
  short?: number;
  blockedBy?: string;
}): string {
  switch (input.problem) {
    case "NOT_VALID":
      return "This code isn't valid right now. Check the spelling or try another.";
    case "SIGN_IN_REQUIRED":
      return "Sign in to use this code.";
    case "FIRST_ORDER_ONLY":
      return "This code is for your first order only.";
    case "INSIDERS_ONLY":
      return "This code is for Onwei Insiders.";
    case "ALREADY_USED":
      return "You've already used this code.";
    case "INSIDER_CODE_NOT_YOURS":
      return "Insider codes only work when you're signed in with the email or phone you joined with.";
    case "INSIDER_SIGN_IN":
      return "Sign in with the email or phone you joined with to use your Insider code.";
    case "MIN_ORDER":
      return `Add ${rupees(input.short ?? 0)} more to use this code.`;
    case "MIN_ITEMS":
      return `Add ${input.short ?? 1} more item${input.short === 1 ? "" : "s"} to use this code.`;
    case "NO_ELIGIBLE_ITEMS":
      return "Nothing in your bag qualifies for this code.";
    case "PREPAID_ONLY":
      return "This code works with online payment only.";
    case "NOT_WITH_INSIDER":
      return "This code can't be used with your Insider discount. We've kept the one that saves you more.";
    case "NOT_WITH_COUPON":
      return input.blockedBy
        ? `This code can't be used with ${input.blockedBy}. We've kept the one that saves you more.`
        : "This code can't be combined with another offer.";
    case "BETTER_OFFER":
      return "Another offer in your bag saves you more, so we used that one.";
    case "RATE_LIMITED":
      return "That's a lot of tries. Wait a few minutes and try again.";
    default:
      return "We couldn't apply that code. Try again.";
  }
}

export const SIGN_IN_ERRORS: Record<string, string> = {
  INVALID_EMAIL: "That email doesn't look right. Check it and try again.",
  INVALID_PHONE: "Enter a 10-digit mobile number.",
  PHONE_UNAVAILABLE:
    "Signing in by phone isn't available yet. Use your email instead.",
  RATE_LIMITED: "Too many codes asked for. Wait a few minutes and try again.",
  SEND_FAILED: "We couldn't send the code. Try again in a moment.",
  CONSENT_REQUIRED: "Tick the box to agree to our Terms and Privacy Policy.",
  INCORRECT_CODE: "That code isn't right. Check it and try again.",
  EXPIRED: "That code has expired. Ask for a new one.",
  NOT_FOUND: "Ask for a new code and try again.",
  MAX_ATTEMPTS_EXCEEDED: "Too many wrong tries. Ask for a new code.",
  TAKEN: "This is already linked to another Onwei account.",
  NETWORK: "Something went wrong. Check your connection and try again.",
};

export const CHECKOUT_ERRORS: Record<string, string> = {
  NOT_SIGNED_IN: "Sign in to place your order.",
  EMPTY_CART: "Your bag is empty.",
  CART_NEEDS_ATTENTION:
    "Something in your bag needs a look before you pay. Check the items marked below.",
  ADDRESS_REQUIRED: "Add the address we should deliver to.",
  COD_NOT_AVAILABLE:
    "Cash on delivery isn't available for this order. Pay online instead.",
  PRICE_CHANGED:
    "Your total changed while you were checking out. Have a look at the new total, then place your order.",
  OUT_OF_STOCK:
    "Someone just bought the last of an item in your bag. We've updated it, take a look.",
  COUPON_USED_UP: "A code in your bag just ran out. We've updated your total.",
  PAYMENT_UNAVAILABLE:
    "Online payment isn't working right now. Try again in a minute, or choose cash on delivery.",
  SIGNATURE_MISMATCH:
    "We couldn't confirm that payment. If money left your account, it'll be refunded automatically.",
  EXPIRED:
    "This payment window has closed. Go back to your bag to check out again.",
  NETWORK: "Something went wrong. Check your connection and try again.",
};

export const ADDRESS_FIELD_ERRORS: Record<string, string> = {
  fullName: "Add the name we should deliver to.",
  phone: "Add a 10-digit mobile number so the courier can reach you.",
  line1: "Add your house or flat number and street.",
  city: "Add your city or town.",
  state: "Pick your state.",
  postalCode: "PIN codes are 6 digits, like 400050.",
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Waiting for payment",
  CONFIRMED: "Confirmed",
  PACKED: "Packing",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURN_REQUESTED: "Return requested",
  RETURNED: "Returned",
  REFUNDED: "Refunded",
};

export const RETURN_STATUS_LABELS: Record<string, string> = {
  REQUESTED: "We're reviewing it",
  APPROVED: "Approved, pickup coming",
  REJECTED: "Not accepted",
  PICKED_UP: "Picked up",
  RECEIVED: "Received by us",
  REFUNDED: "Refunded",
  EXCHANGED: "Exchange sent",
};

export const RETURN_ERRORS: Record<string, string> = {
  NOTHING_SELECTED: "Pick at least one item to return.",
  TOO_MANY: "You can't return more than you ordered.",
  NOT_RETURNABLE: "One of these items can't be returned.",
  INVALID_REASON: "Pick a reason.",
  RESOLUTION_NOT_OFFERED: "That option isn't offered right now.",
  UPI_REQUIRED:
    "Add your UPI ID (like name@okaxis) so we can send your refund.",
  NOT_FOUND: "We couldn't find that order.",
  NETWORK: "Something went wrong. Check your connection and try again.",
};

export const RETURN_BLOCKED_LABELS: Record<string, string> = {
  NOT_DELIVERED: "Returns open once it's delivered",
  WINDOW_CLOSED: "Return window has closed",
  NOT_RETURNABLE: "This item can't be returned",
  ALREADY_REQUESTED: "Return already requested",
};

/**
 * Plain words for Razorpay's failure reason codes (`error.reason`), shown on
 * the payment failed page. Matched loosely, since Razorpay adds codes over
 * time; anything unknown falls back to the general list of causes.
 */
const PAYMENT_FAILURE_PATTERNS: [RegExp, string][] = [
  [/insufficient|balance/, "Your bank said there wasn't enough balance."],
  [/otp|authentication|3ds|auth_/, "The OTP or bank check didn't go through."],
  [/timed?_?out|timeout|expired/, "The payment request timed out."],
  [/limit/, "You've hit the limit on your card or UPI app."],
  [/declined|rejected|blocked|risk/, "Your bank declined the payment."],
  [/invalid|incorrect|mismatch/, "The card or UPI details didn't match."],
  [/cancel/, "The payment was cancelled before it finished."],
  [
    /bank|server|technical|gateway|network/,
    "Your bank had a technical problem. Trying again usually works.",
  ],
];

export function paymentFailureMessage(code: string | undefined): string | null {
  if (!code || code === "payment_failed") return null;
  for (const [pattern, message] of PAYMENT_FAILURE_PATTERNS) {
    if (pattern.test(code)) return message;
  }
  return null;
}
