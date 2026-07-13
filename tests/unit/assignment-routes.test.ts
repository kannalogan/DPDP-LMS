import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const root = process.cwd();
const routes = [
  "app/(student)/student/assignments/page.tsx",
  "app/(student)/student/assignments/[assignmentId]/page.tsx",
  "app/(student)/student/assignments/[assignmentId]/submit/page.tsx",
  "app/(student)/student/assignments/[assignmentId]/history/page.tsx",
  "app/(student)/student/assignments/[assignmentId]/feedback/page.tsx",
  "app/(student)/student/gradebook/page.tsx",
  "app/(mentor)/mentor/assignments/page.tsx",
  "app/(mentor)/mentor/assignments/[assignmentId]/page.tsx",
  "app/(mentor)/mentor/grading/page.tsx",
  "app/(mentor)/mentor/grading/[submissionId]/page.tsx",
  "app/(mentor)/mentor/gradebook/page.tsx",
  "app/(mentor)/mentor/rubrics/page.tsx",
  "app/(mentor)/mentor/rubrics/new/page.tsx",
  "app/(mentor)/mentor/rubrics/[rubricId]/page.tsx",
  "app/(admin)/admin/assignments/page.tsx",
  "app/(admin)/admin/assignments/new/page.tsx",
  "app/(admin)/admin/assignments/[assignmentId]/page.tsx",
  "app/(admin)/admin/assignments/[assignmentId]/review/page.tsx",
  "app/(admin)/admin/assignments/[assignmentId]/versions/page.tsx",
  "app/(admin)/admin/rubrics/page.tsx",
  "app/(admin)/admin/rubrics/new/page.tsx",
  "app/(admin)/admin/rubrics/[rubricId]/page.tsx",
  "app/(admin)/admin/gradebook/page.tsx",
  "app/api/admin/assignments/route.ts",
  "app/api/mentor/grading/route.ts",
  "app/api/student/assignments/route.ts"
];
describe("assignment route and component coverage", () => {
  it("protects every assignment route", () => {
    for (const route of routes)
      expect(readFileSync(join(root, route), "utf8")).toContain("canAccessAssignments");
  });
  it("exposes required enterprise components", () => {
    const source = readFileSync(join(root, "features/assignments/components/index.tsx"), "utf8");
    for (const component of [
      "AssignmentDashboard",
      "AssignmentEditor",
      "AssignmentSubmissionForm",
      "SubmissionHistory",
      "GradingQueue",
      "RubricBuilder",
      "RubricScoringGrid",
      "FeedbackThread",
      "GradebookTable",
      "ConflictResolution",
      "AutosaveIndicator"
    ])
      expect(source).toContain("function " + component);
  });
  it("adds assignment navigation to all workspaces", () => {
    expect(readFileSync(join(root, "app-shell/student-application-shell.tsx"), "utf8")).toContain(
      "/student/assignments"
    );
    expect(readFileSync(join(root, "app/(mentor)/mentor/layout.tsx"), "utf8")).toContain(
      "/mentor/grading"
    );
    expect(readFileSync(join(root, "app/(admin)/admin/layout.tsx"), "utf8")).toContain(
      "/admin/assignments"
    );
  });
});
