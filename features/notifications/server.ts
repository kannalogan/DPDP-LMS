import "server-only";
import { cache } from "react";
import { resolveIdentityContext } from "@/features/session/server";
import { canManageNotifications, canReadNotifications } from "@/features/notifications/permissions";
import { createNotificationRepository } from "@/features/notifications/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const context = cache(resolveIdentityContext);
async function repository(admin = false) {
  const identity = await context();
  if (!identity?.organizationId) return null;
  const allowed = admin
    ? await canManageNotifications(identity.organizationId)
    : await canReadNotifications(identity.organizationId);
  return allowed
    ? createNotificationRepository(
        await createSupabaseServerClient(),
        identity.organizationId,
        identity.profileId
      )
    : null;
}
export async function canAccessNotifications(admin = false) {
  return Boolean(await repository(admin));
}
export async function getNotificationWorkspace(admin = false) {
  return (await repository(admin))?.getWorkspace(admin) ?? null;
}
export async function getNotification(id: string) {
  return (await repository())?.getNotification(id) ?? null;
}
export async function getNotificationInbox(folder: "inbox" | "archive" | "deleted" = "inbox") {
  return (await repository())?.getInbox(folder) ?? [];
}
export async function getNotificationOrganizationId(admin = false) {
  const identity = await context();
  if (!identity?.organizationId) return null;
  const allowed = admin
    ? await canManageNotifications(identity.organizationId)
    : await canReadNotifications(identity.organizationId);
  return allowed ? identity.organizationId : null;
}
