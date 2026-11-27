"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { IMAGE_PRESETS, uploadImage } from "../_lib/imageUpload";
import { AdminButton, AdminInput, AdminTextarea, useToast } from "./ui";

/**
 * Buttons that wrap the selected text in the matching HTML, so staff don't
 * have to type tags by hand. Shared by the blog editor and the newsletter.
 */
export const HTML_TOOLS: { label: string; before: string; after: string }[] = [
  { label: "Heading", before: "<h2>", after: "</h2>" },
  { label: "Bold", before: "<strong>", after: "</strong>" },
  { label: "Italic", before: "<em>", after: "</em>" },
  { label: "Bullet list", before: "<ul>\n  <li>", after: "</li>\n</ul>" },
  { label: "Paragraph", before: "<p>", after: "</p>" },
];

export interface HtmlBodyFieldHandle {
  insert: (before: string, after?: string) => void;
}

/**
 * A plain HTML textarea with a formatting toolbar, a link box, an optional
 * image upload and a preview. The newsletter uses it; the blog editor shares
 * its toolbar list.
 */
export const HtmlBodyField = forwardRef<
  HtmlBodyFieldHandle,
  {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    /** Upload route for "Add image" (returns `{ url }`). Hidden when unset. */
    imageUploadUrl?: string;
    disabled?: boolean;
  }
>(function HtmlBodyField(
  { label, value, onChange, placeholder, imageUploadUrl, disabled },
  ref,
) {
  const toast = useToast();
  const area = useRef<HTMLTextAreaElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linkUrl, setLinkUrl] = useState("https://");
  const [uploading, setUploading] = useState(false);

  function insert(before: string, after = "") {
    const el = area.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    onChange(
      value.slice(0, start) +
        before +
        value.slice(start, end) +
        after +
        value.slice(end),
    );
  }
  useImperativeHandle(ref, () => ({ insert }));

  function addLink() {
    const url = linkUrl.trim();
    if (!/^https?:\/\/\S+\.\S+/.test(url)) {
      toast("Enter a full web address, starting with https://", "error");
      return;
    }
    insert(`<a href="${url.replace(/"/g, "%22")}">`, "</a>");
    setLinking(false);
    setLinkUrl("https://");
  }

  async function addImage(picked: File) {
    if (!imageUploadUrl) return;
    setUploading(true);
    const result = await uploadImage(
      imageUploadUrl,
      picked,
      IMAGE_PRESETS.catalog,
    );
    setUploading(false);
    if (file.current) file.current.value = "";
    const url = result.ok ? result.data.url : null;
    if (typeof url !== "string") {
      toast(
        result.ok ? "The photo didn't upload. Try again." : result.error,
        "error",
      );
      return;
    }
    insert(`<img src="${url}" alt="">\n`);
  }

  const small = "!px-3 !py-1 text-xs";
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-onwei-blue">{label}</span>
      <div className="flex flex-wrap gap-2">
        {HTML_TOOLS.map((tool) => (
          <AdminButton
            key={tool.label}
            type="button"
            variant="secondary"
            className={small}
            disabled={disabled}
            onClick={() => insert(tool.before, tool.after)}
          >
            {tool.label}
          </AdminButton>
        ))}
        <AdminButton
          type="button"
          variant="secondary"
          className={small}
          disabled={disabled}
          onClick={() => setLinking((v) => !v)}
        >
          Link
        </AdminButton>
        {imageUploadUrl ? (
          <AdminButton
            type="button"
            variant="secondary"
            className={small}
            disabled={disabled || uploading}
            onClick={() => file.current?.click()}
          >
            {uploading ? "Uploading..." : "Add image"}
          </AdminButton>
        ) : null}
        <AdminButton
          type="button"
          variant="secondary"
          className={small}
          onClick={() => setPreview((v) => !v)}
        >
          {preview ? "Hide preview" : "Preview"}
        </AdminButton>
      </div>
      {linking ? (
        <div className="flex flex-wrap items-center gap-2">
          <AdminInput
            aria-label="Link address"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="w-80"
          />
          <AdminButton type="button" className={small} onClick={addLink}>
            Add link to the selected text
          </AdminButton>
        </div>
      ) : null}
      {imageUploadUrl ? (
        <input
          ref={file}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            const picked = e.target.files?.[0];
            if (picked) void addImage(picked);
          }}
        />
      ) : null}
      <AdminTextarea
        ref={area}
        placeholder={placeholder}
        rows={14}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      {preview ? (
        <div
          className="flex flex-col gap-4 rounded-[20px] border border-onwei-blue/25 p-4 text-sm text-onwei-blue [&_a]:underline [&_h2]:text-xl [&_h2]:font-bold [&_img]:max-w-full [&_img]:rounded-xl [&_ul]:list-disc [&_ul]:pl-5"
          // Staff-authored; the newsletter is sanitized again when saved.
          dangerouslySetInnerHTML={{ __html: value }}
        />
      ) : null}
    </div>
  );
});
