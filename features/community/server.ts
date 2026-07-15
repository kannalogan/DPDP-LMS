import "server-only";
import { cache } from "react";
import {
  canAdminCommunity,
  canMentorCommunity,
  canReadCommunity
} from "@/features/community/permissions";
import { createCommunityRepository } from "@/features/community/service";
import { resolveIdentityContext } from "@/features/session/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CommunityAccess } from "@/features/community/types";

const context = cache(resolveIdentityContext);
async function repository(access: CommunityAccess) {
  const identity = await context();
  if (!identity?.organizationId) return null;
  const allowed =
    access === "admin"
      ? await canAdminCommunity(identity.organizationId)
      : access === "mentor"
        ? await canMentorCommunity(identity.organizationId)
        : await canReadCommunity(identity.organizationId);
  return allowed
    ? createCommunityRepository(
        await createSupabaseServerClient(),
        identity.organizationId,
        identity.profileId
      )
    : null;
}
export const canAccessCommunity = async (access: CommunityAccess) =>
  Boolean(await repository(access));
export const getCommunityWorkspace = async (access: CommunityAccess) =>
  (await repository(access))?.getWorkspace(access === "admin") ?? null;
export const getCommunityTopic = async (access: CommunityAccess, topicId: string) =>
  (await repository(access))?.getTopic(topicId) ?? null;
export const getCommunityMessages = async (access: CommunityAccess, channelId: string) =>
  (await repository(access))?.getMessages(channelId) ?? [];
export async function getCommunityOrganizationId(access: CommunityAccess) {
  const identity = await context();
  if (!identity?.organizationId || !(await repository(access))) return null;
  return identity.organizationId;
}
