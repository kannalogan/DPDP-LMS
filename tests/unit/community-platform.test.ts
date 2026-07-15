import { describe, expect, it } from "vitest";
import {
  attendanceSchema,
  channelSchema,
  discussionSchema,
  liveSessionSchema,
  messageSchema,
  officeScheduleSchema,
  reportSchema,
  studyGroupSchema
} from "@/features/community/schemas";
import {
  canTransitionCommunication,
  meetingProviders,
  providerLabel
} from "@/features/community/workflow";
const uuid = "11111111-1111-4111-8111-111111111111";
describe("community workflows and validation", () => {
  it("validates bounded discussions", () => {
    expect(
      discussionSchema.safeParse({ body: "Useful answer", spaceId: uuid, title: "DPDP discussion" })
        .success
    ).toBe(true);
    expect(discussionSchema.safeParse({ body: "", spaceId: "bad", title: "x" }).success).toBe(
      false
    );
  });
  it("validates tenant channel membership input", () => {
    expect(
      channelSchema.safeParse({
        memberIds: [uuid],
        name: "Study room",
        organizationId: uuid,
        type: "group"
      }).success
    ).toBe(true);
    expect(
      channelSchema.safeParse({ memberIds: [], organizationId: uuid, type: "public" }).success
    ).toBe(false);
  });
  it("rejects empty messages and unsafe report reasons", () => {
    expect(messageSchema.safeParse({ body: "", channelId: uuid }).success).toBe(false);
    expect(reportSchema.safeParse({ postId: uuid, reason: "revenge" }).success).toBe(false);
  });
  it("validates chronological live sessions", () => {
    const base = {
      capacity: 20,
      description: "",
      organizationId: uuid,
      provider: "zoom",
      title: "Review",
      startsAt: "2026-07-15T10:00:00.000Z",
      endsAt: "2026-07-15T11:00:00.000Z"
    };
    expect(liveSessionSchema.safeParse(base).success).toBe(true);
    expect(
      liveSessionSchema.safeParse({ ...base, endsAt: "2026-07-15T09:00:00.000Z" }).success
    ).toBe(false);
  });
  it("validates attendance evidence", () => {
    expect(
      attendanceSchema.safeParse({
        joinedAt: "2026-07-15T10:00:00.000Z",
        profileId: uuid,
        sessionId: uuid,
        status: "present"
      }).success
    ).toBe(true);
    expect(
      attendanceSchema.safeParse({
        joinedAt: "bad",
        profileId: uuid,
        sessionId: uuid,
        status: "unknown"
      }).success
    ).toBe(false);
  });
  it("validates office and study-group limits", () => {
    expect(
      officeScheduleSchema.safeParse({
        capacity: 1,
        description: "",
        endsAt: "2026-07-15T11:00:00.000Z",
        organizationId: uuid,
        provider: "",
        startsAt: "2026-07-15T10:00:00.000Z",
        title: "Office hour"
      }).success
    ).toBe(true);
    expect(
      studyGroupSchema.safeParse({
        capacity: 1,
        description: "",
        name: "Group",
        organizationId: uuid,
        visibility: "organization"
      }).success
    ).toBe(false);
  });
  it("enforces lifecycle transitions", () => {
    expect(canTransitionCommunication("scheduled", "live")).toBe(true);
    expect(canTransitionCommunication("ended", "live")).toBe(false);
    expect(canTransitionCommunication("booked", "rescheduled")).toBe(true);
  });
  it("keeps provider abstraction deterministic", () => {
    expect(meetingProviders).toHaveLength(4);
    expect(providerLabel("microsoft_teams")).toBe("Microsoft Teams");
    expect(providerLabel("unknown")).toBe("Unavailable provider");
  });
});
