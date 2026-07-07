import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapAnnouncement,
  mapCohort,
  mapLearner,
  mapReview,
  mapTask,
  summarizeDashboard
} from "@/features/mentor/mappers";
import type { MentorWorkspaceData } from "@/features/mentor/types";

export class SupabaseMentorRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly organizationId: string
  ) {}

  async getWorkspace(): Promise<MentorWorkspaceData> {
    const [cohorts, learners, tasks, reviews, announcements] = await Promise.all([
      this.getCohorts(),
      this.getLearners(),
      this.getTasks(),
      this.getReviews(),
      this.getAnnouncements()
    ]);
    return {
      announcements,
      cohorts,
      learners,
      reviews,
      summary: summarizeDashboard(cohorts),
      tasks
    };
  }

  async getCohorts() {
    const { data, error } = await this.client
      .from("mentor_dashboard_projections")
      .select("*")
      .eq("organization_id", this.organizationId)
      .order("last_activity_at", { ascending: false, nullsFirst: false });
    if (error) return [];
    return (data ?? []).map((row) => mapCohort(row as Record<string, unknown>));
  }

  async getLearners() {
    const { data, error } = await this.client
      .from("mentor_learner_activity_summaries")
      .select("*")
      .eq("organization_id", this.organizationId)
      .order("last_activity_at", { ascending: false, nullsFirst: false });
    if (error) return [];
    return (data ?? []).map((row) => mapLearner(row as Record<string, unknown>));
  }

  async getLearner(learnerId: string) {
    const learners = await this.getLearners();
    return learners.find((learner) => learner.learnerId === learnerId) ?? null;
  }

  async getCohort(cohortId: string) {
    const cohorts = await this.getCohorts();
    return cohorts.find((cohort) => cohort.cohortId === cohortId) ?? null;
  }

  async getTasks() {
    const { data, error } = await this.client
      .from("mentor_task_queue")
      .select("*")
      .eq("organization_id", this.organizationId)
      .order("follow_up_at", { ascending: true, nullsFirst: false });
    if (error) return [];
    return (data ?? []).map((row) => mapTask(row as Record<string, unknown>));
  }

  async getReviews() {
    const { data, error } = await this.client
      .from("mentor_review_queue")
      .select("*")
      .eq("organization_id", this.organizationId)
      .order("updated_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map((row) => mapReview(row as Record<string, unknown>));
  }

  async getAnnouncements() {
    const { data, error } = await this.client
      .from("announcements")
      .select("id,title,status,publish_at")
      .eq("organization_id", this.organizationId)
      .order("publish_at", { ascending: false })
      .limit(20);
    if (error) return [];
    return (data ?? []).map((row) => mapAnnouncement(row as Record<string, unknown>));
  }
}
