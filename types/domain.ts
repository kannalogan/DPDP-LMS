export type UserRole = "guest" | "student" | "mentor" | "instructor" | "admin" | "owner";

export type LearningDomain =
  | "dpdp"
  | "gdpr"
  | "hipaa"
  | "soc2"
  | "iso27001"
  | "nist"
  | "pci-dss"
  | "cybersecurity"
  | "ai"
  | "cloud"
  | "devops"
  | "custom";

export type CourseDifficulty = "introductory" | "intermediate" | "advanced" | "expert";

export interface TenantScopedEntity {
  id: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}
