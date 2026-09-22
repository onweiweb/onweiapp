/**
 * Maps every admin-visible status enum to one of 4 tones. Only the 6 Onwei
 * color tokens exist (no red), so "problem" states use the darkest token
 * (onwei-black) as the stand-in for "needs attention" instead of a semantic
 * red. See the admin build-out plan for the full rationale.
 */
export type StatusTone = "pending" | "active" | "success" | "problem";

export function orderStatusTone(
  status:
    | "PENDING"
    | "CONFIRMED"
    | "PACKED"
    | "SHIPPED"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "CANCELLED"
    | "RETURN_REQUESTED"
    | "RETURNED"
    | "REFUNDED",
): StatusTone {
  switch (status) {
    case "PENDING":
    case "RETURN_REQUESTED":
      return "pending";
    case "CONFIRMED":
    case "PACKED":
    case "SHIPPED":
    case "OUT_FOR_DELIVERY":
    case "RETURNED":
      return "active";
    case "DELIVERED":
    case "REFUNDED":
      return "success";
    case "CANCELLED":
      return "problem";
  }
}

export function paymentStatusTone(
  status: "INITIATED" | "SUCCESS" | "FAILED" | "REFUNDED",
): StatusTone {
  switch (status) {
    case "INITIATED":
      return "pending";
    case "SUCCESS":
    case "REFUNDED":
      return "success";
    case "FAILED":
      return "problem";
  }
}

export function returnStatusTone(
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "PICKED_UP" | "REFUNDED",
): StatusTone {
  switch (status) {
    case "REQUESTED":
      return "pending";
    case "APPROVED":
    case "PICKED_UP":
      return "active";
    case "REFUNDED":
      return "success";
    case "REJECTED":
      return "problem";
  }
}

export function dsrStatusTone(
  status: "RECEIVED" | "IN_PROGRESS" | "FULFILLED" | "REJECTED",
): StatusTone {
  switch (status) {
    case "RECEIVED":
      return "pending";
    case "IN_PROGRESS":
      return "active";
    case "FULFILLED":
      return "success";
    case "REJECTED":
      return "problem";
  }
}

export function reviewApprovalTone(isApproved: boolean): StatusTone {
  return isApproved ? "success" : "pending";
}
