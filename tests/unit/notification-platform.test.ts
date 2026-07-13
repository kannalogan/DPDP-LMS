import { describe, expect, it } from "vitest";
import { buildDigestPreview } from "@/features/notifications/digest-manager";
import { providerFoundationStatus } from "@/features/notifications/delivery-manager";
import { mapNotification, mapPreference } from "@/features/notifications/mappers";
import { preferenceAllows } from "@/features/notifications/preference-manager";
import {
  announcementSchema,
  notificationSchema,
  preferenceSchema
} from "@/features/notifications/schemas";
import {
  renderNotificationTemplate,
  templateVariables
} from "@/features/notifications/template-renderer";
import {
  canTransitionDelivery,
  isSupportedNotificationEvent
} from "@/features/notifications/workflow";

const item = mapNotification({
  notification_id: "n1",
  type: "learning",
  purpose: "assignment.deadline",
  priority: "high",
  title: "Assignment due",
  summary: "Submit by Friday",
  created_at: "2026-07-13T10:00:00Z",
  folder: "inbox",
  pinned: false,
  actions: [{ key: "open", label: "Open", path: "/student/assignments/a1" }]
});
describe("notification platform", () => {
  it("maps inbox rows without exposing raw rows", () => {
    expect(item).toMatchObject({ id: "n1", priority: "high", title: "Assignment due" });
    expect(item.actions[0]?.path).toBe("/student/assignments/a1");
  });
  it("maps preference defaults", () =>
    expect(mapPreference({ id: "p1", channel: "in_app", enabled: true })).toMatchObject({
      digestFrequency: "immediate",
      timezone: "Asia/Kolkata"
    }));
  it("validates notification, announcement and preference DTOs", () => {
    expect(
      notificationSchema.safeParse({
        organizationId: "11111111-1111-4111-8111-111111111111",
        profileId: "22222222-2222-4222-8222-222222222222",
        type: "learning",
        purpose: "course.published",
        title: "Course ready",
        summary: "A course is available",
        priority: "normal"
      }).success
    ).toBe(true);
    expect(
      announcementSchema.safeParse({
        organizationId: "11111111-1111-4111-8111-111111111111",
        title: "Maintenance",
        body: "Planned maintenance",
        priority: "high"
      }).success
    ).toBe(true);
    expect(
      preferenceSchema.safeParse({
        organizationId: "11111111-1111-4111-8111-111111111111",
        channel: "email",
        enabled: true,
        digestFrequency: "daily"
      }).success
    ).toBe(true);
  });
  it("renders explicit template variables", () => {
    expect(templateVariables("Hello {{name}}, {{course}} is ready")).toEqual(["name", "course"]);
    expect(renderNotificationTemplate("Hello {{ name }}", { name: "Asha" })).toBe("Hello Asha");
  });
  it("supports workflow transitions and frozen event sources", () => {
    expect(canTransitionDelivery("pending", "claimed")).toBe(true);
    expect(canTransitionDelivery("completed", "pending")).toBe(false);
    expect(isSupportedNotificationEvent("certificate.issued")).toBe(true);
  });
  it("builds unread digest previews", () => expect(buildDigestPreview([item])).toEqual([item]));
  it("honors disabled preferences and provider foundations", () => {
    const preference = mapPreference({ id: "p1", channel: "email", enabled: false });
    expect(preferenceAllows([preference], "email", "normal")).toBe(false);
    expect(providerFoundationStatus("email")).toBe("provider_not_configured");
    expect(providerFoundationStatus("in_app")).toBe("internal");
  });
});
