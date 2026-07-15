const transitions: Record<string, readonly string[]> = {
  open: ["closed", "archived"],
  closed: ["archived", "open"],
  archived: ["open"]
};
export function canTransitionLearningSession(from: string, to: string) {
  return from === to || Boolean(transitions[from]?.includes(to));
}
export function nextPlanStepStatus(current: string, complete: boolean) {
  if (complete) return current === "skipped" ? "skipped" : "completed";
  return current === "pending" ? "in_progress" : current;
}
