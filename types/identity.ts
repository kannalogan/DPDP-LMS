export type ThemePreference = "system" | "light" | "dark";
export type MembershipStatus = "invited" | "active" | "suspended" | "ended";
export type PermissionKey =
  | "profile.read_self"
  | "profile.update_self"
  | "organization.read"
  | "organization.update"
  | "organization.invite"
  | "organization.member.read"
  | "organization.member.manage"
  | "authorization.role.read"
  | "authorization.role.manage"
  | "authorization.assignment.manage"
  | "course.authoring.manage"
  | "question.authoring.manage"
  | "assignment.authoring.manage"
  | "assignment.grade.manage"
  | "notification.manage"
  | "notification.template.manage"
  | "learning.catalog.manage"
  | "assessment.catalog.manage"
  | "certificate.template.manage"
  | "certificate.issue"
  | "mentor.workspace.manage"
  | "admin.workspace.manage"
  | "platform.access";

export interface ActionResult {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  message?: string;
  success: boolean;
}

export interface IdentityContext {
  organizationId: string | null;
  profileId: string;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  status: string;
}

export interface Profile {
  avatar_object_id: string | null;
  display_name: string;
  id: string;
  locale: string;
  status: string;
  timezone: string;
  version: number;
}
