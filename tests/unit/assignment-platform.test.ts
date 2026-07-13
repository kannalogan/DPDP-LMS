import { describe, expect, it } from "vitest";
import {
  mapAssignment,
  mapGradebookEntry,
  mapGradingQueueItem
} from "@/features/assignments/mappers";
import {
  assignmentTypeSchema,
  rubricDraftSchema,
  saveAssignmentDraftSchema
} from "@/features/assignments/schemas";
import { calculateRubricScore, gradeIsReleasable } from "@/features/assignments/grading";
import { rubricLevelRangeIsValid, rubricWeightsAreValid } from "@/features/assignments/rubrics";
import { assignmentObjectPath, validateAssignmentFile } from "@/features/assignments/storage";
import { canTransitionAssignment } from "@/features/assignments/workflow";
describe("assignment platform domain", () => {
  it("supports approved assignment types", () =>
    expect(assignmentTypeSchema.safeParse("portfolio_submission").success).toBe(true));
  it("validates assignment scoring constraints", () =>
    expect(
      saveAssignmentDraftSchema.safeParse({
        assignmentId: "11111111-1111-4111-8111-111111111111",
        title: "Evidence",
        submissionType: "file_upload",
        totalMarks: 50,
        passingScore: 60
      }).success
    ).toBe(false));
  it("requires rubric weights to total 100", () => {
    expect(rubricWeightsAreValid([{ weight: 60 }, { weight: 40 }])).toBe(true);
    expect(
      rubricDraftSchema.safeParse({
        rubricId: "11111111-1111-4111-8111-111111111111",
        maxScore: 10,
        criteria: [{ name: "Quality", weight: 80, levels: [{}] }]
      }).success
    ).toBe(false);
  });
  it("validates rubric score ranges", () =>
    expect(
      rubricLevelRangeIsValid([
        { min: 0, max: 2 },
        { min: 3, max: 5 }
      ])
    ).toBe(true));
  it("calculates weighted rubric scores", () =>
    expect(
      calculateRubricScore([
        { score: 80, weight: 60 },
        { score: 100, weight: 40 }
      ])
    ).toBe(88));
  it("permits only controlled workflow transitions", () => {
    expect(canTransitionAssignment("submitted", "under_review")).toBe(true);
    expect(canTransitionAssignment("finalized", "draft")).toBe(false);
  });
  it("requires finalized grades before release", () =>
    expect(gradeIsReleasable("finalized", 80)).toBe(true));
  it("validates private file metadata", () => {
    expect(
      validateAssignmentFile(
        { name: "evidence.pdf", size: 1000, type: "application/pdf" },
        { maxBytes: 2000, acceptedExtensions: [".pdf"] }
      ).valid
    ).toBe(true);
    expect(
      validateAssignmentFile(
        { name: "run.exe", size: 100, type: "application/octet-stream" },
        { maxBytes: 2000, acceptedExtensions: [] }
      ).valid
    ).toBe(false);
  });
  it("builds tenant and owner scoped object paths", () =>
    expect(assignmentObjectPath("org", "learner", "file")).toBe("org/learner/file"));
  it("maps assignment, queue and gradebook DTOs", () => {
    expect(
      mapAssignment({
        assignment_id: "a",
        assignment_version_id: "v",
        title: "Case",
        total_marks: "100"
      }).title
    ).toBe("Case");
    expect(mapGradingQueueItem({ grading_queue_item_id: "q", priority: "2" }).priority).toBe(2);
    expect(mapGradebookEntry({ gradebook_entry_id: "g", released: true }).released).toBe(true);
  });
});
