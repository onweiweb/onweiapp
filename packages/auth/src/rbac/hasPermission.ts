/**
 * Pure permission check: does `granted` include `required`? Deliberately has
 * no DB access — looking up a StaffUser's actual permissions stays in
 * packages/database per docs/ARCHITECTURE.md's module-boundary rule; this
 * just decides the yes/no once that list is in hand.
 */
export function hasPermission(
  granted: readonly string[],
  required: string,
): boolean {
  return granted.includes(required);
}

/** True only if every required permission is present. */
export function hasAllPermissions(
  granted: readonly string[],
  required: readonly string[],
): boolean {
  return required.every((permission) => granted.includes(permission));
}
