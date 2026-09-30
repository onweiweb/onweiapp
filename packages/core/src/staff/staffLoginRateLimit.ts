import { createLazyLimiter } from "../rateLimit/lazyLimiter";

// Stricter per email than per IP: a real staff member mistypes a password a
// few times, a guessing attack hammers one account.
const emailLimiter = createLazyLimiter({
  limit: 5,
  window: "15 m",
  prefix: "staff-login:email",
  failClosedInProduction: true,
});
const ipLimiter = createLazyLimiter({
  limit: 20,
  window: "15 m",
  prefix: "staff-login:ip",
  failClosedInProduction: true,
});

/**
 * Checks the per-email and (when known) per-IP staff login attempt limit.
 * Call before looking up the account or verifying the password.
 */
export async function checkStaffLoginRateLimit(
  email: string,
  ip: string | null,
): Promise<{ allowed: boolean }> {
  if (!(await emailLimiter.check(email))) return { allowed: false };
  if (ip && !(await ipLimiter.check(ip))) return { allowed: false };
  return { allowed: true };
}

// Test-only: resets the cached limiters so tests can flip env vars between
// cases.
export function _resetStaffLoginRateLimiterForTests(): void {
  emailLimiter.reset();
  ipLimiter.reset();
}
