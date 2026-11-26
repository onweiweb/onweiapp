// Browser-side image uploads for admin. Vercel refuses any request body over
// 4.5MB before our routes run, so photos are resized and re-encoded here
// first, then posted to the same routes as before (auth, checks and audit
// stay on the server). Used only from client components.

export interface ImagePreset {
  /** Longest side in pixels after shrinking. Smaller photos are not enlarged. */
  maxEdge: number;
  type: "image/webp" | "image/jpeg";
  quality: number;
  /** Types the route accepts as they are, so a small photo is sent untouched. */
  accepts: string[];
}

const WEB_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const IMAGE_PRESETS = {
  // Product photos and blog covers: big enough for zoom on sharp screens.
  catalog: {
    maxEdge: 2400,
    type: "image/webp",
    quality: 0.85,
    accepts: WEB_TYPES,
  },
  insiderUpdate: {
    maxEdge: 2000,
    type: "image/webp",
    quality: 0.85,
    accepts: WEB_TYPES,
  },
  // WhatsApp takes only JPEG or PNG in a template header.
  whatsapp: {
    maxEdge: 1600,
    type: "image/jpeg",
    quality: 0.85,
    accepts: ["image/jpeg", "image/png"],
  },
} satisfies Record<string, ImagePreset>;

/** Files at or under this size, within maxEdge and of an accepted type, are sent as they are. */
const LEAVE_ALONE_BYTES = 1.5 * 1024 * 1024;

/** Target size that fits inside maxEdge on the longest side, never larger than the original. */
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function renamed(name: string, type: ImagePreset["type"]): string {
  const base = name.replace(/\.[^.]*$/, "") || "image";
  return `${base}.${type === "image/jpeg" ? "jpg" : "webp"}`;
}

/**
 * Resizes and re-encodes a photo in the browser. Returns the original file
 * when it is already small enough, or when the browser can't read it (the
 * route then explains what it accepts).
 */
export async function shrinkImage(
  file: File,
  preset: ImagePreset,
): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    // Default orientation handling applies the phone's rotation tag.
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  try {
    const target = fitWithin(bitmap.width, bitmap.height, preset.maxEdge);
    const fits =
      target.width === bitmap.width && target.height === bitmap.height;
    if (
      fits &&
      file.size <= LEAVE_ALONE_BYTES &&
      preset.accepts.includes(file.type)
    ) {
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    if (preset.type === "image/jpeg") {
      // JPEG has no transparency: fill white so see-through areas don't turn black.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, target.width, target.height);
    }
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, target.width, target.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, preset.type, preset.quality),
    );
    // Some browsers can't write WebP and quietly hand back PNG: keep it only
    // if it is a type the route takes.
    if (!blob || !preset.accepts.includes(blob.type)) return file;
    if (fits && blob.size >= file.size && preset.accepts.includes(file.type)) {
      return file;
    }
    return new File([blob], renamed(file.name, preset.type), {
      type: blob.type,
    });
  } finally {
    bitmap.close();
  }
}

export type UploadResult =
  { ok: true; data: Record<string, unknown> } | { ok: false; error: string };

export const TOO_LARGE_MESSAGE =
  "That photo is still too large after shrinking. Try a smaller photo.";
export const UPLOAD_FAILED_MESSAGE =
  "The photo didn't upload. Check your connection and try again.";

/** Reads an upload route's reply, including Vercel's plain-text "too large" refusal. */
export async function readUploadResponse(
  response: Response | null,
): Promise<UploadResult> {
  if (!response) return { ok: false, error: UPLOAD_FAILED_MESSAGE };
  if (response.status === 413) return { ok: false, error: TOO_LARGE_MESSAGE };
  const data = (await response.json().catch(() => null)) as {
    ok?: boolean;
    error?: string;
  } | null;
  if (!data) return { ok: false, error: UPLOAD_FAILED_MESSAGE };
  if (!data.ok)
    return { ok: false, error: data.error ?? UPLOAD_FAILED_MESSAGE };
  return { ok: true, data: data as Record<string, unknown> };
}

/** Shrinks the photo, posts it as form field "file", and returns the route's JSON. */
export async function uploadImage(
  url: string,
  file: File,
  preset: ImagePreset,
): Promise<UploadResult> {
  const prepared = await shrinkImage(file, preset);
  const form = new FormData();
  form.set("file", prepared);
  const response = await fetch(url, { method: "POST", body: form }).catch(
    () => null,
  );
  return readUploadResponse(response);
}

/** Help text shown next to every photo upload. */
export const UPLOAD_HELP =
  "Any size photo is fine. Large photos are shrunk automatically before upload.";
