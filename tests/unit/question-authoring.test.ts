import { describe, expect, it } from "vitest";
import {
  mapImportJob,
  mapQuestion,
  mapTemplate,
  summarizeQuestions
} from "@/features/question-authoring/mappers";
import {
  authoringEventSchema,
  createQuestionSchema,
  parseJsonValue,
  templateSchema
} from "@/features/question-authoring/schemas";
import { questionStateTone } from "@/features/question-authoring/selectors";
import { validateQuestionImportRows } from "@/features/question-authoring/validation";
import {
  canTransitionQuestion,
  validateImportPayload,
  validateQuestionReady
} from "@/features/question-authoring/workflow";

const uuid = "00000000-0000-4000-8000-000000000001";

describe("question authoring", () => {
  it("maps question projection rows into DTOs", () => {
    const question = mapQuestion({
      bank_name: "DPDP bank",
      bloom_level: "apply",
      difficulty: "advanced",
      estimated_seconds: 90,
      open_comments: 2,
      organization_id: "org-id",
      outcome_count: 3,
      owner_profile_id: "profile-id",
      question_draft_id: "draft-id",
      type: "scenario",
      updated_at: "2026-07-13T00:00:00.000Z",
      workflow_state: "review"
    });
    expect(question).toMatchObject({
      bankName: "DPDP bank",
      questionDraftId: "draft-id",
      type: "scenario",
      workflowState: "review"
    });
    expect(question).not.toHaveProperty("question_draft_id");
  });

  it("maps templates and import jobs", () => {
    expect(
      mapTemplate({ assessment_template_id: "template", title: "Quiz", version: 2 })
    ).toMatchObject({
      assessmentTemplateId: "template",
      title: "Quiz",
      version: 2
    });
    expect(mapImportJob({ id: "job", source_type: "csv", status: "validated" })).toMatchObject({
      importJobId: "job",
      sourceType: "csv"
    });
  });

  it("summarizes workflow metrics", () => {
    const questions = [
      mapQuestion({ question_draft_id: "1", workflow_state: "draft" }),
      mapQuestion({ question_draft_id: "2", workflow_state: "review" }),
      mapQuestion({ question_draft_id: "3", workflow_state: "published" })
    ];
    expect(summarizeQuestions(questions)).toEqual({
      approved: 0,
      draft: 1,
      published: 1,
      review: 1,
      scheduled: 0
    });
  });

  it("validates workflow, import, and question types", () => {
    expect(canTransitionQuestion("draft", "review")).toBe(true);
    expect(canTransitionQuestion("draft", "published")).toBe(false);
    expect(validateQuestionReady({ promptText: "Explain consent", type: "essay" }).ready).toBe(
      true
    );
    expect(validateImportPayload({ rows: 2, sourceType: "csv" }).ready).toBe(true);
    expect(validateQuestionImportRows([{ type: "essay" }, { type: "unknown" }])).toMatchObject({
      invalid: 1,
      valid: 1
    });
  });

  it("validates DTO schemas and selectors", () => {
    expect(
      createQuestionSchema.safeParse({
        organizationId: uuid,
        questionBankId: uuid,
        type: "single_choice"
      }).success
    ).toBe(true);
    expect(templateSchema.safeParse({ organizationId: uuid, title: "Assessment" }).success).toBe(
      true
    );
    expect(
      authoringEventSchema.safeParse({
        eventType: "question.autosaved",
        organizationId: uuid,
        targetId: uuid,
        targetType: "question_draft"
      }).success
    ).toBe(true);
    expect(parseJsonValue('{"text":"Prompt"}')).toEqual({ text: "Prompt" });
    expect(questionStateTone("published")).toBe("success");
  });
});
