import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapAssignment,
  mapGradebookEntry,
  mapGradingQueueItem,
  mapRubric
} from "@/features/assignments/mappers";
import type { AssignmentRepository } from "@/features/assignments/types";
export class SupabaseAssignmentRepository implements AssignmentRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly organizationId: string,
    private readonly profileId: string
  ) {}
  async getWorkspace(mode: "student" | "mentor" | "admin") {
    const [assignments, gradingQueue, rubrics, gradebook] = await Promise.all([
      this.getAssignments(mode),
      mode === "student" ? Promise.resolve([]) : this.getGradingQueue(),
      mode === "student" ? Promise.resolve([]) : this.getRubrics(),
      this.getGradebook(mode)
    ]);
    return { assignments, gradingQueue, rubrics, gradebook };
  }
  async getAssignments(mode: "student" | "mentor" | "admin") {
    const query = this.client
      .from(mode === "student" ? "student_assignment_projection" : "assignment_catalog_projection")
      .select("*")
      .eq("organization_id", this.organizationId);
    if (mode === "student") query.eq("learner_profile_id", this.profileId);
    const { data, error } = await query.order(mode === "student" ? "due_at" : "published_at", {
      ascending: false
    });
    return error ? [] : (data ?? []).map((row) => mapAssignment(row as Record<string, unknown>));
  }
  async getAssignment(id: string) {
    const assignments = await this.getAssignments("student");
    const found = assignments.find(
      (item) => item.assignmentId === id || item.assignmentVersionId === id
    );
    if (found) return found;
    const admin = await this.getAssignments("admin");
    return (
      admin.find((item) => item.assignmentId === id || item.assignmentVersionId === id) ?? null
    );
  }
  async getGradingQueue() {
    const { data, error } = await this.client
      .from("grading_queue_projection")
      .select("*")
      .eq("organization_id", this.organizationId)
      .order("priority", { ascending: false });
    return error
      ? []
      : (data ?? []).map((row) => mapGradingQueueItem(row as Record<string, unknown>));
  }
  async getSubmission(id: string) {
    const items = await this.getGradingQueue();
    return items.find((item) => item.submissionVersionId === id || item.queueItemId === id) ?? null;
  }
  async getRubrics() {
    const { data, error } = await this.client
      .from("rubrics")
      .select("id,name,status,version,updated_at")
      .or("organization_id.is.null,organization_id.eq." + this.organizationId)
      .order("updated_at", { ascending: false });
    return error ? [] : (data ?? []).map((row) => mapRubric(row as Record<string, unknown>));
  }
  async getGradebook(mode: "student" | "mentor" | "admin") {
    const query = this.client
      .from("assignment_gradebook_projection")
      .select("*")
      .eq("organization_id", this.organizationId);
    if (mode === "student") query.eq("learner_profile_id", this.profileId).eq("released", true);
    const { data, error } = await query.order("released_at", { ascending: false });
    return error
      ? []
      : (data ?? []).map((row) => mapGradebookEntry(row as Record<string, unknown>));
  }
}
