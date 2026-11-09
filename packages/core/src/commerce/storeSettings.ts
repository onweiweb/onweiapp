import { prisma } from "@onwei/database";
import { writeAuditLog } from "../admin/auditLog";
import type { AuditActor } from "../admin/types";
import { toMinorUnits } from "../catalog/helpers";

const SINGLETON_ID = "singleton";

/** Shop rules in paise, ready for the pricing engine. */
export interface StoreSettings {
  freeShippingThreshold: number;
  deliveryFee: number;
  codEnabled: boolean;
  codFee: number;
  codMinOrder: number | null;
  codMaxOrder: number | null;
  paymentHoldMinutes: number;
  returnWindowDays: number;
  returnsAllowRefund: boolean;
  returnsAllowExchange: boolean;
  returnSaleItems: boolean;
  returnReasons: string[];
  returnConditionNote: string;
  returnShippingNote: string;
}

type Row = Awaited<ReturnType<typeof prisma.storeSetting.upsert>>;

function toSettings(row: Row): StoreSettings {
  return {
    freeShippingThreshold: toMinorUnits(row.freeShippingThreshold),
    deliveryFee: toMinorUnits(row.deliveryFee),
    codEnabled: row.codEnabled,
    codFee: toMinorUnits(row.codFee),
    codMinOrder: row.codMinOrder ? toMinorUnits(row.codMinOrder) : null,
    codMaxOrder: row.codMaxOrder ? toMinorUnits(row.codMaxOrder) : null,
    paymentHoldMinutes: row.paymentHoldMinutes,
    returnWindowDays: row.returnWindowDays,
    returnsAllowRefund: row.returnsAllowRefund,
    returnsAllowExchange: row.returnsAllowExchange,
    returnSaleItems: row.returnSaleItems,
    returnReasons: row.returnReasons,
    returnConditionNote: row.returnConditionNote,
    returnShippingNote: row.returnShippingNote,
  };
}

// Read on every cart view; an admin change shows within this window
// (updateStoreSettings clears it straight away for its own process).
const CACHE_TTL_MS = 15_000;
let cached: { value: StoreSettings; expiresAt: number } | null = null;

/** Created with sensible defaults the first time it's read. */
export async function getStoreSettings(): Promise<StoreSettings> {
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const row =
    (await prisma.storeSetting.findUnique({ where: { id: SINGLETON_ID } })) ??
    (await prisma.storeSetting.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID },
      update: {},
    }));
  const value = toSettings(row);
  cached = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

export function clearStoreSettingsCache(): void {
  cached = null;
}

/** Whether cash on delivery is offered for an order of this total (paise). */
export function codAllowedFor(settings: StoreSettings, total: number): boolean {
  if (!settings.codEnabled) return false;
  if (settings.codMinOrder !== null && total < settings.codMinOrder)
    return false;
  if (settings.codMaxOrder !== null && total > settings.codMaxOrder)
    return false;
  return true;
}

export interface UpdateStoreSettingsInput {
  /** Rupees. */
  freeShippingThreshold?: number;
  deliveryFee?: number;
  codEnabled?: boolean;
  codFee?: number;
  codMinOrder?: number | null;
  codMaxOrder?: number | null;
  paymentHoldMinutes?: number;
  returnWindowDays?: number;
  returnsAllowRefund?: boolean;
  returnsAllowExchange?: boolean;
  returnSaleItems?: boolean;
  returnReasons?: string[];
  returnConditionNote?: string;
  returnShippingNote?: string;
}

export async function updateStoreSettings(
  input: UpdateStoreSettingsInput,
  actor: AuditActor,
): Promise<StoreSettings> {
  await getStoreSettings();
  const row = await prisma.$transaction(async (tx) => {
    const before = await tx.storeSetting.findUniqueOrThrow({
      where: { id: SINGLETON_ID },
    });
    const after = await tx.storeSetting.update({
      where: { id: SINGLETON_ID },
      data: {
        ...input,
        returnReasons: input.returnReasons
          ?.map((reason) => reason.trim())
          .filter(Boolean),
        updatedByStaffId: actor.staffUserId,
      },
    });
    await writeAuditLog(
      {
        staffUserId: actor.staffUserId,
        action: "storeSetting.update",
        entityType: "StoreSetting",
        entityId: SINGLETON_ID,
        beforeState: before,
        afterState: after,
      },
      tx,
    );
    return after;
  });
  cached = null;
  return toSettings(row);
}
