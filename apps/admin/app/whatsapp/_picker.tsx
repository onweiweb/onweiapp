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

type PickerTemplate = GupshupTemplateSummary & { suggestedValues: string[] };

function previewOf(t: PickerTemplate): string {
  return [t.bodyText, t.footer, ...t.buttons.map((b) => `[${b.text}]`)]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * The approved Gupshup templates that fit this message, as cards. Picking
 * one fills in the form. Asked fresh each time the popup opens.
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
  const [waiting, setWaiting] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      const response = await fetch(
        `/api/whatsapp/templates/gupshup?purpose=${info.purpose}`,
      ).catch(() => null);
      const data = (await response?.json().catch(() => null)) as {
        ok: boolean;
        templates?: PickerTemplate[];
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
  }, [info.purpose]);

  function choose(t: PickerTemplate) {
    const header =
      t.header === "IMAGE" ? "IMAGE" : t.header === "TEXT" ? "TEXT" : "NONE";
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

  const waitingNote =
    waiting > 0
      ? ` ${waiting} ${waiting === 1 ? "template is" : "templates are"} still waiting for WhatsApp's approval.`
      : "";

  if (error) return <p className="text-sm text-onwei-black">{error}</p>;
  if (templates === null) {
    return (
      <p className="text-sm text-onwei-blue/70">
        Loading approved templates from Gupshup...
      </p>
    );
  }
  if (templates.length === 0) {
    return (
      <p className="text-sm text-onwei-blue/80">
        No approved {info.category.toLowerCase()} templates in Gupshup yet.
        Create one there and come back once WhatsApp approves it.{waitingNote}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        role="radiogroup"
        aria-label="Approved templates"
        className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1"
      >
        {templates.map((t) => {
          const selected = t.id === currentId;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => choose(t)}
              className={`rounded-xl border px-4 py-3 text-left text-sm ${
                selected
                  ? "border-onwei-blue bg-onwei-beige/40"
                  : "border-onwei-beige hover:border-onwei-blue/50"
              }`}
            >
              <span className="flex flex-wrap items-center gap-x-2 font-medium">
                {selected ? "✓ " : ""}
                {t.name}
                <span className="text-xs font-normal text-onwei-blue/60">
                  {t.category.toLowerCase()} · {t.language}
                  {t.header === "IMAGE" ? " · with image" : ""}
                </span>
              </span>
              <span className="mt-1 line-clamp-2 text-xs text-onwei-blue/70">
                {t.bodyText}
              </span>
            </button>
          );
        })}
      </div>
      {waitingNote ? (
        <p className="text-xs text-onwei-blue/60">{waitingNote.trim()}</p>
      ) : null}
    </div>
  );
}
