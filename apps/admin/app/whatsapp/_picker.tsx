"use client";

import type { GupshupTemplateSummary, WhatsAppPurposeInfo } from "@onwei/core";
import { useEffect, useState } from "react";

export interface PickedTemplate {
  gupshupTemplateId: string;
  templateName: string;
  language: string;
  variables: string[];
  headerType: "NONE" | "TEXT" | "IMAGE";
  headerImageUrl: string | null;
  previewText: string;
}

export type ApprovedTemplate = GupshupTemplateSummary & {
  suggestedValues: string[];
};

/**
 * The approved Gupshup templates that fit this message, asked fresh each
 * time the popup opens, plus how many are still waiting for approval.
 */
export function useApprovedTemplates(purpose: WhatsAppPurposeInfo["purpose"]) {
  const [templates, setTemplates] = useState<ApprovedTemplate[] | null>(null);
  const [waiting, setWaiting] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      const response = await fetch(
        `/api/whatsapp/templates/gupshup?purpose=${purpose}`,
      ).catch(() => null);
      const data = (await response?.json().catch(() => null)) as {
        ok: boolean;
        templates?: ApprovedTemplate[];
        waiting?: number;
        error?: string;
      } | null;
      if (!live) return;
      if (data?.ok) {
        setTemplates(data.templates ?? []);
        setWaiting(data.waiting ?? 0);
      } else {
        setError(
          data?.error ??
            "Couldn't reach Gupshup just now. Try again in a minute.",
        );
      }
    })();
    return () => {
      live = false;
    };
  }, [purpose]);

  return { templates, waiting, error };
}

/** The form values a picked template fills in. */
export function pickedFrom(
  t: ApprovedTemplate,
  currentImageUrl: string | null,
): PickedTemplate {
  const header =
    t.header === "IMAGE" ? "IMAGE" : t.header === "TEXT" ? "TEXT" : "NONE";
  return {
    gupshupTemplateId: t.id,
    templateName: t.name,
    language: t.language,
    variables: t.suggestedValues,
    headerType: header,
    // Keep an image staff already uploaded, otherwise use Gupshup's.
    headerImageUrl:
      header === "IMAGE" ? (currentImageUrl ?? t.sampleImageUrl) : null,
    previewText: [t.bodyText, t.footer, ...t.buttons.map((b) => `[${b.text}]`)]
      .filter(Boolean)
      .join("\n\n"),
  };
}
