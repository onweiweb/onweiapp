import { NextResponse } from "next/server";
import {
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL,
  safeFileName,
  uploadPublicFile,
} from "../../_lib/storage";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Checks a multipart image upload (field "file": JPEG, PNG or WebP, 4MB) and
 * stores it under `folder`. Returns `{ ok, url }` or a plain error.
 */
export async function uploadImageFromForm(
  request: Request,
  folder: string,
): Promise<Response> {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "Choose an image file to upload." },
      { status: 400 },
    );
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { ok: false, error: "Please upload a JPEG, PNG, or WebP image." },
      { status: 400 },
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        ok: false,
        error: `That image is too large, the limit is ${MAX_UPLOAD_LABEL}.`,
      },
      { status: 400 },
    );
  }
  const blob = await uploadPublicFile(
    `${folder}/${crypto.randomUUID()}-${safeFileName(file.name)}`,
    file,
  );
  return NextResponse.json({ ok: true, url: blob.url }, { status: 201 });
}
