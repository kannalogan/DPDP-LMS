import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapAuthoringCourse,
  mapPublishingJob,
  mapResource,
  mapReview,
  summarizeAuthoring
} from "@/features/course-authoring/mappers";
import type { AuthoringWorkspace } from "@/features/course-authoring/types";

export class SupabaseAuthoringRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly organizationId: string
  ) {}

  async getWorkspace(): Promise<AuthoringWorkspace> {
    const [courses, reviews, resources, publishingQueue] = await Promise.all([
      this.getCourses(),
      this.getReviews(),
      this.getResources(),
      this.getPublishingQueue()
    ]);
    return {
      courses,
      metrics: summarizeAuthoring(courses),
      publishingQueue,
      resources,
      reviews
    };
  }

  async getCourses() {
    const { data, error } = await this.client
      .from("authoring_course_overview")
      .select("*")
      .eq("organization_id", this.organizationId)
      .order("updated_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map((row) => mapAuthoringCourse(row as Record<string, unknown>));
  }

  async getCourse(draftId: string) {
    const courses = await this.getCourses();
    return courses.find((course) => course.draftId === draftId) ?? null;
  }

  async getReviews() {
    const { data, error } = await this.client
      .from("course_reviews")
      .select("id,course_draft_id,status,decision_notes,opened_at")
      .eq("organization_id", this.organizationId)
      .order("opened_at", { ascending: false })
      .limit(30);
    if (error) return [];
    return (data ?? []).map((row) => mapReview(row as Record<string, unknown>));
  }

  async getResources() {
    const { data, error } = await this.client
      .from("resource_library")
      .select("id,title,kind,status,updated_at")
      .eq("organization_id", this.organizationId)
      .order("updated_at", { ascending: false })
      .limit(30);
    if (error) return [];
    return (data ?? []).map((row) => mapResource(row as Record<string, unknown>));
  }

  async getPublishingQueue() {
    const { data, error } = await this.client
      .from("authoring_publishing_queue")
      .select("*")
      .eq("organization_id", this.organizationId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) return [];
    return (data ?? []).map((row) => mapPublishingJob(row as Record<string, unknown>));
  }
}
