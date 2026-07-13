import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  mapEnrollmentCourse,
  SupabaseStudentWorkspaceRepository,
  type EnrollmentCourseRow
} from "@/features/student/repositories/supabase-student-repository";

const enrollment: EnrollmentCourseRow = {
  completed_at: null,
  course_version: {
    course: { category: { name: "Privacy" } },
    course_id: "course-id",
    description: "Learn the approved privacy foundations.",
    difficulty: "introductory",
    id: "version-id",
    modules: [{ id: "module-id", lessons: [{ id: "lesson-1" }, { id: "lesson-2" }] }],
    title: "Privacy Foundations"
  },
  course_version_id: "version-id",
  due_at: "2026-08-01T00:00:00.000Z",
  enrolled_at: "2026-07-06T00:00:00.000Z",
  id: "enrollment-id",
  status: "active"
};

describe("Supabase student repository mapping", () => {
  it("maps database projections to student DTOs without exposing raw rows", () => {
    expect(
      mapEnrollmentCourse(
        enrollment,
        { enrollment_id: "enrollment-id", progress: "42.50", status: "in_progress" },
        1
      )
    ).toEqual({
      category: "Privacy",
      completedLessons: 1,
      courseId: "course-id",
      description: "Learn the approved privacy foundations.",
      dueAt: "2026-08-01T00:00:00.000Z",
      estimatedMinutes: null,
      lastViewedAt: "2026-07-06T00:00:00.000Z",
      nextLessonId: null,
      nextLessonTitle: null,
      progress: 42.5,
      status: "in_progress",
      title: "Privacy Foundations",
      totalLessons: 2
    });
  });

  it("maps the canonical notification inbox into the frozen student DTO", async () => {
    const query = {
      eq() {
        return this;
      },
      limit() {
        return Promise.resolve({
          data: [
            {
              created_at: "2026-07-13T10:00:00.000Z",
              notification_id: "notification-id",
              purpose: "assignment.deadline",
              read_at: null,
              summary: "Submit by Friday",
              title: "Assignment due",
              type: "learning"
            }
          ],
          error: null
        });
      },
      order() {
        return this;
      },
      select() {
        return this;
      }
    };
    const repository = new SupabaseStudentWorkspaceRepository({
      from: () => query
    } as unknown as SupabaseClient);
    const result = await repository.getStudentNotificationsView("profile-id", "organization-id");
    expect(result.items).toEqual([
      {
        createdAt: "2026-07-13T10:00:00.000Z",
        notificationId: "notification-id",
        readAt: null,
        summary: "Submit by Friday",
        title: "Assignment due",
        type: "learning_reminder"
      }
    ]);
    expect(result.unavailableReason).toBe("");
  });
});
