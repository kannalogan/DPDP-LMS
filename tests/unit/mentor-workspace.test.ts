import { describe, expect, it } from "vitest";
import { mapCohort, mapLearner, summarizeDashboard } from "@/features/mentor/mappers";
import { completionRate, learnerRiskLabel, riskTone } from "@/features/mentor/selectors";
import { announcementSchema, interventionSchema } from "@/features/mentor/schemas";

describe("mentor workspace", () => {
  it("maps mentor-safe cohort projections", () => {
    const cohort = mapCohort({
      assigned_learners: 12,
      cohort_id: "cohort-id",
      cohort_name: "DPDP July",
      last_activity_at: "2026-07-07T00:00:00.000Z",
      learners_needing_attention: 2,
      open_tasks: 3,
      pending_reviews: 4
    });
    expect(cohort).toEqual({
      assignedLearners: 12,
      cohortId: "cohort-id",
      cohortName: "DPDP July",
      lastActivityAt: "2026-07-07T00:00:00.000Z",
      learnersNeedingAttention: 2,
      openTasks: 3,
      pendingReviews: 4
    });
  });

  it("summarizes dashboard counts without raw learner data", () => {
    const summary = summarizeDashboard([
      mapCohort({
        assigned_learners: 3,
        cohort_id: "one",
        learners_needing_attention: 1,
        open_tasks: 2,
        pending_reviews: 1
      }),
      mapCohort({
        assigned_learners: 5,
        cohort_id: "two",
        learners_needing_attention: 0,
        open_tasks: 1,
        pending_reviews: 2
      })
    ]);
    expect(summary).toEqual({
      activeCohorts: 2,
      assignedLearners: 8,
      learnersNeedingAttention: 1,
      openTasks: 3,
      pendingReviews: 3
    });
  });

  it("computes learner status selectors", () => {
    const learner = mapLearner({
      active_risk_count: 3,
      completed_enrollments: 2,
      enrollment_count: 4,
      learner_display_name: "Learner One",
      learner_profile_id: "learner-id"
    });
    expect(completionRate(learner)).toBe(50);
    expect(learnerRiskLabel(learner)).toBe("High attention");
    expect(riskTone(learner.activeRiskCount)).toBe("danger");
  });

  it("validates mentor commands", () => {
    expect(
      interventionSchema.safeParse({
        learnerId: "00000000-0000-4000-8000-000000000001",
        mentorAssignmentId: "00000000-0000-4000-8000-000000000002",
        reason: "Needs assessment follow-up",
        type: "assessment_review"
      }).success
    ).toBe(true);
    expect(
      announcementSchema.safeParse({
        body: "Complete the pending module review.",
        cohortId: "00000000-0000-4000-8000-000000000003",
        organizationId: "00000000-0000-4000-8000-000000000004",
        title: "Module review"
      }).success
    ).toBe(true);
  });
});
