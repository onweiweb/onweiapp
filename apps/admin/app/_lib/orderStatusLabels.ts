import type { OrderStatus, PaymentStatus, ReturnStatus } from "@onwei/database";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURN_REQUESTED: "Return requested",
  RETURNED: "Returned",
  REFUNDED: "Refunded",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  INITIATED: "Started",
  SUCCESS: "Paid",
  FAILED: "Failed",
  REFUNDED: "Refunded",
};

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  REQUESTED: "Requested",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PICKED_UP: "Picked up",
  REFUNDED: "Refunded",
};
