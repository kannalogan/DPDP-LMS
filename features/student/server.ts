import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { UnavailableStudentWorkspaceRepository } from "@/features/student/repositories/unavailable-student-repository";
import { listOrganizations } from "@/features/organizations/server";
import { getProfile } from "@/features/profile/server";
import { can } from "@/features/rbac/server";
import { resolveIdentityContext } from "@/features/session/server";
import type { StudentWorkspaceData } from "@/features/student/types";

const repository = new UnavailableStudentWorkspaceRepository();

export const getStudentWorkspace = cache(async (): Promise<StudentWorkspaceData | null> => {
  const identity = await resolveIdentityContext();
  if (!identity) return null;

  const [{ profile }, organizations, learningData] = await Promise.all([
    getProfile(identity.profileId),
    listOrganizations(),
    repository.getWorkspace(identity.profileId, identity.organizationId)
  ]);
  const organization = organizations.find((item) => item.id === identity.organizationId) ?? null;
  const permissionGranted = identity.organizationId
    ? await can(identity.organizationId, "platform.access")
    : false;

  return {
    ...learningData,
    permissionGranted,
    profile: {
      avatarUrl: null,
      badges: null,
      currentOrganization: organization?.name ?? null,
      currentOrganizationId: identity.organizationId,
      currentTrack: null,
      level: null,
      name: profile?.display_name ?? "Student",
      rank: null,
      xp: null
    }
  };
});

export async function requireStudentWorkspace() {
  const workspace = await getStudentWorkspace();
  if (!workspace) redirect("/auth/login?next=/student");
  return workspace;
}
