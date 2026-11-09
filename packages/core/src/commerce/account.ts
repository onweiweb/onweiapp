import { prisma, type OrderStatus, type ReturnStatus } from "@onwei/database";
import { toMinorUnits } from "../catalog/helpers";
import { INDIAN_STATES } from "../insiders/cardAddress";
import { validatePhone } from "../validation/phone";
import {
  getCustomerIdentity,
  getInsiderStatus,
  type InsiderStatus,
} from "./customerIdentity";
import type { AddressSnapshot } from "./orders";
import { getStoreSettings } from "./storeSettings";

/** Everything the account page and checkout need about the customer. */
export interface AccountSummary {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: boolean;
  phone: string | null;
  phoneVerified: boolean;
  insider: InsiderStatus | null;
}

export async function getAccountSummary(
  customerId: string,
): Promise<AccountSummary | null> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerifiedAt: true,
      phone: true,
      phoneVerifiedAt: true,
    },
  });
  if (!customer) return null;
  const identity = await getCustomerIdentity(customerId);
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    emailVerified: Boolean(customer.emailVerifiedAt),
    phone: customer.phone,
    phoneVerified: Boolean(customer.phoneVerifiedAt),
    insider: identity ? await getInsiderStatus(identity) : null,
  };
}

export async function updateCustomerName(
  customerId: string,
  name: string,
): Promise<{ ok: boolean }> {
  const clean = name.replace(/\s+/g, " ").trim();
  if (clean.length < 2 || clean.length > 80) return { ok: false };
  await prisma.customer.update({
    where: { id: customerId },
    data: { name: clean },
  });
  return { ok: true };
}

/**
 * Adds a verified email or phone to the signed-in account (after the code
 * was checked). Refused if another account already owns it.
 */
export async function linkVerifiedContact(
  customerId: string,
  channel: "EMAIL" | "SMS" | "WHATSAPP",
  identifier: string,
): Promise<{ ok: true } | { ok: false; reason: "TAKEN" }> {
  const isEmail = channel === "EMAIL";
  const owner = await prisma.customer.findFirst({
    where: isEmail ? { email: identifier } : { phone: identifier },
    select: { id: true },
  });
  if (owner && owner.id !== customerId) return { ok: false, reason: "TAKEN" };
  await prisma.customer.update({
    where: { id: customerId },
    data: isEmail
      ? { email: identifier, emailVerifiedAt: new Date() }
      : { phone: identifier, phoneVerifiedAt: new Date() },
  });
  return { ok: true };
}

// ---------------------------------------------------------------- addresses

export interface AddressView {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
}

export async function listAddresses(
  customerId: string,
): Promise<AddressView[]> {
  return prisma.address.findMany({
    where: { customerId, deletedAt: null, type: "SHIPPING" },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      fullName: true,
      phone: true,
      line1: true,
      line2: true,
      city: true,
      state: true,
      postalCode: true,
      isDefault: true,
    },
  });
}

export type AddressField =
  "fullName" | "phone" | "line1" | "city" | "state" | "postalCode";

export interface AddressInput {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault?: boolean;
}

const PIN = /^[1-9]\d{5}$/;
const clean = (v: string | undefined) => (v ?? "").replace(/\s+/g, " ").trim();

export function validateAddress(
  input: AddressInput,
):
  | { ok: true; data: Omit<AddressView, "id" | "isDefault"> }
  | { ok: false; fields: AddressField[] } {
  const phone = validatePhone(input.phone, { allowInternational: false });
  const data = {
    fullName: clean(input.fullName),
    phone: phone.e164 ?? "",
    line1: clean(input.line1),
    line2: clean(input.line2) || null,
    city: clean(input.city),
    state: clean(input.state),
    postalCode: clean(input.postalCode).replace(/\s/g, ""),
  };
  const fields: AddressField[] = [];
  if (data.fullName.length < 2) fields.push("fullName");
  if (!phone.valid) fields.push("phone");
  if (data.line1.length < 3) fields.push("line1");
  if (data.city.length < 2) fields.push("city");
  if (!(INDIAN_STATES as readonly string[]).includes(data.state))
    fields.push("state");
  if (!PIN.test(data.postalCode)) fields.push("postalCode");
  return fields.length ? { ok: false, fields } : { ok: true, data };
}

export async function saveAddress(
  customerId: string,
  input: AddressInput,
  addressId?: string,
): Promise<
  | { ok: true; address: AddressView }
  | { ok: false; fields?: AddressField[]; reason?: "NOT_FOUND" }
