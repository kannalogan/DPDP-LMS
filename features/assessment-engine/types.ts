export type AssessmentAvailability = "available" | "locked" | "expired" | "upcoming";
export type AttemptStatus =
  | "created"
  | "active"
  | "submitted"
  | "expired"
  | "evaluating"
  | "evaluated"
  | "voided";
export type QuestionType =
  | "single_choice"
  | "multiple_choice"
  | "true_false"
  | "short_text"
  | "long_text"
  | "numeric"
  | "matching"
  | "ordering"
  | "file_upload";

export interface AssessmentCatalogItem {
  assessmentId: string;
  assignmentId: string;
  availability: AssessmentAvailability;
  closesAt: string | null;
  courseTitle: string;
  durationSeconds: number | null;
  kind: string;
  opensAt: string | null;
  questionCount: number;
  title: string;
}

export interface AssessmentAttemptHistoryItem {
  attemptId: string;
  attemptNumber: number;
  passed: boolean | null;
  score: number | null;
  startedAt: string | null;
  status: AttemptStatus;
  submittedAt: string | null;
}

export interface AssessmentDetails extends AssessmentCatalogItem {
  attemptLimit: number;
  attempts: AssessmentAttemptHistoryItem[];
  cooldownSeconds: number;
  currentAttemptId: string | null;
  instructionsMarkdown: string;
  passingScore: number;
  rules: string[];
}

export interface AssessmentOption {
  content: string;
  optionId: string;
  stableKey: string;
}

export interface AssessmentQuestion {
  attemptItemId: string;
  maxScore: number;
  options: AssessmentOption[];
  points: number;
  position: number;
  prompt: string;
  questionVersionId: string;
  required: boolean;
  response: Record<string, unknown>;
  savedAt: string | null;
  type: QuestionType;
}

export interface CurrentAssessmentAttempt {
  assessmentId: string;
  attemptId: string;
  attemptNumber: number;
  expiresAt: string | null;
  questions: AssessmentQuestion[];
  startedAt: string;
  status: AttemptStatus;
  title: string;
}

export interface AssessmentResultSummary {
  attemptId: string;
  attemptNumber: number;
  feedbackAvailable: boolean;
  passed: boolean | null;
  score: number | null;
  status: "pending" | "released";
  submittedAt: string | null;
}
