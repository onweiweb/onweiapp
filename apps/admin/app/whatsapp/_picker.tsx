"use client";

import type { GupshupTemplateSummary, WhatsAppPurposeInfo } from "@onwei/core";
import { useEffect, useState } from "react";
import { AdminSelect, Field } from "../_components/ui";

export interface PickedTemplate {
  gupshupTemplateId: string;
  templateName: string;
  language: string;
  variables: string[];
  headerType: "NONE" | "TEXT" | "IMAGE";
  headerImageUrl: string | null;
  previewText: string;
}

type PickerTemplate = GupshupTemplateSummary & {
  fits: boolean;
  suggestedValues: string[];
};

const STATUS_WORDS: Record<string, string> = {
  APPROVED: "approved",
  PENDING: "waiting for approval",
  REJECTED: "rejected",
};

function previewOf(t: PickerTemplate): string {
  return [t.bodyText, t.footer, ...t.buttons.map((b) => `[${b.text}]`)]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Lists the app's templates from Gupshup; picking one fills in the form.
 * Asked fresh each time the popup opens.
 */
export function GupshupPicker({
  info,
  currentId,
  currentImageUrl,
  onPick,
}: {
  info: WhatsAppPurposeInfo;
  currentId: string;
  currentImageUrl: string | null;
  onPick: (values: PickedTemplate) => void;
}) {
  const [templates, setTemplates] = useState<PickerTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chosenId, setChosenId] = useState(currentId);

  useEffect(() => {
    let live = true;
    void (async () => {
      const response = await fetch(
        `/api/whatsapp/templates/gupshup?purpose=${info.purpose}`,
      ).catch(() => null);
      const data = (await response?.json().catch(() => null)) as {
        ok: boolean;
        templates?: PickerTemplate[];
        error?: string;
      } | null;
      if (!live) return;
      if (data?.ok) setTemplates(data.templates ?? []);
      else
        setError(
          data?.error ??
            "Couldn't reach Gupshup just now. Try again in a minute.",
        );
    })();
    return () => {
      live = false;
    };
  }, [info.purpose]);

  const chosen = templates?.find((t) => t.id === chosenId) ?? null;

  function choose(id: string) {
    setChosenId(id);
    const t = templates?.find((x) => x.id === id);
    if (!t) return;
    const header =
      t.header === "IMAGE" && info.allowsImage
        ? "IMAGE"
        : t.header === "TEXT"
          ? "TEXT"
          : "NONE";
    onPick({
      gupshupTemplateId: t.id,
      templateName: t.name,
      language: t.language,
      variables: t.suggestedValues,
      headerType: header,
      // Keep an image staff already uploaded, otherwise use Gupshup's.
      headerImageUrl:
        header === "IMAGE" ? (currentImageUrl ?? t.sampleImageUrl) : null,
      previewText: previewOf(t),
    });
  }

  const warnings: string[] = [];
  if (chosen) {
    if (!chosen.fits) {
      warnings.push(
        info.category === "Authentication"
          ? `This template is ${chosen.category.toLowerCase()}. Sign-in codes need an authentication template.`
          : `This template is ${chosen.category.toLowerCase()}. This message needs a utility or marketing template.`,
      );
    }
    if (chosen.status !== "APPROVED") {
      warnings.push(
        `WhatsApp hasn't approved it yet (${STATUS_WORDS[chosen.status] ?? chosen.status.toLowerCase()}). You can save it now and switch it on once it's approved.`,
      );
    }
    if (chosen.header === "UNSUPPORTED") {
      warnings.push(
        `It has a ${chosen.templateType.toLowerCase()} at the top, which Onwei can't send yet. Pick an image or text template.`,
      );
    }
    if (chosen.header === "IMAGE" && !info.allowsImage) {
      warnings.push(
        "This message can't have an image. Pick a template without one.",
      );
    }
  }

  return (
    <Field
      label="Pick from Gupshup"
      hint="Your templates in Gupshup. Picking one fills in the details below, check the values and save."
    >
      {error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : templates === null ? (
        <p className="text-sm text-onwei-blue/70">
          Loading templates from Gupshup...
        </p>
      ) : templates.length === 0 ? (
        <p className="text-sm text-onwei-blue/70">
          No templates in Gupshup yet.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <AdminSelect
            value={chosenId}
            onChange={(e) => choose(e.target.value)}
          >
            <option value="">Choose a template</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.category.toLowerCase()} ·{" "}
                {STATUS_WORDS[t.status] ?? t.status.toLowerCase()}
                {t.fits ? "" : " (different category)"}
              </option>
            ))}
          </AdminSelect>
          {warnings.map((w) => (
            <p key={w} className="text-xs text-amber-800">
              {w}
            </p>
          ))}
        </div>
      )}
    </Field>
  );
}
