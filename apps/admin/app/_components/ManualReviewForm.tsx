"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReviewTarget } from "@onwei/database";
import { AdminButton, AdminInput, AdminSelect, AdminTextarea } from "./ui";

export function ManualReviewForm({
  products,
}: {
  products: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [targetType, setTargetType] = useState<ReviewTarget>("PRODUCT");
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [rating, setRating] = useState("5");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [authorDisplay, setAuthorDisplay] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim() || (targetType === "PRODUCT" && !productId)) {
      setError("Pick a product (if this is about one) and write the review.");
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          productId: targetType === "PRODUCT" ? productId : null,
          rating: Number(rating),
          title: title.trim() || null,
          body: body.trim(),
          authorDisplay: authorDisplay.trim() || null,
        }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
      router.push("/reviews");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        This review is about
        <AdminSelect
          value={targetType}
          onChange={(event) =>
            setTargetType(event.target.value as ReviewTarget)
          }
        >
          <option value="PRODUCT">A specific product</option>
          <option value="BRAND">Onwei in general</option>
        </AdminSelect>
      </label>
      {targetType === "PRODUCT" ? (
        <label className="flex flex-col gap-1 text-sm">
          Product
          <AdminSelect
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </AdminSelect>
        </label>
      ) : null}
      <label className="flex flex-col gap-1 text-sm">
        Rating
        <AdminSelect
          value={rating}
          onChange={(event) => setRating(event.target.value)}
        >
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>
              {value} star{value === 1 ? "" : "s"}
            </option>
          ))}
        </AdminSelect>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Title (optional)
        <AdminInput
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Review
        <AdminTextarea
          rows={4}
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Customer&apos;s name as it should appear (optional)
        <AdminInput
          value={authorDisplay}
          onChange={(event) => setAuthorDisplay(event.target.value)}
        />
      </label>
      {error ? <p className="text-sm text-onwei-black">{error}</p> : null}
      <AdminButton type="submit" disabled={submitting} className="self-start">
        {submitting ? "Saving…" : "Add review"}
      </AdminButton>
    </form>
  );
}
