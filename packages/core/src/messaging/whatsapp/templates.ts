import {
  prisma,
  type WhatsAppHeader,
  type WhatsAppPurpose,
  type WhatsAppStatus,
} from "@onwei/database";
import { writeAuditLog } from "../../admin/auditLog";
import { failureKindOf, groupFailures, type FailureGroup } from "./failures";
import {
  WHATSAPP_PURPOSES,
  isAllowedVariable,
  type TemplatePurpose,
} from "./purposes";

export interface WhatsAppTemplateView {
  purpose: TemplatePurpose;
  gupshupTemplateId: string;
  templateName: string;
  language: string;
  variables: string[];
  headerType: WhatsAppHeader;
  headerImageUrl: string | null;
  previewText: string;
  isActive: boolean;
  updatedAt: string | null;
}

const MAX_VARIABLES = 10;

/** One entry per kind of message, saved or not yet. */
export async function listWhatsAppTemplates(): Promise<WhatsAppTemplateView[]> {
  const rows = await prisma.whatsAppTemplate.findMany();
  const byPurpose = new Map(rows.map((row) => [row.purpose, row]));
  return Object.values(WHATSAPP_PURPOSES).map((info) => {
    const row = byPurpose.get(info.purpose);
    return {
      purpose: info.purpose,
      gupshupTemplateId: row?.gupshupTemplateId ?? "",
      templateName: row?.templateName ?? "",
      language: row?.language ?? "en",
      variables: row?.variables ?? info.variables.map((v) => v.key),
      headerType: row?.headerType ?? "NONE",
      headerImageUrl: row?.headerImageUrl ?? null,
      previewText: row?.previewText ?? "",
      isActive: row?.isActive ?? false,
      updatedAt: row?.updatedAt.toISOString() ?? null,
    };
  });
}

export interface SaveWhatsAppTemplateInput {
  purpose: TemplatePurpose;
  gupshupTemplateId: string;
  templateName: string;
  language: string;
  variables: string[];
  headerType: WhatsAppHeader;
  headerImageUrl: string | null;
  previewText: string;
  isActive: boolean;
}

export type SaveWhatsAppTemplateResult =
  { ok: true } | { ok: false; error: string };

/** Checks a template before saving. Pure, so it is unit tested. */
export function checkWhatsAppTemplate(
  input: SaveWhatsAppTemplateInput,
): string | null {
  const info = WHATSAPP_PURPOSES[input.purpose];
  if (input.variables.length === 0) {
    return "Add at least one value to fill in.";
  }
  if (input.variables.length > MAX_VARIABLES) {
    return `A template can fill in at most ${MAX_VARIABLES} values.`;
  }
  const unknown = input.variables.find(
    (key) => !isAllowedVariable(input.purpose, key),
  );
  if (unknown) return `"${unknown}" can't be used in this message.`;
  if (input.headerType === "IMAGE" && !info.allowsImage) {
    return "Sign-in code messages can't have an image (WhatsApp doesn't allow it).";
  }
  if (input.headerImageUrl && !/^https:\/\//.test(input.headerImageUrl)) {
    return "The image link must start with https://.";
  }
  if (input.isActive) {
    if (!input.gupshupTemplateId.trim()) {
      return "Add the Gupshup template ID before switching it on.";
    }
    if (input.headerType === "IMAGE" && !input.headerImageUrl) {
      return "Upload the image before switching it on.";
    }
  }
  return null;
}

export async function saveWhatsAppTemplate(
  input: SaveWhatsAppTemplateInput,
  staffUserId: string,
): Promise<SaveWhatsAppTemplateResult> {
  const error = checkWhatsAppTemplate(input);
  if (error) return { ok: false, error };

  const data = {
    gupshupTemplateId: input.gupshupTemplateId.trim(),
    templateName: input.templateName.trim(),
    language: input.language.trim() || "en",
    variables: input.variables,
    headerType: input.headerType,
    headerImageUrl:
      input.headerType === "IMAGE" ? input.headerImageUrl || null : null,
    previewText: input.previewText.trim(),
    isActive: input.isActive,
    updatedById: staffUserId,
  };

  await prisma.$transaction(async (tx) => {
    const before = await tx.whatsAppTemplate.findUnique({
      where: { purpose: input.purpose },
    });
    const saved = await tx.whatsAppTemplate.upsert({
      where: { purpose: input.purpose },
      create: { purpose: input.purpose, ...data },
      update: data,
    });
    await writeAuditLog(
      {
        staffUserId,
        action: "whatsapp_template.save",
        entityType: "WhatsAppTemplate",
        entityId: saved.id,
        beforeState: before
          ? {
              gupshupTemplateId: before.gupshupTemplateId,
              variables: before.variables,
              headerType: before.headerType,
              isActive: before.isActive,
            }
          : null,
        afterState: {
          purpose: input.purpose,
          gupshupTemplateId: data.gupshupTemplateId,
          variables: data.variables,
          headerType: data.headerType,
          isActive: data.isActive,
        },
      },
      tx,
    );
  });
  return { ok: true };
}

export interface WhatsAppPurposeStats {
  purpose: WhatsAppPurpose;
  total: number;
  /** FAILED leaves out Meta's holds, counted in `held`. */
  byStatus: Record<WhatsAppStatus, number>;
  held: number;
  topFailures: FailureGroup[];
}

/** Counts only, no phone numbers. */
export async function getWhatsAppStats(
  days = 7,
  now: Date = new Date(),
): Promise<WhatsAppPurposeStats[]> {
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const [grouped, failures] = await Promise.all([
    prisma.whatsAppMessage.groupBy({
      by: ["purpose", "status", "failureCode"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.whatsAppMessage.groupBy({
      by: ["purpose", "failureCode", "failureReason"],
      where: { createdAt: { gte: since }, status: "FAILED" },
      _count: { _all: true },
    }),
  ]);

  return Object.values(WHATSAPP_PURPOSES).map(({ purpose }) => {
    const byStatus: Record<WhatsAppStatus, number> = {
      SENDING: 0,
      SENT: 0,
      DELIVERED: 0,
      READ: 0,
      FAILED: 0,
    };
    let held = 0;
    for (const row of grouped) {
      if (row.purpose !== purpose) continue;
      if (row.status === "FAILED" && failureKindOf(row.failureCode) === "HELD")
        held += row._count._all;
      else byStatus[row.status] += row._count._all;
    }
    const topFailures = groupFailures(
      failures.filter((row) => row.purpose === purpose),
    ).slice(0, 3);
    const total = Object.values(byStatus).reduce((sum, n) => sum + n, 0) + held;
    return { purpose, total, byStatus, held, topFailures };
  });
}

export async function countWhatsAppOptOuts(): Promise<number> {
  return prisma.whatsAppOptOut.count();
}
