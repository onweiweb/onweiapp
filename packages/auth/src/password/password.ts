import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/**
 * One-way hash of a staff password for storage in StaffUser.passwordHash
 * (packages/database/prisma/schema.prisma). Isolated here, like
 * generateOtpCode/hashOtpCode, so swapping the hashing algorithm later
 * touches one file, not every call site.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/** Compares a plaintext password against a stored hash. */
export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
