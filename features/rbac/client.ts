import type { PermissionKey } from "@/types/identity";

export function hasClientPermission(
  permissions: readonly PermissionKey[],
  required: PermissionKey
) {
  return permissions.includes(required);
}
