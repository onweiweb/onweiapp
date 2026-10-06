export interface SubscribeToWaitlistInput {
  fullName: string;
  email: string;
  phone: string;
  // Optional "fridge run" -> "full marathon" engagement slider, 0-100.
  movementFlex?: number;
  source?: string;
  consentVersion: string;
  ipAddress?: string;
}

export type SubscribeToWaitlistFailureReason =
  | "INVALID_NAME"
  | "INVALID_EMAIL"
  | "INVALID_PHONE"
  | "DUPLICATE_EMAIL"
  | "DUPLICATE_PHONE";

export type SubscribeToWaitlistResult =
  | { ok: true; alreadyJoined: true }
  // Normalized values of the new row, so callers (welcome email) need no
  // second lookup.
  | { ok: true; alreadyJoined: false; fullName: string; email: string }
  | { ok: false; reason: SubscribeToWaitlistFailureReason };

export interface WaitlistEntrySummary {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  movementFlex: number | null;
  source: string | null;
  submittedAt: Date;
  unsubscribedAt: Date | null;
}

export interface ListWaitlistEntriesInput {
  /** 1-based page number. */
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface ListWaitlistEntriesResult {
  entries: WaitlistEntrySummary[];
  hasNext: boolean;
  /** Serial number of the first entry in `entries`. Counts down by one per row (newest = highest). */
  firstSerial: number;
  /** Everyone matching the search, across all pages. */
  total: number;
}

export interface WaitlistStats {
  total: number;
  active: number;
  unsubscribed: number;
  joinedLast7Days: number;
}
