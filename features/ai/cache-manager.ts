export function isAiCacheEntryUsable(status: string, expiresAt: string, now = new Date()) {
  return status === "valid" && new Date(expiresAt).getTime() > now.getTime();
}
