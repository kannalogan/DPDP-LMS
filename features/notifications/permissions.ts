import "server-only";
import { can } from "@/features/rbac/server";
export async function canManageNotifications(organizationId: string) {
  return can(organizationId, "notification.manage");
}
export async function canManageNotificationTemplates(organizationId: string) {
  return can(organizationId, "notification.template.manage");
}
export async function canReadNotifications(organizationId: string) {
  return can(organizationId, "organization.read");
}
