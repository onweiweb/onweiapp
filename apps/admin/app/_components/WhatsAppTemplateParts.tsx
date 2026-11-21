"use client";

import type { GupshupTemplateSummary } from "@onwei/core";
import { AdminBadge } from "./ui";

/**
 * WhatsApp template pieces shared by Insiders > WhatsApp sends and the
 * WhatsApp settings page: a compact, scrolling list of approved templates and
 * a phone-style preview of the message.
 */

type TemplateLike = Pick<
  GupshupTemplateSummary,
  | "id"
  | "name"
  | "category"
  | "language"
  | "header"
  | "bodyText"
  | "footer"
  | "buttons"
>;

export function TemplateList<T extends TemplateLike>({
  templates,
  error,
  emptyText,
  chosenId,
  onPick,
  disabled,
}: {
  templates: T[] | null;
  error: string | null;
  emptyText: string;
  chosenId: string | null;
  onPick: (template: T) => void;
  disabled?: boolean;
}) {
  if (error) {
    return (
      <p className="rounded-xl bg-onwei-beige px-3 py-2 text-sm text-onwei-blue">
        {error}
      </p>
    );
  }
  if (!templates) {
    return (
      <div className="flex flex-col gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-12 animate-pulse rounded-xl bg-onwei-beige/70"
          />
        ))}
      </div>
    );
  }
  if (templates.length === 0) {
    return (
      <p className="rounded-xl bg-onwei-beige px-3 py-2 text-sm text-onwei-blue">
        {emptyText}
      </p>
    );
  }
  return (
    <div
      role="radiogroup"
      aria-label="Approved templates"
      className="flex max-h-64 flex-col gap-1.5 overflow-y-auto pr-1"
    >
      {templates.map((template) => {
        const chosen = template.id === chosenId;
        return (
          <button
            key={template.id}
            type="button"
            role="radio"
            aria-checked={chosen}
            disabled={disabled}
            onClick={() => onPick(template)}
            className={`flex shrink-0 flex-col gap-0.5 rounded-xl border px-3 py-2 text-left transition ${
              chosen
                ? "border-onwei-blue bg-onwei-blue/[0.04] ring-1 ring-onwei-blue"
                : "border-onwei-blue/15 hover:border-onwei-blue/50"
            }`}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              {chosen ? (
                <span aria-hidden className="text-onwei-blue">
                  ✓
                </span>
              ) : null}
              <span className="min-w-0 truncate text-sm font-medium text-onwei-blue">
                {template.name}
              </span>
              <AdminBadge
                tone={
                  template.category === "AUTHENTICATION"
                    ? "pending"
                    : template.category === "UTILITY"
                      ? "success"
                      : "active"
                }
              >
                {template.category.toLowerCase()}
              </AdminBadge>
              {template.header === "IMAGE" ? (
                <AdminBadge tone="pending">image</AdminBadge>
              ) : null}
              <span className="ml-auto shrink-0 text-[11px] text-onwei-blue/50">
                {template.language}
              </span>
            </span>
            <span className="truncate text-xs text-onwei-blue/60">
              {template.bodyText}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function PreviewText({ text, values }: { text: string; values: string[] }) {
  const parts = text.split(/(\{\{\s*\d+\s*\}\})/g);
  return (
    <p className="whitespace-pre-wrap break-words text-[13px] leading-snug text-[#111b21]">
      {parts.map((part, i) => {
        const match = /^\{\{\s*(\d+)\s*\}\}$/.exec(part);
        if (!match) return <span key={i}>{part}</span>;
        const value = values[Number(match[1]) - 1];
        return (
          <mark
            key={i}
            className="rounded bg-onwei-green px-0.5 text-[#111b21]"
          >
            {value ?? part}
          </mark>
        );
      })}
    </p>
  );
}

/** The message as it shows on a phone, blanks highlighted with `values`. */
export function PhonePreview({
  template,
  values,
  imageUrl,
}: {
  template: TemplateLike | null;
  values: string[];
  imageUrl: string | null;
}) {
  return (
    <div className="mx-auto w-full max-w-[20rem] rounded-[2.5rem] border-[10px] border-onwei-black bg-onwei-black shadow-xl">
      <div className="overflow-hidden rounded-[1.8rem]">
        <div className="flex items-center gap-2 bg-[#075e54] px-4 py-3 text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-onwei-beige font-grotesk text-xs font-bold text-onwei-blue">
            ON
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Onwei</p>
            <p className="text-[11px] opacity-80">Business account</p>
          </div>
        </div>
        <div className="min-h-[26rem] bg-[#efe7dd] p-3">
          {template ? (
            <div className="max-w-[92%]">
              <div className="rounded-lg rounded-tl-none bg-white p-1.5 shadow-sm">
                {template.header === "IMAGE" ? (
                  imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt=""
                      className="mb-1.5 aspect-[1.91/1] w-full rounded-md object-cover"
                    />
                  ) : (
                    <div className="mb-1.5 flex aspect-[1.91/1] w-full items-center justify-center rounded-md bg-onwei-beige text-xs text-onwei-blue/60">
                      Image goes here
                    </div>
                  )
                ) : null}
                <div className="px-1.5 pb-1">
                  <PreviewText text={template.bodyText} values={values} />
                  {template.footer ? (
                    <p className="mt-1.5 text-[11px] text-[#667781]">
                      {template.footer}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-right text-[10px] text-[#667781]">
                    10:24
                  </p>
                </div>
              </div>
              {template.buttons.map((button, i) => (
                <div
                  key={i}
                  className="mt-1 rounded-lg bg-white py-2 text-center text-[13px] font-medium text-[#00a5f4] shadow-sm"
                >
                  {button.type === "URL" ? "↗ " : ""}
                  {button.text}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-24 text-center text-sm text-[#667781]">
              Pick a template to see the message here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
