import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { SupabaseStudentWorkspaceRepository } from "@/features/student/repositories/supabase-student-repository";
import { listOrganizations } from "@/features/organizations/server";
import { getProfile } from "@/features/profile/server";
import { can } from "@/features/rbac/server";
import { resolveIdentityContext } from "@/features/session/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { StudentWorkspaceData } from "@/features/student/types";

const resolveStudentContext = cache(async () => {
  const identity = await resolveIdentityContext();
  if (!identity?.organizationId) return null;
  const permissionGranted = await can(identity.organizationId, "organization.read");
  return { ...identity, organizationId: identity.organizationId, permissionGranted };
});

async function repository() {
  return new SupabaseStudentWorkspaceRepository(await createSupabaseServerClient());
}

export async function getStudentCourses() {
  const context = await resolveStudentContext();
  if (!context?.permissionGranted) return [];
  return (await repository()).getStudentCourses(context.profileId, context.organizationId);
}

export async function getStudentProgress() {
  const context = await resolveStudentContext();
  if (!context?.permissionGranted) return null;
  return (await repository()).getStudentProgress(context.profileId, context.organizationId);
}

export async function getStudentTimeline() {
  const context = await resolveStudentContext();
  if (!context?.permissionGranted) return [];
  return (await repository()).getStudentTimeline(context.profileId, context.organizationId);
}

export async function getStudentGoals() {
  const context = await resolveStudentContext();
  if (!context?.permissionGranted) return [];
  return (await repository()).getStudentGoals(context.profileId, context.organizationId);
}

export async function getStudentBookmarks() {
  const context = await resolveStudentContext();
  if (!context?.permissionGranted) return [];
  return (await repository()).getStudentBookmarks(context.profileId, context.organizationId);
}

export async function getStudentNotificationsView() {
  const context = await resolveStudentContext();
  if (!context?.permissionGranted) {
    return { items: [], unavailableReason: "An active authorized organization is required." };
  }
  return (await repository()).getStudentNotificationsView(
    context.profileId,
    context.organizationId
  );
}

export async function searchStudentLearning(query: string) {
  const context = await resolveStudentContext();
  if (!context?.permissionGranted) return [];
  return (await repository()).searchStudentLearning(
    context.profileId,
    context.organizationId,
    query
  );
}

export const getStudentWorkspaceSummary = cache(async (): Promise<StudentWorkspaceData | null> => {
  const context = await resolveStudentContext();
  if (!context) return null;

  const [{ profile }, organizations, learningData] = await Promise.all([
    getProfile(context.profileId),
    listOrganizations(),
    context.permissionGranted
      ? (await repository()).getStudentWorkspaceSummary(context.profileId, context.organizationId)
      : Promise.resolve({
          achievements: [],
          activities: [],
          bookmarks: [],
          certificates: [],
          courses: [],
          downloads: [],
          goals: [],
          notifications: [],
          progress: {
            assessmentProgress: null,
            completion: null,
            monthlyActiveMinutes: null,
            skillProgress: [],
            studyMinutes: null,
            trackProgress: null,
            weeklyActiveMinutes: null
          },
          recommendations: [],
          status: "available" as const,
          unavailableReason: null
        })
  ]);
  const organization = organizations.find((item) => item.id === context.organizationId) ?? null;

  return {
    ...learningData,
    permissionGranted: context.permissionGranted,
    profile: {
      avatarUrl: null,
      badges: null,
      currentOrganization: organization?.name ?? null,
      currentOrganizationId: context.organizationId,
      currentTrack: null,
      level: null,
      name: profile?.display_name ?? "Student",
      rank: null,
      xp: null
    }
  };
});

export const getStudentWorkspace = getStudentWorkspaceSummary;

export async function requireStudentWorkspace() {
  const workspace = await getStudentWorkspace();
  if (!workspace) redirect("/auth/login?next=/student");
  return workspace;
}
