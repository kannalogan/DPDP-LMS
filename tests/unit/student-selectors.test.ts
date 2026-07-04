import { describe, expect, it } from "vitest";
import {
  averageProgress,
  continueLearning,
  dueCourses,
  unreadNotificationCount
} from "@/features/student/selectors";
import type { StudentCourse, StudentWorkspaceData } from "@/features/student/types";

function course(overrides: Partial<StudentCourse>): StudentCourse {
  return {
    category: null,
    completedLessons: 0,
    courseId: "course-1",
    description: "Description",
    dueAt: null,
    estimatedMinutes: null,
    lastViewedAt: null,
    nextLessonId: null,
    nextLessonTitle: null,
    progress: 0,
    status: "not_started",
    title: "Course",
    totalLessons: 1,
    ...overrides
  };
}

describe("student workspace selectors", () => {
  it("orders in-progress courses by most recent activity", () => {
    const result = continueLearning([
      course({ courseId: "older", lastViewedAt: "2026-07-01", status: "in_progress" }),
      course({ courseId: "complete", status: "completed" }),
      course({ courseId: "newer", lastViewedAt: "2026-07-03", status: "in_progress" })
    ]);
    expect(result.map((item) => item.courseId)).toEqual(["newer", "older"]);
  });

  it("returns only future due courses in deadline order", () => {
    const result = dueCourses(
      [
        course({ courseId: "later", dueAt: "2026-07-10T00:00:00.000Z" }),
        course({ courseId: "past", dueAt: "2026-07-01T00:00:00.000Z" }),
        course({ courseId: "next", dueAt: "2026-07-05T00:00:00.000Z" })
      ],
      new Date("2026-07-04T00:00:00.000Z")
    );
    expect(result.map((item) => item.courseId)).toEqual(["next", "later"]);
  });

  it("calculates average progress without inventing an empty value", () => {
    expect(averageProgress([])).toBeNull();
    expect(averageProgress([course({ progress: 25 }), course({ progress: 75 })])).toBe(50);
  });

  it("counts unread notifications", () => {
    const data = {
      notifications: [{ readAt: null }, { readAt: "2026-07-04" }]
    } as StudentWorkspaceData;
    expect(unreadNotificationCount(data)).toBe(1);
  });
});
