import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CalendarWidget, LearningStats } from "@/features/student/components/student-cards";
import { StudentEmpty, StudentServiceNotice } from "@/features/student/components/workspace-ui";

describe("student workspace component smoke tests", () => {
  it("renders honest unknown metrics instead of zero values", () => {
    const markup = renderToStaticMarkup(
      <LearningStats activeCourses={0} completion={null} studyMinutes={null} />
    );
    expect(markup).toContain("Learning summary");
    expect(markup).toContain("Average progress");
    expect(markup).toContain("—");
  });

  it("announces learning service readiness", () => {
    const markup = renderToStaticMarkup(
      <StudentServiceNotice reason="Migration pending." status="unavailable" />
    );
    expect(markup).toContain('role="status"');
    expect(markup).toContain("Migration pending.");
  });

  it("renders specific empty-state language", () => {
    const markup = renderToStaticMarkup(
      <StudentEmpty description="Assigned courses appear here." title="No courses" />
    );
    expect(markup).toContain("No courses");
    expect(markup).toContain("Assigned courses appear here.");
  });

  it("renders the calendar as an accessible grid", () => {
    const markup = renderToStaticMarkup(
      <CalendarWidget dates={["2026-07-04T10:00:00.000Z"]} month={new Date(2026, 6, 1)} />
    );
    expect(markup).toContain('role="grid"');
    expect(markup).toContain("activity scheduled");
  });
});
