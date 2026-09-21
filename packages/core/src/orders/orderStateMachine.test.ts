import type { OrderStatus } from "@onwei/database";
import { describe, expect, it } from "vitest";
import { canTransition, nextStatuses } from "./orderStateMachine";

const ALL_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "RETURN_REQUESTED",
  "RETURNED",
  "REFUNDED",
];

describe("canTransition", () => {
  it.each([
    ["PENDING", "CONFIRMED"],
    ["PENDING", "CANCELLED"],
    ["CONFIRMED", "PACKED"],
    ["PACKED", "SHIPPED"],
    ["SHIPPED", "OUT_FOR_DELIVERY"],
    ["OUT_FOR_DELIVERY", "DELIVERED"],
    ["DELIVERED", "RETURN_REQUESTED"],
    ["RETURN_REQUESTED", "RETURNED"],
    ["RETURNED", "REFUNDED"],
    ["CANCELLED", "REFUNDED"],
  ] satisfies [OrderStatus, OrderStatus][])("allows %s -> %s", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each([
    ["PENDING", "DELIVERED"],
    ["PENDING", "SHIPPED"],
    ["DELIVERED", "PENDING"],
    ["REFUNDED", "PENDING"],
    ["CANCELLED", "CONFIRMED"],
  ] satisfies [OrderStatus, OrderStatus][])("rejects %s -> %s", (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });

  it("rejects transitioning to the same status", () => {
    for (const status of ALL_STATUSES) {
      expect(canTransition(status, status)).toBe(false);
    }
  });

  it("REFUNDED is terminal", () => {
    expect(nextStatuses("REFUNDED")).toEqual([]);
  });
});
