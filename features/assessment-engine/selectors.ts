export function formatRemainingTime(remainingMs: number) {
  const seconds = Math.floor(Math.max(0, remainingMs) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
