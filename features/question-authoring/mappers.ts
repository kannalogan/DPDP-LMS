import type {
  AssessmentTemplateItem,
  QuestionAuthoringItem,
  QuestionAuthoringMetrics,
  QuestionImportJob
} from "@/features/question-authoring/types";

const text = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);
const count = (value: unknown) => (typeof value === "number" ? value : Number(value ?? 0));

export function mapQuestion(row: Record<string, unknown>): QuestionAuthoringItem {
  return {
    bankName: text(row.bank_name, "Question bank"),
    bloomLevel: text(row.bloom_level, "understand"),
    difficulty: text(row.difficulty, "intermediate"),
    estimatedSeconds: count(row.estimated_seconds),
    locale: text(row.locale, "en"),
    openComments: count(row.open_comments),
    organizationId: text(row.organization_id) || null,
    outcomeCount: count(row.outcome_count),
    ownerProfileId: text(row.owner_profile_id),
    questionDraftId: text(row.question_draft_id),
    questionId: text(row.question_id) || null,
    type: text(row.type, "single_choice") as QuestionAuthoringItem["type"],
    updatedAt: text(row.updated_at),
    workflowState: text(row.workflow_state, "draft") as QuestionAuthoringItem["workflowState"]
  };
}

export function mapTemplate(row: Record<string, unknown>): AssessmentTemplateItem {
  return {
    assessmentId: text(row.assessment_id) || null,
    assessmentTemplateId: text(row.assessment_template_id),
    organizationId: text(row.organization_id) || null,
    ownerProfileId: text(row.owner_profile_id),
    questionCount: count(row.question_count),
    sectionCount: count(row.section_count),
    title: text(row.title, "Untitled assessment template"),
    updatedAt: text(row.updated_at),
    version: count(row.version),
    workflowState: text(row.workflow_state, "draft") as AssessmentTemplateItem["workflowState"]
  };
}

export function mapImportJob(row: Record<string, unknown>): QuestionImportJob {
  return {
    createdAt: text(row.created_at),
    importJobId: text(row.id),
    sourceType: text(row.source_type),
    status: text(row.status)
  };
}

export function summarizeQuestions(questions: QuestionAuthoringItem[]): QuestionAuthoringMetrics {
  return questions.reduce<QuestionAuthoringMetrics>(
    (metrics, item) => {
      if (item.workflowState in metrics)
        metrics[item.workflowState as keyof QuestionAuthoringMetrics]++;
      return metrics;
    },
    { approved: 0, draft: 0, published: 0, review: 0, scheduled: 0 }
  );
}
