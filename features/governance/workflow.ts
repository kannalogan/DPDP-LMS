const transitions: Record<string, readonly string[]> = {
  draft: ["review", "archived"],
  review: ["approved", "rejected", "draft"],
  approved: ["published"],
  published: ["retired"],
  submitted: ["verification", "review"],
  verification: ["review", "rejected"],
  processing: ["completed"],
  open: ["accepted", "remediation", "resolved"],
  remediation: ["resolved"],
  resolved: ["closed"]
};
export function canTransitionGovernanceState(current: string, next: string) {
  return transitions[current]?.includes(next) ?? false;
}
