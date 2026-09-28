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
  | { ok: true; alreadyJoined: boolean }
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
  cursor?: string;
  take?: number;
  search?: string;
}

export interface ListWaitlistEntriesResult {
  entries: WaitlistEntrySummary[];
  nextCursor: string | null;
}
