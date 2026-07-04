import type { StudentWorkspaceRepository } from "@/features/student/types";

const reason =
  "Learning records are not available until the approved learning-domain database migration and RLS policies are implemented.";

export class UnavailableStudentWorkspaceRepository implements StudentWorkspaceRepository {
  async getWorkspace(profileId: string, organizationId: string | null) {
    void profileId;
    void organizationId;
    return {
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
      status: "unavailable" as const,
      unavailableReason: reason
    };
  }
}
