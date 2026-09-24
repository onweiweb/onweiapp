"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminButton,
  AdminSelect,
  AdminSlider,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from "./ui";

export interface ReviewPlacementRow {
  placementId: string;
  reviewId: string;
  rating: number;
  title: string | null;
  body: string;
  authorDisplay: string | null;
}

export interface ReviewCandidate {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  authorDisplay: string | null;
}

/**
 * Shared by the PDP's "Featured reviews" panel (surface PRODUCT_WALL, one
 * instance per product) and /reviews/placements (surfaces HOME_HERO/
 * HOME_WALL, site-wide) — same add/reorder/remove/limit shape, just scoped
 * differently. No drag-and-drop library exists in this app, so reordering
 * is up/down buttons that resubmit the full new order.
 */
export function ReviewPlacementManager({
  surface,
  productId = null,
  placements,
  candidates,
  limit,
}: {
  surface: "HOME_HERO" | "HOME_WALL" | "PRODUCT_WALL";
  productId?: string | null;
  placements: ReviewPlacementRow[];
  candidates: ReviewCandidate[];
  limit: number;
}) {
  const router = useRouter();
  const [selectedReviewId, setSelectedReviewId] = useState(
    candidates[0]?.id ?? "",
  );
  const [limitValue, setLimitValue] = useState(limit);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const approvedCount = placements.length + candidates.length;
  const sliderMax = Math.max(approvedCount, limit, 1);

  async function withSubmitting(action: () => Promise<void>) {
    setError(null);
    setSubmitting(true);
    try {
      await action();
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function addPlacement() {
    if (!selectedReviewId) return;
    await withSubmitting(async () => {
      const response = await fetch("/api/reviews/placements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surface,
          productId,
          reviewId: selectedReviewId,
        }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(data.error);
    });
  }

  async function removePlacement(placementId: string) {
    await withSubmitting(async () => {
      const response = await fetch(`/api/reviews/placements/${placementId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(data.error);
    });
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= placements.length) return;
    const reordered = [...placements];
    const temp = reordered[index]!;
    reordered[index] = reordered[target]!;
    reordered[target] = temp;

    await withSubmitting(async () => {
      const response = await fetch("/api/reviews/placements/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surface,
          productId,
          orderedPlacementIds: reordered.map((row) => row.placementId),
        }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(data.error);
    });
  }

  async function saveLimit() {
    await withSubmitting(async () => {
      const response = await fetch(`/api/reviews/surface-config/${surface}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: limitValue, productId }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(data.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {placements.length === 0 ? (
        <p className="text-sm text-onwei-blue/70">
          No reviews featured here yet — the storefront automatically shows the
          most recent approved reviews instead, up to the limit below.
        </p>
      ) : (
        <AdminTable>
          <AdminTableHead>
            <AdminTableHeaderCell>Order</AdminTableHeaderCell>
            <AdminTableHeaderCell>Review</AdminTableHeaderCell>
            <AdminTableHeaderCell>Rating</AdminTableHeaderCell>
            <AdminTableHeaderCell>Action</AdminTableHeaderCell>
          </AdminTableHead>
          <tbody>
            {placements.map((row, index) => (
              <AdminTableRow key={row.placementId}>
                <AdminTableCell>
                  <div className="flex items-center gap-1">
                    <AdminButton
                      type="button"
                      variant="secondary"
                      disabled={submitting || index === 0}
                      onClick={() => move(index, -1)}
                    >
                      ↑
                    </AdminButton>
                    <AdminButton
                      type="button"
                      variant="secondary"
                      disabled={submitting || index === placements.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      ↓
                    </AdminButton>
                  </div>
                </AdminTableCell>
                <AdminTableCell className="max-w-xs">
                  {row.title ? (
                    <p className="font-medium">{row.title}</p>
                  ) : null}
                  <p className="text-onwei-blue/70">{row.body}</p>
                </AdminTableCell>
                <AdminTableCell>{row.rating} / 5</AdminTableCell>
                <AdminTableCell>
                  <AdminButton
                    type="button"
                    variant="danger"
                    disabled={submitting}
                    onClick={() => removePlacement(row.placementId)}
                  >
                    Remove
                  </AdminButton>
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </tbody>
        </AdminTable>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs uppercase text-onwei-blue/70">
            Feature a review
          </label>
          <AdminSelect
            value={selectedReviewId}
            onChange={(event) => setSelectedReviewId(event.target.value)}
            disabled={candidates.length === 0}
          >
            {candidates.length === 0 ? (
              <option value="">No more approved reviews to add</option>
            ) : (
              candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {(candidate.title ?? candidate.body).slice(0, 60)}
                </option>
              ))
            )}
          </AdminSelect>
        </div>
        <AdminButton
          type="button"
          disabled={submitting || candidates.length === 0}
          onClick={addPlacement}
        >
          Add
        </AdminButton>
      </div>

      {surface === "HOME_HERO" ? null : (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-64 flex-col gap-1.5">
            <label className="text-xs uppercase text-onwei-blue/70">
              Max reviews shown here
            </label>
            <AdminSlider
              min={1}
              max={sliderMax}
              value={limitValue}
              onChange={setLimitValue}
              formatValue={(value) =>
                `${value} of ${approvedCount} approved review${approvedCount === 1 ? "" : "s"}`
              }
            />
          </div>
          <AdminButton
            type="button"
            variant="secondary"
            disabled={submitting}
            onClick={saveLimit}
          >
            Save limit
          </AdminButton>
        </div>
      )}

      {error ? <p className="text-xs text-onwei-black">{error}</p> : null}
    </div>
  );
}
