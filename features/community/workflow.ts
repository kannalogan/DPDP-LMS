const transitions: Record<string, readonly string[]> = {
  open: ["locked", "archived", "moderated"],
  locked: ["open", "archived"],
  scheduled: ["waiting", "live", "cancelled"],
  waiting: ["live", "cancelled"],
  live: ["ended"],
  available: ["full", "cancelled", "completed"],
  booked: ["rescheduled", "cancelled", "attended", "missed"]
};
export const canTransitionCommunication = (from: string, to: string) =>
  transitions[from]?.includes(to) ?? false;
export const meetingProviders = [
  "zoom",
  "google_meet",
  "microsoft_teams",
  "bigbluebutton"
] as const;
export const providerLabel = (provider: string) =>
  ({
    zoom: "Zoom",
    google_meet: "Google Meet",
    microsoft_teams: "Microsoft Teams",
    bigbluebutton: "BigBlueButton"
  })[provider] ?? "Unavailable provider";
