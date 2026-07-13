export function isSha256(value: string) {
  return /^[a-f0-9]{64}$/.test(value);
}
export function isValidRetentionDuration(days: number) {
  return Number.isInteger(days) && days > 0;
}
export function isPrivacyRequestOpen(status: string) {
  return !["completed", "rejected", "closed"].includes(status);
}
