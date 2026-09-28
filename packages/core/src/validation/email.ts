// Shared by the newsletter and waitlist signup paths — both apps/web API
// routes used to carry their own copy of this pattern (ground rule: no
// duplicated logic).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}
