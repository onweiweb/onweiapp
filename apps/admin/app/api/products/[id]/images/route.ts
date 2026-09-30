import { addProductImage } from "@onwei/core";
import { NextResponse } from "next/server";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";
import { uploadPublicFile } from "../../../../_lib/storage";
import { triggerCatalogRevalidate } from "../../../_lib/triggerCatalogRevalidate";

const MAX_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// The upload's own file name is user input: keep only safe characters so it
// can't add path segments or odd characters to the blob key.
function safeFileName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  return cleaned || "image";
}

// Multipart upload, so there is no JSON body for zod; the file is checked by
// hand below.
export const POST = defineAdminRoute<never, { id: string }>(
  { permission: "productImage:manage" },
  async ({ request, staff, params }) => {
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
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { ok: false, error: "That image is too large, the limit is 8MB." },
        { status: 400 },
      );
    }

    const blob = await uploadPublicFile(
      `products/${params.id}/${crypto.randomUUID()}-${safeFileName(file.name)}`,
      file,
    );

    const image = await addProductImage(
      { productId: params.id, url: blob.url, altText: null },
      { staffUserId: staff.staffUserId },
    );
    await triggerCatalogRevalidate();
    return NextResponse.json({ ok: true, image }, { status: 201 });
  },
);
