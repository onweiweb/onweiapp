"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface ProductImage {
  id: string;
  url: string;
  isPlaceholder: boolean;
}

export function ImageManager({
  productId,
  images,
}: {
  productId: string;
  images: ProductImage[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);

    const formData = new FormData();
    formData.set("file", file);

    try {
      const response = await fetch(`/api/products/${productId}/images`, {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
      } else {
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemove(imageId: string) {
    await fetch(`/api/products/${productId}/images/${imageId}`, {
      method: "DELETE",
    });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        {images.map((image) => (
          <div
            key={image.id}
            className="relative h-24 w-24 overflow-hidden rounded-md border border-neutral-200"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded Blob URLs, next/image's domain allowlist isn't worth configuring for a simple thumbnail */}
            <img
              src={image.url}
              alt=""
              className="h-full w-full object-cover"
            />
            {image.isPlaceholder ? (
              <span className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 text-center text-[10px] text-white">
                Placeholder
              </span>
            ) : (
              <button
                type="button"
                onClick={() => handleRemove(image.id)}
                className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-xs text-white"
                aria-label="Remove image"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      <label className="flex w-fit cursor-pointer items-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-sm">
        {uploading ? "Uploading…" : "Upload a photo"}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
