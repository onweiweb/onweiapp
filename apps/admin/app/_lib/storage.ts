import { put } from "@vercel/blob";

// Single entry point for file uploads. Routes call this instead of the
// storage vendor's SDK, so moving from Vercel Blob to S3 or R2 later means
// changing this file only. Stored URLs stay valid as long as the old files
// are copied over and the rows are rewritten (see docs/SCALABILITY_AND_HOSTING_NOTES.md).
/**
 * Largest upload the routes take. Vercel refuses request bodies over 4.5MB
 * before our code runs, so this stays under that with room for the form
 * wrapper. The browser shrinks photos first (app/_lib/imageUpload.ts).
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = "4MB";

/**
 * An upload's own file name is user input: keep only safe characters so it
 * can't add path segments or odd characters to the storage key.
 */
export function safeFileName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  return cleaned || "image";
}

export async function uploadPublicFile(
  key: string,
  file: File,
): Promise<{ url: string }> {
  const blob = await put(key, file, {
    access: "public",
    addRandomSuffix: false,
  });
  return { url: blob.url };
}
