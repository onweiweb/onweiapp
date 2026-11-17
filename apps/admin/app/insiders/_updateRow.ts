import type { InsiderUpdateItem } from "@onwei/core";

/** Plain values the form edits. Dates as "YYYY-MM-DD". */
export interface UpdateRow {
  id: string;
  title: string;
  body: string;
  eventDate: string;
  imageUrl: string;
  linkUrl: string;
  linkLabel: string;
  isActive: boolean;
  sortOrder: number;
}

export function toUpdateRow(item: InsiderUpdateItem): UpdateRow {
  return {
    id: item.id,
    title: item.title,
    body: item.body,
    eventDate: item.eventDate
      ? new Date(item.eventDate).toISOString().slice(0, 10)
      : "",
    imageUrl: item.imageUrl ?? "",
    linkUrl: item.linkUrl ?? "",
    linkLabel: item.linkLabel ?? "",
    isActive: item.isActive,
    sortOrder: item.sortOrder,
  };
}
