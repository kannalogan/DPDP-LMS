import { describe, expect, it } from "vitest";
import { UnavailableStudentWorkspaceRepository } from "@/features/student/repositories/unavailable-student-repository";

describe("student repository readiness adapter", () => {
  it("returns typed unavailable state without fabricated learning records", async () => {
    const repository = new UnavailableStudentWorkspaceRepository();
    const result = await repository.getWorkspace("profile-id", "organization-id");
    expect(result.status).toBe("unavailable");
    expect(result.unavailableReason).toContain("learning-domain database migration");
    expect(result.courses).toEqual([]);
    expect(result.notifications).toEqual([]);
    expect(result.progress.completion).toBeNull();
  });
});