> {
  const checked = validateAddress(input);
  if (!checked.ok) return { ok: false, fields: checked.fields };
  const existingCount = await prisma.address.count({
    where: { customerId, deletedAt: null },
  });
  const makeDefault = input.isDefault === true || existingCount === 0;

  const address = await prisma.$transaction(async (tx) => {
    if (makeDefault) {
      await tx.address.updateMany({
        where: { customerId, isDefault: true },
        data: { isDefault: false },
      });
    }
    if (addressId) {
      const found = await tx.address.findFirst({
        where: { id: addressId, customerId, deletedAt: null },
      });
      if (!found) return null;
      return tx.address.update({
        where: { id: addressId },
        data: { ...checked.data, ...(makeDefault ? { isDefault: true } : {}) },
      });
    }
    return tx.address.create({
      data: {
        ...checked.data,
        customerId,
        type: "SHIPPING",
        country: "IN",
        isDefault: makeDefault,
      },
    });
  });
  if (!address) return { ok: false, reason: "NOT_FOUND" };
  return {
    ok: true,
    address: {
      id: address.id,
      fullName: address.fullName,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      isDefault: address.isDefault,
    },
  };
}

/** Soft delete: past orders keep their own copy of the address. */
export async function deleteAddress(
  customerId: string,
  addressId: string,
): Promise<boolean> {
  const result = await prisma.address.updateMany({
    where: { id: addressId, customerId, deletedAt: null },
    data: { deletedAt: new Date(), isDefault: false },
  });
  if (result.count === 1) {
    const next = await prisma.address.findFirst({
      where: { customerId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (
      next &&
      !(await prisma.address.count({
        where: { customerId, deletedAt: null, isDefault: true },
      }))
    ) {
      await prisma.address.update({
        where: { id: next.id },
        data: { isDefault: true },
      });
    }
  }
  return result.count === 1;
}

// ------------------------------------------------------------------- orders

const CURRENT: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
];

export interface OrderListItem {
  orderNumber: string;
  status: OrderStatus;
  placedAt: Date;
  total: number;
  itemCount: number;
  firstItem: { name: string; imageUrl: string | null } | null;
  paymentMethod: "RAZORPAY" | "COD";
  isCurrent: boolean;
  /** Waiting for payment, still within the hold. */
  awaitingPayment: boolean;
}

export async function listCustomerOrders(
  customerId: string,
): Promise<OrderListItem[]> {
  const orders = await prisma.order.findMany({
    where: {
      customerId,
      deletedAt: null,
      // Never-paid online orders that lapsed are noise, not orders.
      NOT: { status: "CANCELLED", paymentMethod: "RAZORPAY", paidAt: null },
    },
    orderBy: { placedAt: "desc" },
    take: 100,
    select: {
      orderNumber: true,
      status: true,
      placedAt: true,
      total: true,
      paymentMethod: true,
      reservationExpiresAt: true,
      items: {
        select: { productName: true, imageUrl: true, quantity: true },
        orderBy: { id: "asc" },
      },
    },
  });
  const now = Date.now();
  return orders.map((order) => ({
    orderNumber: order.orderNumber,
    status: order.status,
    placedAt: order.placedAt,
    total: toMinorUnits(order.total),
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    firstItem: order.items[0]
      ? { name: order.items[0].productName, imageUrl: order.items[0].imageUrl }
      : null,
    paymentMethod: order.paymentMethod,
    isCurrent: CURRENT.includes(order.status),
    awaitingPayment:
      order.status === "PENDING" &&
      order.paymentMethod === "RAZORPAY" &&
      (order.reservationExpiresAt?.getTime() ?? 0) > now,
  }));
}

export interface OrderDetailItem {
  id: string;
  productName: string;
  variantLabel: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
  /** Units the customer can still ask to return now. */
  returnableQuantity: number;
  returnBlockedReason:
    | "NOT_DELIVERED"
    | "WINDOW_CLOSED"
    | "NOT_RETURNABLE"
    | "ALREADY_REQUESTED"
    | null;
}

export interface OrderDetail {
  orderNumber: string;
  status: OrderStatus;
  placedAt: Date;
  paidAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  paymentMethod: "RAZORPAY" | "COD";
  paymentLabel: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: AddressSnapshot | null;
  items: OrderDetailItem[];
  subtotal: number;
  discounts: { label: string; amount: number; freeShipping: boolean }[];
  shippingFee: number;
  codFee: number;
  total: number;
  trackingNumber: string | null;
  courierName: string | null;
  timeline: { status: OrderStatus; at: Date }[];
  returns: {
    id: string;
    productName: string;
    quantity: number;
    status: ReturnStatus;
    resolution: "REFUND" | "EXCHANGE";
    refundAmount: number | null;
    requestedAt: Date;
    rejectionReason: string | null;
  }[];
  returnWindowEndsAt: Date | null;
  awaitingPayment: boolean;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  upi: "UPI",
  card: "Card",
  netbanking: "Net banking",
  wallet: "Wallet",
  emi: "EMI",
};

export async function getCustomerOrder(
  customerId: string,
  orderNumber: string,
): Promise<OrderDetail | null> {
  const order = await prisma.order.findFirst({
    where: { customerId, orderNumber, deletedAt: null },
    include: {
      items: { orderBy: { id: "asc" } },
      discounts: true,
      payments: {
        where: { status: { in: ["SUCCESS", "REFUNDED"] } },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
      statusHistory: { orderBy: { createdAt: "asc" } },
      returnRequests: {
        include: { orderItem: { select: { productName: true } } },
        orderBy: { requestedAt: "desc" },
      },
    },
  });
  if (!order) return null;
  const settings = await getStoreSettings();
  const windowEnds = order.deliveredAt
    ? new Date(
        order.deliveredAt.getTime() +
          settings.returnWindowDays * 24 * 60 * 60 * 1000,
      )
    : null;
  const windowOpen = windowEnds !== null && windowEnds.getTime() > Date.now();

  const items: OrderDetailItem[] = order.items.map((item) => {
    const requested = order.returnRequests
      .filter((r) => r.orderItemId === item.id && r.status !== "REJECTED")
      .reduce((sum, r) => sum + r.quantity, 0);
    const left = Math.max(0, item.quantity - requested);
    const returnable =
      item.isReturnable && (settings.returnSaleItems || !item.wasOnSale);
    let blocked: OrderDetailItem["returnBlockedReason"] = null;
    if (
      !order.deliveredAt ||
      !["DELIVERED", "RETURN_REQUESTED", "RETURNED"].includes(order.status)
    )
      blocked = "NOT_DELIVERED";
    else if (!returnable) blocked = "NOT_RETURNABLE";
    else if (!windowOpen) blocked = "WINDOW_CLOSED";
    else if (left === 0) blocked = "ALREADY_REQUESTED";
    return {
      id: item.id,
      productName: item.productName,
      variantLabel: item.variantLabel,
      imageUrl: item.imageUrl,
      quantity: item.quantity,
      unitPrice: toMinorUnits(item.unitPrice),
      total: toMinorUnits(item.totalAmount),
      returnableQuantity: blocked ? 0 : left,
      returnBlockedReason: blocked,
    };
  });

  const payment = order.payments[0];
  const paymentLabel =
    order.paymentMethod === "COD"
      ? order.codCollectedAt
        ? "Cash on delivery (paid)"
        : "Cash on delivery"
      : payment
        ? (PAYMENT_METHOD_LABELS[payment.method ?? ""] ?? "Paid online")
        : "Not paid yet";

  // One entry per status, the first time it was reached.
  const timeline: { status: OrderStatus; at: Date }[] = [];
  for (const entry of order.statusHistory) {
    if (!timeline.some((t) => t.status === entry.status))
      timeline.push({ status: entry.status, at: entry.createdAt });
  }

  return {
    orderNumber: order.orderNumber,
    status: order.status,
    placedAt: order.placedAt,
    paidAt: order.paidAt,
    shippedAt: order.shippedAt,
    deliveredAt: order.deliveredAt,
    paymentMethod: order.paymentMethod,
    paymentLabel,
    contactEmail: order.contactEmail,
    contactPhone: order.contactPhone,
    address:
      (order.shippingAddressSnapshot as unknown as AddressSnapshot | null) ??
      null,
    items,
    subtotal: toMinorUnits(order.subtotal),
    discounts: order.discounts.map((d) => ({
      label: d.label,
      amount: toMinorUnits(d.amount),
      freeShipping: d.freeShipping,
    })),
    shippingFee: toMinorUnits(order.shippingTotal),
    codFee: toMinorUnits(order.codFee),
    total: toMinorUnits(order.total),
    trackingNumber: order.trackingNumber,
    courierName: order.courierName,
    timeline,
    returns: order.returnRequests.map((r) => ({
      id: r.id,
      productName: r.orderItem.productName,
      quantity: r.quantity,
      status: r.status,
      resolution: r.resolution,
      refundAmount: r.refundAmount ? toMinorUnits(r.refundAmount) : null,
      requestedAt: r.requestedAt,
      rejectionReason: r.rejectionReason,
    })),
    returnWindowEndsAt: windowEnds,
    awaitingPayment:
      order.status === "PENDING" &&
      order.paymentMethod === "RAZORPAY" &&
      (order.reservationExpiresAt?.getTime() ?? 0) > Date.now(),
  };
}

/** For order emails: the order as the customer sees it, found by id. */
export async function getOrderDetailById(
  orderId: string,
): Promise<(OrderDetail & { customerName: string | null }) | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      customerId: true,
      orderNumber: true,
      customer: { select: { name: true } },
    },
  });
  if (!order) return null;
  const detail = await getCustomerOrder(order.customerId, order.orderNumber);
  return detail ? { ...detail, customerName: order.customer.name } : null;
}
