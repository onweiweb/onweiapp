import { addProductImage } from "@onwei/core";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../../../_lib/requireStaffSession";

const MAX_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireStaffSession(request, "productImage:manage");
  if (!session.ok) return session.response;

  const { id } = await params;
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
      { ok: false, error: "That image is too large — the limit is 8MB." },
      { status: 400 },
    );
  }

  const blob = await put(
    `products/${id}/${crypto.randomUUID()}-${file.name}`,
    file,
    {
      access: "public",
      addRandomSuffix: false,
    },
  );

  const image = await addProductImage(
    { productId: id, url: blob.url, altText: null },
    { staffUserId: session.context.staffUserId },
  );

  return NextResponse.json({ ok: true, image }, { status: 201 });
}
