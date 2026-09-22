import type { OrderStatus } from "@onwei/database";

export interface UpdateOrderStatusInput {
  orderId: string;
  toStatus: OrderStatus;
  note?: string | null;
}
