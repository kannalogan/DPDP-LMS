import { describe, expect, it } from "vitest";
import {
  mapAuthoringCourse,
  mapPublishingJob,
  mapResource,
  mapReview,
  summarizeAuthoring
} from "@/features/course-authoring/mappers";
import {
  courseDraftSchema,
  editorEventSchema,
  parseJsonObject,
  schedulePublicationSchema
} from "@/features/course-authoring/schemas";
import { authoringStateTone } from "@/features/course-authoring/selectors";
import {
  canTransition,
  nextWorkflowStates,
  validatePublishDependencies
} from "@/features/course-authoring/workflow";

const uuid = "00000000-0000-4000-8000-000000000001";

describe("course authoring", () => {
  it("maps projection rows into DTOs without exposing raw rows", () => {
    const course = mapAuthoringCourse({
      draft_id: "draft-id",
      lesson_count: 4,
      module_count: 2,
      open_reviews: 1,
      organization_id: "org-id",
      owner_profile_id: "profile-id",
      slug: "dpdp-basics",
      title: "DPDP Basics",
      track_id: "track-id",
      updated_at: "2026-07-07T00:00:00.000Z",
      visibility: "organization",
      workflow_state: "review"
    });
    expect(course).toMatchObject({
      draftId: "draft-id",
      lessonCount: 4,
      moduleCount: 2,
      title: "DPDP Basics",
      workflowState: "review"
    });
    expect(course).not.toHaveProperty("organization_id");
  });

  it("summarizes workflow metrics", () => {
    expect(
      summarizeAuthoring([
        mapAuthoringCourse({ draft_id: "1", owner_profile_id: "p", workflow_state: "draft" }),
        mapAuthoringCourse({ draft_id: "2", owner_profile_id: "p", workflow_state: "review" }),
        mapAuthoringCourse({ draft_id: "3", owner_profile_id: "p", workflow_state: "published" })
      ])
    ).toEqual({ approved: 0, draft: 1, published: 1, review: 1, scheduled: 0 });
  });

  it("maps resource, review, and publishing DTOs", () => {
    expect(
      mapResource({ id: "res", kind: "pdf", title: "Policy", status: "approved" })
    ).toMatchObject({
      kind: "pdf",
      resourceId: "res",
      title: "Policy"
    });
    expect(mapReview({ course_draft_id: "draft", id: "review", status: "open" })).toMatchObject({
      reviewId: "review",
      status: "open"
    });
    expect(
      mapPublishingJob({ draft_id: "draft", job_id: "job", job_type: "publication" })
    ).toMatchObject({
      draftId: "draft",
      jobId: "job"
    });
  });

  it("validates workflow transitions and publish dependencies", () => {
    expect(canTransition("draft", "review")).toBe(true);
    expect(canTransition("draft", "published")).toBe(false);
    expect(nextWorkflowStates("approved")).toEqual(["scheduled", "published"]);
    expect(
      validatePublishDependencies({ lessonCount: 0, moduleCount: 1, title: "Course" }).ready
    ).toBe(false);
    expect(
      validatePublishDependencies({ lessonCount: 1, moduleCount: 1, title: "Course" }).ready
    ).toBe(true);
  });

  it("validates DTO schemas and selectors", () => {
    expect(
      courseDraftSchema.safeParse({
        organizationId: uuid,
        slug: "dpdp-basics",
        title: "DPDP Basics",
        trackId: uuid
      }).success
    ).toBe(true);
    expect(
      schedulePublicationSchema.safeParse({
        draftId: uuid,
        scheduledAt: "2026-07-07T10:00:00.000Z"
      }).success
    ).toBe(true);
    expect(
      editorEventSchema.safeParse({ draftId: uuid, eventType: "editor.autosaved" }).success
    ).toBe(true);
    expect(parseJsonObject('{"mode":"markdown"}')).toEqual({ mode: "markdown" });
    expect(parseJsonObject("[]")).toEqual({});
    expect(authoringStateTone("published")).toBe("success");
  });
});
