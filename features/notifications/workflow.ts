export const notificationEventSources = [
  "course.published",
  "lesson.published",
  "assignment.published",
  "assignment.deadline",
  "submission.late",
  "assessment.available",
  "assessment.reminder",
  "assessment.result_released",
  "certificate.issued",
  "certificate.revoked",
  "mentor.assigned",
  "review.assigned",
  "organization.invitation",
  "role.changed",
  "announcement.published",
  "authoring.workflow",
  "question.review",
  "report.completed",
  "admin.broadcast",
  "system.maintenance",
  "security.alert"
] as const;
export const deliveryTransitions: Record<string, readonly string[]> = {
  pending: ["claimed", "cancelled"],
  claimed: ["completed", "failed"],
  failed: ["pending", "cancelled"],
  completed: [],
  cancelled: []
};
export function canTransitionDelivery(from: string, to: string) {
  return deliveryTransitions[from]?.includes(to) ?? false;
}
export function isSupportedNotificationEvent(value: string) {
  return (notificationEventSources as readonly string[]).includes(value);
}
