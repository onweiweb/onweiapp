import type { ConsentType, DsrStatus, DsrType } from "@onwei/database";

export const DSR_TYPE_LABELS: Record<DsrType, string> = {
  ACCESS: "Wants a copy of their data",
  ERASURE: "Wants their data deleted",
  CORRECTION: "Wants their data corrected",
};

export const DSR_STATUS_LABELS: Record<DsrStatus, string> = {
  RECEIVED: "Received",
  IN_PROGRESS: "In progress",
  FULFILLED: "Fulfilled",
  REJECTED: "Rejected",
};

export const CONSENT_TYPE_LABELS: Record<ConsentType, string> = {
  TERMS_OF_SERVICE: "Terms of service",
  PRIVACY_POLICY: "Privacy policy",
  MARKETING: "Marketing emails",
};
