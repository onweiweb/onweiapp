"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "./ui";

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
  const confirm = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) await uploadFile(file);
  }

  async function uploadFile(file: File) {
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
    const ok = await confirm({
      title: "Remove image?",
      message: "This image will be removed from the product.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    await fetch(`/api/products/${productId}/images/${imageId}`, {
      method: "DELETE",
    });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {images.length === 0 ? (
        <p className="text-sm text-onwei-blue/70">
          No photos yet. The first photo is the one shoppers see on the
          collection page.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {images.map((image, index) => (
            <div
              key={image.id}
              className="group relative aspect-square overflow-hidden rounded-[16px] border border-onwei-blue/10 bg-onwei-white"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded Blob URLs, next/image's domain allowlist isn't worth configuring for a simple thumbnail */}
              <img
                src={image.url}
                alt=""
                className="h-full w-full object-cover"
              />
              {index === 0 ? (
                <span className="absolute left-2 top-2 rounded-[30px] bg-onwei-green px-2 py-0.5 text-[0.6875rem] font-medium uppercase text-onwei-blue">
                  Main
                </span>
              ) : null}
              {image.isPlaceholder ? (
                <span className="absolute inset-x-0 bottom-0 bg-onwei-blue/70 px-1 py-1 text-center text-[0.6875rem] text-onwei-white">
                  Placeholder
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRemove(image.id)}
                  className="absolute right-2 top-2 rounded-[30px] bg-onwei-black px-2.5 py-0.5 text-[0.6875rem] uppercase text-onwei-white opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
                  aria-label="Remove image"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void uploadFile(file);
        }}
        className={`flex w-full max-w-xl cursor-pointer flex-col items-center justify-center gap-2 rounded-[20px] border-2 border-dashed px-4 py-8 text-center text-onwei-blue transition-colors ${
          dragging
            ? "border-onwei-purple bg-onwei-purple/10"
            : "border-onwei-blue/30 hover:border-onwei-purple"
        }`}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 16V4m0 0L7 9m5-5 5 5" />
          <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </svg>
        <span className="text-sm font-medium">
          {uploading ? "Uploading..." : "Click to upload or drag a photo here"}
        </span>
        <span className="text-xs text-onwei-blue/70">
          JPEG, PNG or WebP, up to 8MB
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleUpload}
          disabled={uploading}
          className="sr-only"
        />
      </label>
      {error ? <p className="text-sm text-onwei-black">{error}</p> : null}
    </div>
  );
}
