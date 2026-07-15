import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiLearningWorkspaceDto } from "@/features/ai-learning/dtos";
import {
  mapAiFlashcard,
  mapAiFlashcardSet,
  mapAiLearningAnalytics,
  mapAiLearningDashboard,
  mapAiLearningMessage,
  mapAiLearningPlan,
  mapAiLearningPlanStep,
  mapAiLearningPreferences,
  mapAiLearningRecommendation,
  mapAiLearningSession,
  mapAiMentorStudentInsight,
  mapAiQuiz,
  mapAiQuizQuestion,
  type AiLearningDecrypt
} from "@/features/ai-learning/mappers";
import type { AiLearningAccess, AiLearningSourceType } from "@/features/ai-learning/types";

type Row = Record<string, unknown>;
export class SupabaseAiLearningRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly organizationId: string,
    private readonly profileId: string,
    private readonly decryptContent: AiLearningDecrypt
  ) {}
  async getDashboard() {
    const { data } = await this.client
      .from("student_ai_dashboard_projection")
      .select(
        "open_sessions,pinned_sessions,last_active_at,active_plans,cards_due,active_recommendations,active_goals"
      )
      .eq("organization_id", this.organizationId)
      .eq("profile_id", this.profileId)
      .maybeSingle();
    return mapAiLearningDashboard((data ?? undefined) as Row | undefined);
  }
  async getSessions(search = "") {
    let query = this.client
      .from("ai_learning_sessions")
      .select(
        "id,conversation_id,session_type,title_ciphertext,status,is_pinned,started_at,last_active_at,expires_at"
      )
      .eq("organization_id", this.organizationId)
      .eq("profile_id", this.profileId)
      .order("last_active_at", { ascending: false })
      .limit(100);
    if (search) query = query.eq("title_hash", search);
    const { data, error } = await query;
    if (error) return [];
    return Promise.all(
      (data ?? []).map((row) => mapAiLearningSession(row as Row, this.decryptContent))
    );
  }
  async getSession(sessionId: string) {
    const { data, error } = await this.client
      .from("ai_learning_sessions")
      .select(
        "id,conversation_id,session_type,title_ciphertext,status,is_pinned,started_at,last_active_at,expires_at"
      )
      .eq("organization_id", this.organizationId)
      .eq("profile_id", this.profileId)
      .eq("id", sessionId)
      .maybeSingle();
    return error || !data ? null : mapAiLearningSession(data as Row, this.decryptContent);
  }
  async getMessages(sessionId: string) {
    const session = await this.getSession(sessionId);
    if (!session) return [];
    const { data, error } = await this.client
      .from("ai_messages")
      .select("id,sequence_no,role,content_ciphertext,created_at")
      .eq("conversation_id", session.conversationId)
      .order("sequence_no")
      .limit(100);
    if (error) return [];
    return Promise.all(
      (data ?? []).map((row) => mapAiLearningMessage(row as Row, this.decryptContent))
    );
  }
  async getFlashcardSets() {
    const [{ data: sets, error }, { data: cards }] = await Promise.all([
      this.client
        .from("ai_flashcard_sets")
        .select("id,title_ciphertext,difficulty,status,created_at")
        .eq("organization_id", this.organizationId)
        .eq("profile_id", this.profileId)
        .order("created_at", { ascending: false }),
      this.client
        .from("ai_flashcards")
        .select("flashcard_set_id,learning_state,next_review_at")
        .eq("organization_id", this.organizationId)
        .eq("profile_id", this.profileId)
    ]);
    if (error) return [];
    const now = Date.now();
    return Promise.all(
      (sets ?? []).map((set) => {
        const related = (cards ?? []).filter((card) => card.flashcard_set_id === set.id);
        return mapAiFlashcardSet(
          set as Row,
          {
            cardCount: related.length,
            difficultCount: related.filter((card) => card.learning_state === "difficult").length,
            dueCount: related.filter(
              (card) => !card.next_review_at || new Date(card.next_review_at).getTime() <= now
            ).length,
            knownCount: related.filter((card) => card.learning_state === "known").length
          },
          this.decryptContent
        );
      })
    );
  }
  async getFlashcards(setId: string) {
    const { data, error } = await this.client
      .from("ai_flashcards")
      .select(
        "id,sequence_no,front_ciphertext,back_ciphertext,explanation_ciphertext,category,difficulty,learning_state,next_review_at"
      )
      .eq("organization_id", this.organizationId)
      .eq("profile_id", this.profileId)
      .eq("flashcard_set_id", setId)
      .order("sequence_no");
    if (error) return [];
    return Promise.all((data ?? []).map((row) => mapAiFlashcard(row as Row, this.decryptContent)));
  }
  async getQuizzes() {
    const [{ data: quizzes, error }, { data: attempts }] = await Promise.all([
      this.client
        .from("ai_quiz_generations")
        .select("id,title_ciphertext,difficulty,question_types,question_count,status,created_at")
        .eq("organization_id", this.organizationId)
        .eq("profile_id", this.profileId)
        .order("created_at", { ascending: false }),
      this.client
        .from("ai_quiz_attempts")
        .select("quiz_generation_id,score_percent")
        .eq("organization_id", this.organizationId)
        .eq("profile_id", this.profileId)
    ]);
    if (error) return [];
    return Promise.all(
      (quizzes ?? []).map((quiz) =>
        mapAiQuiz(
          quiz as Row,
          ((attempts ?? []).filter((attempt) => attempt.quiz_generation_id === quiz.id) ??
            []) as Row[],
          this.decryptContent
        )
      )
    );
  }
  async getQuizQuestions(quizId: string) {
    const { data, error } = await this.client
      .from("ai_quiz_questions")
      .select(
        "id,sequence_no,question_type,prompt_ciphertext,options_ciphertext,answer_ciphertext,explanation_ciphertext,difficulty"
      )
      .eq("organization_id", this.organizationId)
      .eq("profile_id", this.profileId)
      .eq("quiz_generation_id", quizId)
      .order("sequence_no");
    if (error) return [];
    return Promise.all(
      (data ?? []).map((row) => mapAiQuizQuestion(row as Row, this.decryptContent))
    );
  }
  async getPlans() {
    const [{ data: plans, error }, { data: steps }] = await Promise.all([
      this.client
        .from("ai_learning_plans")
        .select("id,plan_type,title_ciphertext,overview_ciphertext,status,starts_on,ends_on")
        .eq("organization_id", this.organizationId)
        .eq("profile_id", this.profileId)
        .order("created_at", { ascending: false }),
      this.client
        .from("ai_learning_plan_steps")
        .select(
          "id,learning_plan_id,sequence_no,title_ciphertext,description_ciphertext,scheduled_for,estimated_minutes,priority,status"
        )
        .eq("organization_id", this.organizationId)
        .eq("profile_id", this.profileId)
        .order("sequence_no")
    ]);
    if (error) return [];
    return Promise.all(
      (plans ?? []).map(async (plan) => {
        const mappedSteps = await Promise.all(
          (steps ?? [])
            .filter((step) => step.learning_plan_id === plan.id)
            .map((step) => mapAiLearningPlanStep(step as Row, this.decryptContent))
        );
        return mapAiLearningPlan(plan as Row, mappedSteps, this.decryptContent);
      })
    );
  }
  async getRecommendations() {
    const { data, error } = await this.client
      .from("ai_learning_recommendations")
      .select(
        "id,recommendation_type,target_type,target_id,title_ciphertext,reason_ciphertext,priority,confidence,status,created_at"
      )
      .eq("organization_id", this.organizationId)
      .eq("profile_id", this.profileId)
      .order("priority")
      .order("created_at", { ascending: false });
    if (error) return [];
    return Promise.all(
      (data ?? []).map((row) => mapAiLearningRecommendation(row as Row, this.decryptContent))
    );
  }
  async getPreferences() {
    const { data, error } = await this.client
      .from("ai_learning_preferences")
      .select(
        "learning_style,preferred_difficulty,session_minutes,explanation_depth,quiz_question_types,flashcard_batch_size,allow_learning_memory"
      )
      .eq("organization_id", this.organizationId)
      .eq("profile_id", this.profileId)
      .maybeSingle();
    return error || !data ? null : mapAiLearningPreferences(data as Row);
  }
  async getMentorInsights() {
    const { data, error } = await this.client
      .from("mentor_ai_student_projection")
      .select(
        "profile_id,session_count,last_active_at,open_weaknesses,highest_risk,active_recommendations"
      )
      .eq("organization_id", this.organizationId)
      .order("highest_risk", { ascending: false });
    return error ? [] : (data ?? []).map((row) => mapAiMentorStudentInsight(row as Row));
  }
  async getAnalytics() {
    const { data, error } = await this.client
      .from("reporting_ai_learning_projection")
      .select("activity_day,event_type,event_count,learner_count,session_count")
      .eq("organization_id", this.organizationId)
      .order("activity_day", { ascending: false })
      .limit(180);
    return error ? [] : (data ?? []).map((row) => mapAiLearningAnalytics(row as Row));
  }
  async getWorkspace(access: AiLearningAccess): Promise<AiLearningWorkspaceDto> {
    const [
      dashboard,
      sessions,
      flashcardSets,
      quizzes,
      plans,
      recommendations,
      preferences,
      mentorInsights,
      analytics
    ] = await Promise.all([
      access === "student" ? this.getDashboard() : Promise.resolve(mapAiLearningDashboard()),
      access === "student" ? this.getSessions() : Promise.resolve([]),
      access === "student" ? this.getFlashcardSets() : Promise.resolve([]),
      access === "student" ? this.getQuizzes() : Promise.resolve([]),
      access === "student" ? this.getPlans() : Promise.resolve([]),
      access === "student" ? this.getRecommendations() : Promise.resolve([]),
      access === "student" ? this.getPreferences() : Promise.resolve(null),
      access === "mentor" ? this.getMentorInsights() : Promise.resolve([]),
      access === "admin" ? this.getAnalytics() : Promise.resolve([])
    ]);
    return {
      analytics,
      dashboard,
      flashcardSets,
      mentorInsights,
      plans,
      preferences,
      quizzes,
      recommendations,
      sessions
    };
  }
  async resolveLearningSource(sourceType: AiLearningSourceType, sourceId: string) {
    if (sourceType === "lesson") {
      const { data } = await this.client
        .from("lesson_versions")
        .select("title,body,content_hash")
        .eq("lesson_id", sourceId)
        .in("status", ["published", "superseded"])
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data
        ? { content: JSON.stringify(data.body), hash: data.content_hash, title: data.title }
        : null;
    }
    if (sourceType === "module") {
      const { data } = await this.client
        .from("course_modules")
        .select("title,completion_rule")
        .eq("id", sourceId)
        .maybeSingle();
      return data
        ? { content: JSON.stringify(data.completion_rule), hash: null, title: data.title }
        : null;
    }
    if (sourceType === "course") {
      const { data } = await this.client
        .from("course_versions")
        .select("title,description,outcomes,content_hash")
        .eq("course_id", sourceId)
        .in("status", ["published", "superseded"])
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data
        ? {
            content: JSON.stringify({ description: data.description, outcomes: data.outcomes }),
            hash: data.content_hash,
            title: data.title
          }
        : null;
    }
    return null;
  }
  rpc(name: string, parameters: Record<string, unknown>) {
    return this.client.rpc(name, parameters);
  }
}
