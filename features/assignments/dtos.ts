import type {
  AssignmentSummary,
  GradebookEntry,
  GradingQueueItem,
  RubricSummary
} from "@/features/assignments/types";
export type AssignmentListDto = ReadonlyArray<AssignmentSummary>;
export type GradingQueueDto = ReadonlyArray<GradingQueueItem>;
export type RubricListDto = ReadonlyArray<RubricSummary>;
export type GradebookDto = ReadonlyArray<GradebookEntry>;
