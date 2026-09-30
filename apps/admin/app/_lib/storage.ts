import { put } from "@vercel/blob";

// Single entry point for file uploads. Routes call this instead of the
// storage vendor's SDK, so moving from Vercel Blob to S3 or R2 later means
// changing this file only. Stored URLs stay valid as long as the old files
// are copied over and the rows are rewritten (see docs/SCALABILITY_AND_HOSTING_NOTES.md).
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
