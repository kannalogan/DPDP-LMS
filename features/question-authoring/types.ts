export type QuestionWorkflowState =
  | "draft"
  | "review"
  | "approved"
  | "scheduled"
  | "published"
  | "archived"
  | "rejected";

export type QuestionType =
  | "single_choice"
  | "multiple_choice"
  | "true_false"
  | "fill_blank"
  | "matching"
  | "ordering"
  | "essay"
  | "file_upload"
  | "coding"
  | "scenario"
  | "case_study"
  | "practical_lab_reference";

export type QuestionAuthoringItem = {
  bankName: string;
  bloomLevel: string;
  difficulty: string;
  estimatedSeconds: number;
  locale: string;
  openComments: number;
  organizationId: string | null;
  outcomeCount: number;
  ownerProfileId: string;
  questionDraftId: string;
  questionId: string | null;
  type: QuestionType;
  updatedAt: string;
  workflowState: QuestionWorkflowState;
};

export type AssessmentTemplateItem = {
  assessmentId: string | null;
  assessmentTemplateId: string;
  organizationId: string | null;
  ownerProfileId: string;
  questionCount: number;
  sectionCount: number;
  title: string;
  updatedAt: string;
  version: number;
  workflowState: QuestionWorkflowState;
};

export type QuestionImportJob = {
  createdAt: string;
  importJobId: string;
  sourceType: string;
  status: string;
};

export type QuestionAuthoringMetrics = {
  approved: number;
  draft: number;
  published: number;
  review: number;
  scheduled: number;
};

export type QuestionAuthoringWorkspace = {
  importJobs: QuestionImportJob[];
  metrics: QuestionAuthoringMetrics;
  questions: QuestionAuthoringItem[];
  templates: AssessmentTemplateItem[];
};
