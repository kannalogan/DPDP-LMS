import type { MentorLearnerSummary, MentorRiskLevel } from "@/features/mentor/types";

export function riskTone(level: MentorRiskLevel | number) {
  if (level === "critical" || level === "high" || Number(level) >= 3) return "danger" as const;
  if (level === "medium" || Number(level) === 2) return "warning" as const;
  return "success" as const;
}

export function learnerRiskLabel(learner: MentorLearnerSummary) {
  if (learner.activeRiskCount >= 3) return "High attention";
  if (learner.activeRiskCount > 0) return "Needs review";
  return "On track";
}

export function completionRate(learner: MentorLearnerSummary) {
  if (!learner.enrollmentCount) return 0;
  return Math.round((learner.completedEnrollments / learner.enrollmentCount) * 100);
}
