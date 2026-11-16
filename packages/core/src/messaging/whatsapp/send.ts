import { prisma, type WhatsAppPurpose } from "@onwei/database";
import {
  readGupshupConfig,
  sendGupshupTemplate,
  type GupshupConfig,
} from "./gupshupClient";
import { WHATSAPP_PURPOSES, buildTemplateParams } from "./purposes";

export interface SendWhatsAppInput {
  purpose: WhatsAppPurpose;
  /** E.164 */
  phone: string;
  values: Record<string, string | undefined>;
  waitlistEntryId?: string;
  customerId?: string;
}

export type SendWhatsAppResult =
  | { status: "sent"; messageId: string }
  | {
      status: "skipped";
      reason: "NOT_CONFIGURED" | "TEMPLATE_OFF" | "OPTED_OUT" | "MISSING_VALUE";
    }
  | { status: "failed"; reason: string };

export interface SendWhatsAppOptions {
  config?: GupshupConfig | null;
  fetchImpl?: typeof fetch;
}

type TemplateRow = NonNullable<
  Awaited<ReturnType<typeof prisma.whatsAppTemplate.findUnique>>
>;

/** A template can send when it is on, has an id, and has its image if it needs one. */
export function templateReady(template: TemplateRow | null): boolean {
  if (!template || !template.isActive || !template.gupshupTemplateId.trim()) {
    return false;
  }
  if (template.headerType === "IMAGE" && !template.headerImageUrl) {
    return false;
  }
  return template.variables.length > 0;
}

/** True when this kind of message would actually go out right now. */
export async function whatsAppAvailableFor(
  purpose: WhatsAppPurpose,
  config: GupshupConfig | null = readGupshupConfig(),
): Promise<boolean> {
  if (!config) return false;
  const template = await prisma.whatsAppTemplate.findUnique({
    where: { purpose },
  });
  return templateReady(template);
}

export async function isOptedOut(phone: string): Promise<boolean> {
  const row = await prisma.whatsAppOptOut.findUnique({
    where: { phone },
    select: { phone: true },
  });
  return row !== null;
}

/**
 * Sends one WhatsApp template message and logs it. Never throws: callers
 * (signup, sign-in, the Insider send) carry on whatever happens here.
 * `force` sends a template that is switched off, for the admin test.
 */
export async function sendWhatsApp(
  input: SendWhatsAppInput,
  options: SendWhatsAppOptions & { force?: boolean } = {},
): Promise<SendWhatsAppResult> {
  try {
    const config =
      options.config === undefined ? readGupshupConfig() : options.config;
    if (!config) return { status: "skipped", reason: "NOT_CONFIGURED" };

    const template = await prisma.whatsAppTemplate.findUnique({
      where: { purpose: input.purpose },
    });
    const ready = options.force
      ? templateReady(template ? { ...template, isActive: true } : null)
      : templateReady(template);
    if (!template || !ready) {
      return { status: "skipped", reason: "TEMPLATE_OFF" };
    }

    const info = WHATSAPP_PURPOSES[input.purpose];
    if (info.respectsOptOut && (await isOptedOut(input.phone))) {
      return { status: "skipped", reason: "OPTED_OUT" };
    }

    const params = buildTemplateParams(template.variables, input.values);
    if (!params) return { status: "skipped", reason: "MISSING_VALUE" };

    const log = await prisma.whatsAppMessage.create({
      data: {
        purpose: input.purpose,
        phone: input.phone,
        waitlistEntryId: input.waitlistEntryId,
        customerId: input.customerId,
      },
      select: { id: true },
    });

    const result = await sendGupshupTemplate(
      config,
      {
        phone: input.phone,
        templateId: template.gupshupTemplateId.trim(),
        params,
        imageUrl:
          template.headerType === "IMAGE" && info.allowsImage
            ? template.headerImageUrl
            : null,
      },
      options.fetchImpl,
    );

    const now = new Date();
    if (result.ok) {
      await prisma.whatsAppMessage.update({
        where: { id: log.id },
        data: {
          status: "SENT",
          sentAt: now,
          providerMessageId: result.messageId,
        },
      });
      return { status: "sent", messageId: result.messageId };
    }
    await prisma.whatsAppMessage.update({
      where: { id: log.id },
      data: { status: "FAILED", failedAt: now, failureReason: result.reason },
    });
    console.error("[whatsapp] send failed", input.purpose, result.reason);
    return { status: "failed", reason: result.reason };
  } catch (error) {
    console.error("[whatsapp] send error", input.purpose, error);
    return { status: "failed", reason: "Unexpected error" };
  }
}
