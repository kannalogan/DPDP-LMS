import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/api/errors";
import type {
  AssessmentCatalogItem,
  AssessmentDetails,
  AssessmentQuestion,
  AssessmentResultSummary,
  CurrentAssessmentAttempt
} from "@/features/assessment-engine/types";

function fail(operation: string, error: { message: string } | null) {
  if (error)
    throw new AppError("INTERNAL_SERVER_ERROR", `Unable to ${operation}`, { cause: error.message });
}

function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function numberValue(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function markdown(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  return typeof record.markdown === "string"
    ? record.markdown
    : typeof record.content === "string"
      ? record.content
      : "";
}

export function availability(
  status: string,
  opensAt: string | null,
  closesAt: string | null,
  now = new Date()
): AssessmentCatalogItem["availability"] {
  if (status === "locked" || status === "withdrawn") return "locked";
  if (status === "expired" || (closesAt && new Date(closesAt) <= now)) return "expired";
  if (opensAt && new Date(opensAt) > now) return "upcoming";
  return "available";
}

type AssignmentRow = {
  assessment_version: {
    assessment: { id: string; kind: string; course: { versions: Array<{ title: string }> } };
    attempt_limit: number;
    cooldown_seconds: number;
    duration_seconds: number | null;
    id: string;
    instructions: unknown;
    passing_score: number | string;
    title: string;
  };
  closes_at: string | null;
  id: string;
  opens_at: string | null;
  status: string;
};

export class SupabaseAssessmentRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly profileId: string,
    private readonly organizationId: string
  ) {}

  private async assignmentRows(assessmentId?: string) {
    let query = this.client
      .from("assessment_assignments")
      .select(
        "id,status,opens_at,closes_at,assessment_version:assessment_versions!inner(id,title,instructions,passing_score,duration_seconds,attempt_limit,cooldown_seconds,assessment:assessments!inner(id,kind,course:courses!inner(versions:course_versions(title,status))))"
      )
      .eq("organization_id", this.organizationId)
      .is("archived_at", null)
      .eq("assessment_version.status", "published")
      .eq("assessment_version.assessment.course.versions.status", "published")
      .order("opens_at", { ascending: false, nullsFirst: true });
    if (assessmentId) query = query.eq("assessment_version.assessment.id", assessmentId).limit(1);
    const { data, error } = await query.limit(100);
    fail("load assigned assessments", error);
    return (data ?? []) as unknown as AssignmentRow[];
  }

  private async questionCounts(versionIds: string[]) {
    if (!versionIds.length) return new Map<string, number>();
    const { data, error } = await this.client
      .from("assessment_form_items")
      .select("assessment_version_id")
      .in("assessment_version_id", versionIds);
    fail("load assessment question counts", error);
    const counts = new Map<string, number>();
    for (const item of data ?? [])
      counts.set(
        item.assessment_version_id as string,
        (counts.get(item.assessment_version_id as string) ?? 0) + 1
      );
    return counts;
  }

  async getAssessmentCatalog(): Promise<AssessmentCatalogItem[]> {
    const rows = await this.assignmentRows();
    const counts = await this.questionCounts(rows.map((row) => row.assessment_version.id));
    return rows.map((row) => {
      const version = row.assessment_version;
      const courseVersion = version.assessment.course.versions[0];
      return {
        assessmentId: version.assessment.id,
        assignmentId: row.id,
        availability: availability(row.status, row.opens_at, row.closes_at),
        closesAt: row.closes_at,
        courseTitle: courseVersion?.title ?? "Assigned course",
        durationSeconds: version.duration_seconds,
        kind: version.assessment.kind,
        opensAt: row.opens_at,
        questionCount: counts.get(version.id) ?? 0,
        title: version.title
      };
    });
  }

  async getAssessmentDetails(assessmentId: string): Promise<AssessmentDetails | null> {
    const row = (await this.assignmentRows(assessmentId))[0];
    if (!row) return null;
    const version = row.assessment_version;
    const [{ count, error: countError }, history] = await Promise.all([
      this.client
        .from("assessment_form_items")
        .select("id", { count: "exact", head: true })
        .eq("assessment_version_id", version.id),
      this.getAttemptHistory(row.id)
    ]);
    fail("load assessment question count", countError);
    const instructions = version.instructions as Record<string, unknown>;
    return {
      assessmentId: version.assessment.id,
      assignmentId: row.id,
      availability: availability(row.status, row.opens_at, row.closes_at),
      closesAt: row.closes_at,
      courseTitle: version.assessment.course.versions[0]?.title ?? "Assigned course",
      durationSeconds: version.duration_seconds,
      kind: version.assessment.kind,
      opensAt: row.opens_at,
      questionCount: count ?? 0,
      title: version.title,
      attemptLimit: version.attempt_limit,
      attempts: history,
      cooldownSeconds: version.cooldown_seconds,
      currentAttemptId: history.find((item) => item.status === "active")?.attemptId ?? null,
      instructionsMarkdown: markdown(instructions),
      passingScore: Number(version.passing_score),
      rules: Array.isArray(instructions.rules)
        ? instructions.rules.filter((item): item is string => typeof item === "string")
        : []
    };
  }

  async getAttemptHistory(assignmentId: string) {
    const { data, error } = await this.client
      .from("assessment_attempts")
      .select("id,attempt_number,status,started_at,submitted_at,score,passed")
      .eq("assessment_assignment_id", assignmentId)
      .eq("profile_id", this.profileId)
      .eq("organization_id", this.organizationId)
      .order("attempt_number", { ascending: false })
      .limit(50);
    fail("load assessment attempt history", error);
    return (data ?? []).map((item) => ({
      attemptId: item.id as string,
      attemptNumber: item.attempt_number as number,
      passed: item.passed as boolean | null,
      score: numberValue(item.score),
      startedAt: item.started_at as string | null,
      status: item.status as AssessmentDetails["attempts"][number]["status"],
      submittedAt: item.submitted_at as string | null
    }));
  }

  async getCurrentAttempt(assessmentId: string): Promise<CurrentAssessmentAttempt | null> {
    const details = await this.getAssessmentDetails(assessmentId);
    if (!details?.currentAttemptId) return null;
    const { data: attempt, error } = await this.client
      .from("assessment_attempts")
      .select("id,attempt_number,status,started_at,expires_at")
      .eq("id", details.currentAttemptId)
      .eq("profile_id", this.profileId)
      .eq("organization_id", this.organizationId)
      .maybeSingle();
    fail("load current assessment attempt", error);
    if (!attempt?.started_at) return null;
    return {
      assessmentId,
      attemptId: attempt.id as string,
      attemptNumber: attempt.attempt_number as number,
      expiresAt: attempt.expires_at as string | null,
      questions: await this.getAssessmentQuestions(attempt.id as string),
      startedAt: attempt.started_at as string,
      status: attempt.status as CurrentAssessmentAttempt["status"],
      title: details.title
    };
  }

  async getAssessmentQuestions(attemptId: string): Promise<AssessmentQuestion[]> {
    const { data, error } = await this.client
      .from("attempt_items")
      .select(
        "id,position,points,option_order,question_version:question_versions!inner(id,prompt,max_score,question:questions!inner(type),options:question_options(id,stable_key,content)),response:attempt_responses(response,saved_at)"
      )
      .eq("attempt_id", attemptId)
      .order("position");
    fail("load assessment questions", error);
    return (data ?? []).flatMap((raw) => {
      const item = raw as unknown as {
        id: string;
        option_order: string[];
        points: number | string;
        position: number;
        question_version: {
          id: string;
          max_score: number | string;
          options: Array<{ content: unknown; id: string; stable_key: string }>;
          prompt: unknown;
          question: { type: AssessmentQuestion["type"] };
        };
        response:
          | Array<{ response: Record<string, unknown>; saved_at: string }>
          | { response: Record<string, unknown>; saved_at: string }
          | null;
      };
      const version = one(item.question_version);
      if (!version) return [];
      const response = one(item.response);
      const optionById = new Map(version.options.map((option) => [option.id, option]));
      const ordered = item.option_order
        .map((id) => optionById.get(id))
        .filter((option): option is NonNullable<typeof option> => Boolean(option));
      return [
        {
          attemptItemId: item.id,
          maxScore: Number(version.max_score),
          options: ordered.map((option) => ({
            content: markdown(option.content),
            optionId: option.id,
            stableKey: option.stable_key
          })),
          points: Number(item.points),
          position: item.position,
          prompt: markdown(version.prompt),
          questionVersionId: version.id,
          required: true,
          response: response?.response ?? {},
          savedAt: response?.saved_at ?? null,
          type: version.question.type
        }
      ];
    });
  }

  async saveLearnerAnswer(
    attemptId: string,
    attemptItemId: string,
    response: Record<string, unknown>,
    clientVersion: number
  ) {
    const { data, error } = await this.client.rpc("syra_save_assessment_response", {
      p_attempt_id: attemptId,
      p_attempt_item_id: attemptItemId,
      p_client_version: clientVersion,
      p_response: response
    });
    fail("save assessment response", error);
    return data as string;
  }

  async submitLearnerAttempt(attemptId: string) {
    const { data, error } = await this.client.rpc("syra_submit_assessment", {
      p_attempt_id: attemptId
    });
    fail("submit assessment attempt", error);
    return data as string;
  }

  async getAssessmentResultSummary(attemptId: string): Promise<AssessmentResultSummary | null> {
    const { data: attempt, error } = await this.client
      .from("assessment_attempts")
      .select("id,attempt_number,status,submitted_at,score,passed")
      .eq("id", attemptId)
      .eq("profile_id", this.profileId)
      .eq("organization_id", this.organizationId)
      .maybeSingle();
    fail("load assessment result", error);
    if (!attempt) return null;
    const { data: evaluation, error: evaluationError } = await this.client
      .from("evaluations")
      .select("status,released_at")
      .eq("attempt_id", attemptId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    fail("load assessment evaluation status", evaluationError);
    const released = evaluation?.status === "released" && Boolean(evaluation.released_at);
    return {
      attemptId: attempt.id as string,
      attemptNumber: attempt.attempt_number as number,
      feedbackAvailable: released,
      passed: released ? (attempt.passed as boolean | null) : null,
      score: released ? numberValue(attempt.score) : null,
      status: released ? "released" : "pending",
      submittedAt: attempt.submitted_at as string | null
    };
  }
}
