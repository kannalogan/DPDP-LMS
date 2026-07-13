import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapImportJob,
  mapQuestion,
  mapTemplate,
  summarizeQuestions
} from "@/features/question-authoring/mappers";
import type { QuestionAuthoringWorkspace } from "@/features/question-authoring/types";

export class SupabaseQuestionAuthoringRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly organizationId: string
  ) {}

  async getWorkspace(): Promise<QuestionAuthoringWorkspace> {
    const [questions, templates, importJobs] = await Promise.all([
      this.getQuestions(),
      this.getTemplates(),
      this.getImportJobs()
    ]);
    return { importJobs, metrics: summarizeQuestions(questions), questions, templates };
  }

  async getQuestions() {
    const { data, error } = await this.client
      .from("question_authoring_overview")
      .select("*")
      .eq("organization_id", this.organizationId)
      .order("updated_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map((row) => mapQuestion(row as Record<string, unknown>));
  }

  async getQuestion(questionDraftId: string) {
    const questions = await this.getQuestions();
    return questions.find((item) => item.questionDraftId === questionDraftId) ?? null;
  }

  async getTemplates() {
    const { data, error } = await this.client
      .from("assessment_template_authoring_overview")
      .select("*")
      .eq("organization_id", this.organizationId)
      .order("updated_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map((row) => mapTemplate(row as Record<string, unknown>));
  }

  async getImportJobs() {
    const { data, error } = await this.client
      .from("question_import_jobs")
      .select("id,source_type,status,created_at")
      .eq("organization_id", this.organizationId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) return [];
    return (data ?? []).map((row) => mapImportJob(row as Record<string, unknown>));
  }
}
