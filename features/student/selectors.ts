import type { StudentCourse, StudentWorkspaceData } from "@/features/student/types";

export function continueLearning(courses: StudentCourse[]) {
  return courses
    .filter((course) => course.status === "in_progress")
    .sort((left, right) => (right.lastViewedAt ?? "").localeCompare(left.lastViewedAt ?? ""));
}

export function dueCourses(courses: StudentCourse[], now: Date) {
  return courses
    .filter((course) => course.dueAt && new Date(course.dueAt).getTime() >= now.getTime())
    .sort((left, right) => (left.dueAt ?? "").localeCompare(right.dueAt ?? ""));
}

export function unreadNotificationCount(data: StudentWorkspaceData) {
  return data.notifications.filter((notification) => !notification.readAt).length;
}

export function averageProgress(courses: StudentCourse[]) {
  if (!courses.length) return null;
  return Math.round(courses.reduce((total, course) => total + course.progress, 0) / courses.length);
}
