import type { NotificationChannel } from "@/features/notifications/types";
export type DeliveryAdapter = { channel: NotificationChannel; provider: string; available: false };
export const deliveryAdapters: DeliveryAdapter[] = [
  "email",
  "sms",
  "push",
  "teams",
  "slack",
  "webhook"
].map((channel) => ({
  channel: channel as NotificationChannel,
  provider: "unconfigured",
  available: false
}));
export function providerFoundationStatus(channel: NotificationChannel) {
  return channel === "in_app" ? "internal" : "provider_not_configured";
}
