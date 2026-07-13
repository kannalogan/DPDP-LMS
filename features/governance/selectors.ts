import type { FindingDto, PrivacyRequestDto, RiskDto } from "@/features/governance/types";
export const criticalFindings = (items: FindingDto[]) =>
  items.filter(
    (item) => item.severity === "critical" && !["resolved", "closed"].includes(item.status)
  );
export const overduePrivacyRequests = (items: PrivacyRequestDto[]) =>
  items.filter((item) => item.overdue);
export const highRisks = (items: RiskDto[]) => items.filter((item) => item.riskScore >= 15);
export function riskTone(score: number): "success" | "warning" | "danger" | "neutral" {
  if (score >= 15) return "danger";
  if (score >= 8) return "warning";
  if (score > 0) return "success";
  return "neutral";
}
