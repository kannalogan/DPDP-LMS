import "server-only";
import { can } from "@/features/rbac/server";
export const canReadCommunity = (organizationId: string) =>
  can(organizationId, "organization.read");
export const canMentorCommunity = (organizationId: string) =>
  can(organizationId, "mentor.workspace.manage");
export const canAdminCommunity = (organizationId: string) =>
  can(organizationId, "notification.manage");
